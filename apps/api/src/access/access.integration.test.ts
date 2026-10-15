import { beforeAll, afterAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { buildApp } from '../app';
import { authSessionSchema, emptyWorkspace } from '@buildos/shared';
import { transaction } from './repository';
import { token, digest, csrf } from './security';
const url = process.env.TEST_DATABASE_URL;
const schema = `qa_${randomUUID().replaceAll('-', '')}`;
const ownerPool = url ? new Pool({ connectionString: url }) : null;
let pool: Pool;
let app: Awaited<ReturnType<typeof buildApp>>;
const origin = 'http://127.0.0.1:5173';
const suite = it.skipIf(!url);
let owner: { cookie: string; csrf: string; id: string; companyId: string };
let employee: { cookie: string; csrf: string; id: string; companyId: string };
let storedFileId = '';
const credentials = {
  email: 'owner@example.test',
  password: 'Only a synthetic QA passphrase 2026!',
};
beforeAll(async () => {
  if (!ownerPool) return;
  await ownerPool.query(`CREATE SCHEMA ${schema}`);
  pool = new Pool({
    connectionString: url,
    options: `-c search_path=${schema}`,
  });
  for (const directory of readdirSync(resolve('apps/api/prisma/migrations'))
    .filter((name) => /^\d/.test(name))
    .sort())
    await pool.query(
      readFileSync(
        resolve('apps/api/prisma/migrations', directory, 'migration.sql'),
        'utf8',
      ),
    );
  app = await buildApp({ database: pool, origin, ready: async () => true });
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/setup',
    headers: { origin },
    payload: { ...credentials, name: 'QA Owner', company: 'QA Company' },
  });
  expect(response.statusCode).toBe(200);
  const session = authSessionSchema.parse(response.json());
  owner = {
    cookie: `buildos_session=${response.cookies[0]!.value}`,
    csrf: session.csrfToken,
    id: session.user.id,
    companyId: session.user.companyId,
  };
  expect(response.cookies[0]?.httpOnly).toBe(true);
}, 30000);
afterAll(async () => {
  if (!ownerPool) return;
  await app?.close();
  await pool?.end();
  if (/^qa_[a-f0-9]{32}$/.test(schema))
    await ownerPool.query(`DROP SCHEMA ${schema} CASCADE`);
  await ownerPool.end();
});
suite(
  'requires server authentication and CSRF for all private operations',
  async () => {
    expect((await app.inject('/api/v1/workspace')).statusCode).toBe(401);
    expect((await app.inject('/api/v1/team')).statusCode).toBe(401);
    expect((await app.inject('/api/v1/files/unknown')).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/v1/workspace',
          headers: { cookie: owner.cookie, origin, 'if-match': '"0"' },
          payload: emptyWorkspace(),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          headers: { origin: 'https://untrusted.example' },
          payload: credentials,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/setup',
          headers: { origin },
          payload: { ...credentials, name: 'Other', company: 'Other' },
        })
      ).statusCode,
    ).toBe(409);
  },
);
suite(
  'creates single-use invitations; only registered employees receive access',
  async () => {
    const invitation = await app.inject({
      method: 'POST',
      url: '/api/v1/team/invitations',
      headers: { cookie: owner.cookie, origin, 'x-csrf-token': owner.csrf },
      payload: {
        name: 'QA Employee',
        email: 'employee@example.test',
        position: 'Engineer',
      },
    });
    expect(invitation.statusCode).toBe(200);
    const token = String(invitation.json().token);
    const accept = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/accept',
      headers: { origin },
      payload: { token, name: 'QA Employee', password: credentials.password },
    });
    expect(accept.statusCode).toBe(200);
    const session = authSessionSchema.parse(accept.json());
    employee = {
      cookie: `buildos_session=${accept.cookies[0]!.value}`,
      csrf: session.csrfToken,
      id: session.user.id,
      companyId: session.user.companyId,
    };
    expect(
      (
        await app.inject({
          url: '/api/v1/workspace',
          headers: { cookie: employee.cookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/accept',
          headers: { origin },
          payload: {
            token,
            name: 'QA Employee',
            password: credentials.password,
          },
        })
      ).statusCode,
    ).toBe(410);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/team/invitations',
          headers: {
            cookie: employee.cookie,
            origin,
            'x-csrf-token': employee.csrf,
          },
          payload: { name: 'Other', email: 'other@example.test' },
        })
      ).statusCode,
    ).toBe(403);
    const hashes = await pool.query('SELECT "passwordHash" FROM "AppUser"');
    expect(
      hashes.rows.every((row) =>
        String(row.passwordHash).startsWith('$argon2id$'),
      ),
    ).toBe(true);
  },
);
suite('persists records and rejects stale workspace writes', async () => {
  const data = emptyWorkspace();
  data.projects.push({
    id: 'qa-project',
    name: 'QA Project',
    customer: 'QA',
    city: '',
    budget: 100,
    start: '2026-10-01',
    end: '2027-10-01',
    status: 'ACTIVE',
  });
  const headers = {
    cookie: owner.cookie,
    origin,
    'x-csrf-token': owner.csrf,
    'if-match': '"0"',
  };
  expect(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/v1/workspace',
        headers,
        payload: data,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/v1/workspace',
        headers,
        payload: emptyWorkspace(),
      })
    ).statusCode,
  ).toBe(409);
  const result = await app.inject({
    url: '/api/v1/workspace',
    headers: { cookie: employee.cookie },
  });
  expect(result.json().data.projects[0].name).toBe('QA Project');
  expect((await pool.query('SELECT * FROM "CompanyWorkspace"')).rowCount).toBe(
    0,
  );
});
suite(
  'validates files and blocks unauthenticated or foreign downloads',
  async () => {
    const boundary = 'buildos-qa-boundary';
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa.txt"\r\nContent-Type: text/plain\r\n\r\nSynthetic QA text\r\n--${boundary}--\r\n`,
    );
    const uploaded = await app.inject({
      method: 'POST',
      url: '/api/v1/files?projectId=qa-project',
      headers: {
        cookie: owner.cookie,
        origin,
        'x-csrf-token': owner.csrf,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(uploaded.statusCode).toBe(200);
    const metadata = uploaded.json();
    storedFileId = String(metadata.id);
    const current = (
      await app.inject({
        url: '/api/v1/workspace',
        headers: { cookie: owner.cookie },
      })
    ).json();
    current.data.documents.push(metadata);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/v1/workspace',
          headers: {
            cookie: owner.cookie,
            origin,
            'x-csrf-token': owner.csrf,
            'if-match': `"${current.version}"`,
          },
          payload: current.data,
        })
      ).statusCode,
    ).toBe(200);
    const file = await app.inject({
      url: `/api/v1/files/${metadata.id}`,
      headers: { cookie: employee.cookie },
    });
    expect(file.body).toBe('Synthetic QA text');
    expect(file.headers['cache-control']).toBe('no-store');
    expect((await app.inject(`/api/v1/files/${metadata.id}`)).statusCode).toBe(
      401,
    );
  },
);
suite(
  'enforces company isolation for workspace, files and membership actions',
  async () => {
    const companyId = randomUUID();
    const userId = randomUUID();
    const value = token();
    await transaction(pool, companyId, async (client) => {
      await client.query('INSERT INTO "Company"(id,name) VALUES($1,$2)', [
        companyId,
        'Other QA company',
      ]);
      await client.query(
        'INSERT INTO "AppUser"(id,"companyId",name,email,"passwordHash",role) SELECT $1,$2,$3,$4,"passwordHash",\'OWNER\' FROM "AppUser" WHERE id=$5',
        [
          userId,
          companyId,
          'Other owner',
          'other-owner@example.test',
          owner.id,
        ],
      );
      await client.query(
        'INSERT INTO "CompanyWorkspace"("companyId",payload) VALUES($1,$2)',
        [companyId, JSON.stringify(emptyWorkspace())],
      );
      await client.query(
        'INSERT INTO "AuthSession"("tokenHash","userId","expiresAt") VALUES($1,$2,now()+interval \'1 day\')',
        [digest(value), userId],
      );
    });
    const cookie = `buildos_session=${value}`;
    const result = await app.inject({
      url: '/api/v1/workspace',
      headers: { cookie },
    });
    expect(result.json().data.projects).toHaveLength(0);
    expect(
      (
        await app.inject({
          url: `/api/v1/files/${storedFileId}`,
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/v1/team/${employee.id}`,
          headers: { cookie, origin, 'x-csrf-token': csrf(value) },
          payload: { active: false },
        })
      ).statusCode,
    ).toBe(404);
    const rows = await transaction(pool, companyId, (client) =>
      client.query('SELECT "companyId" FROM "CompanyWorkspace"'),
    );
    expect(rows.rows.map((row) => row.companyId)).toEqual([companyId]);
  },
);
suite(
  'enforces project scope, immutable audit, file references and single-use recovery',
  async () => {
    const ownerHeaders = {
      cookie: owner.cookie,
      origin,
      'x-csrf-token': owner.csrf,
    };
    const current = (
      await app.inject({
        url: '/api/v1/workspace',
        headers: { cookie: owner.cookie },
      })
    ).json();
    const forged = structuredClone(current.data);
    forged.documents[0].projectId = 'other-project';
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/v1/workspace',
          headers: { ...ownerHeaders, 'if-match': `"${current.version}"` },
          payload: forged,
        })
      ).statusCode,
    ).toBe(422);
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/team/${employee.id}`,
      headers: ownerHeaders,
      payload: { role: 'VIEWER', allProjects: false, projectIds: [] },
    });
    expect(patch.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          url: '/api/v1/workspace',
          headers: { cookie: employee.cookie },
        })
      ).statusCode,
    ).toBe(401);
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin },
      payload: {
        email: 'employee@example.test',
        password: credentials.password,
      },
    });
    expect(login.statusCode).toBe(200);
    const session = authSessionSchema.parse(login.json());
    employee.cookie = `buildos_session=${login.cookies[0]!.value}`;
    employee.csrf = session.csrfToken;
    expect(session.user.role).toBe('VIEWER');
    const scoped = (
      await app.inject({
        url: '/api/v1/workspace',
        headers: { cookie: employee.cookie },
      })
    ).json();
    expect(scoped.data.projects).toEqual([]);
    expect(scoped.data.documents).toEqual([]);
    expect(
      (
        await app.inject({
          url: `/api/v1/files/${storedFileId}`,
          headers: { cookie: employee.cookie },
        })
      ).statusCode,
    ).toBe(404);
    const blocked = structuredClone(scoped.data);
    blocked.projects = current.data.projects;
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/v1/workspace',
          headers: {
            cookie: employee.cookie,
            origin,
            'x-csrf-token': employee.csrf,
            'if-match': `"${scoped.version}"`,
          },
          payload: blocked,
        })
      ).statusCode,
    ).toBe(403);
    const journal = await app.inject({
      url: '/api/v1/audit?limit=1',
      headers: { cookie: owner.cookie },
    });
    expect(journal.statusCode).toBe(200);
    expect(journal.json().events).toHaveLength(1);
    expect(journal.json().nextCursor).toBeTruthy();
    const secondPage = await app.inject({
      url: `/api/v1/audit?limit=1&before=${encodeURIComponent(String(journal.json().nextCursor))}`,
      headers: { cookie: owner.cookie },
    });
    expect(secondPage.statusCode).toBe(200);
    expect(secondPage.json().events).toHaveLength(1);
    expect(secondPage.json().events[0].id).not.toBe(
      journal.json().events[0].id,
    );

    await expect(
      transaction(pool, owner.companyId, (client) =>
        client.query('DELETE FROM "AuditEvent" WHERE "companyId"=$1', [
          owner.companyId,
        ]),
      ),
    ).rejects.toThrow('immutable');
    const hidden = await app.inject({
      url: '/api/v1/audit',
      headers: { cookie: employee.cookie },
    });
    expect(hidden.json().events).toEqual([]);
    const issued = await app.inject({
      method: 'POST',
      url: `/api/v1/team/${employee.id}/recovery`,
      headers: ownerHeaders,
    });
    expect(issued.statusCode).toBe(200);
    const token = String(issued.json().token);
    const password = 'Synthetic replacement passphrase 2026!';
    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset',
      headers: { origin },
      payload: { token, password },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().user.passwordHash).toBeUndefined();
    expect(
      (
        await app.inject({
          url: '/api/v1/workspace',
          headers: { cookie: employee.cookie },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/reset',
          headers: { origin },
          payload: { token, password },
        })
      ).statusCode,
    ).toBe(410);
    employee.cookie = `buildos_session=${reset.cookies[0]!.value}`;
    employee.csrf = authSessionSchema.parse(reset.json()).csrfToken;
  },
);
suite(
  'revokes employee sessions immediately and prevents changing own owner access',
  async () => {
    const headers = {
      cookie: owner.cookie,
      origin,
      'x-csrf-token': owner.csrf,
    };
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/v1/team/${owner.id}`,
          headers,
          payload: { active: false },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/v1/team/${employee.id}`,
          headers,
          payload: { active: false },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          url: '/api/v1/workspace',
          headers: { cookie: employee.cookie },
        })
      ).statusCode,
    ).toBe(401);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          url: '/api/v1/workspace',
          headers: { cookie: owner.cookie },
        })
      ).statusCode,
    ).toBe(401);
  },
);
