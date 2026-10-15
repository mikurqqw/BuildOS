import { randomUUID } from 'node:crypto';
import { hash, verify, argon2id } from 'argon2';
import type { Pool } from 'pg';
import {
  emptyWorkspace,
  setupSchema,
  loginSchema,
  acceptInviteSchema,
  type AuthUser,
} from '@buildos/shared';
import { transaction } from './repository.js';
import { ApiError } from './errors.js';
import { digest, token } from './security.js';
const passwordHash = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
export class IdentityService {
  constructor(
    private pool: Pool,
    private setupToken?: string,
  ) {}
  async status() {
    const result = await this.pool.query('SELECT 1 FROM "AppUser" LIMIT 1');
    return {
      setupRequired: !result.rowCount,
      requiresSetupToken: !!this.setupToken,
    };
  }
  async setup(input: unknown) {
    const parsed = setupSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_INPUT');
    const body = parsed.data;
    if (
      this.setupToken &&
      digest(body.setupToken ?? '') !== digest(this.setupToken)
    )
      throw new ApiError(403, 'INVALID_SETUP_TOKEN');
    const password = await passwordHash(body.password);
    return transaction(this.pool, null, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(9821765)');
      if ((await client.query('SELECT 1 FROM "AppUser" LIMIT 1')).rowCount)
        throw new ApiError(409, 'SETUP_COMPLETE');
      const companyId = randomUUID();
      const id = randomUUID();
      await client.query('INSERT INTO "Company"(id,name) VALUES($1,$2)', [
        companyId,
        body.company,
      ]);
      await client.query(
        'INSERT INTO "AppUser"(id,"companyId",name,email,"passwordHash",role,position) VALUES($1,$2,$3,$4,$5,\'OWNER\',\'\')',
        [id, companyId, body.name, body.email, password],
      );
      await client.query("SELECT set_config('app.company_id',$1,true)", [
        companyId,
      ]);
      await client.query(
        'INSERT INTO "CompanyWorkspace"("companyId",payload) VALUES($1,$2)',
        [companyId, JSON.stringify(emptyWorkspace())],
      );
      return {
        id,
        companyId,
        name: body.name,
        email: body.email,
        role: 'OWNER' as const,
        position: '',
        company: body.company,
      };
    });
  }
  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(401, 'LOGIN_FAILED');
    const result = await this.pool.query<
      AuthUser & { passwordHash: string; active: boolean }
    >(
      'SELECT u.*,c.name AS company FROM "AppUser" u JOIN "Company" c ON c.id=u."companyId" WHERE u.email=$1',
      [parsed.data.email],
    );
    const user = result.rows[0];
    if (!user) {
      await passwordHash(parsed.data.password);
      throw new ApiError(401, 'LOGIN_FAILED');
    }
    if (
      !(await verify(user.passwordHash, parsed.data.password)) ||
      !user.active
    )
      throw new ApiError(401, 'LOGIN_FAILED');
    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      company: user.company,
    };
  }
  async accept(input: unknown) {
    const parsed = acceptInviteSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_INPUT');
    const password = await passwordHash(parsed.data.password);
    return transaction(this.pool, null, async (client) => {
      const result = await client.query<{
        id: string;
        companyId: string;
        email: string;
        position: string;
        company: string;
      }>(
        'SELECT i.*,c.name AS company FROM "Invitation" i JOIN "Company" c ON c.id=i."companyId" WHERE i."tokenHash"=$1 AND i."acceptedAt" IS NULL AND i."expiresAt">now() FOR UPDATE OF i',
        [digest(parsed.data.token)],
      );
      const invitation = result.rows[0];
      if (!invitation) throw new ApiError(410, 'INVITE_EXPIRED');
      if (
        (
          await client.query('SELECT 1 FROM "AppUser" WHERE email=$1', [
            invitation.email,
          ])
        ).rowCount
      )
        throw new ApiError(409, 'EMAIL_EXISTS');
      const id = randomUUID();
      await client.query(
        'INSERT INTO "AppUser"(id,"companyId",name,email,"passwordHash",role,position) VALUES($1,$2,$3,$4,$5,\'EMPLOYEE\',$6)',
        [
          id,
          invitation.companyId,
          parsed.data.name,
          invitation.email,
          password,
          invitation.position,
        ],
      );
      await client.query(
        'UPDATE "Invitation" SET "acceptedAt"=now() WHERE id=$1',
        [invitation.id],
      );
      return {
        id,
        companyId: invitation.companyId,
        name: parsed.data.name,
        email: invitation.email,
        role: 'EMPLOYEE' as const,
        position: invitation.position,
        company: invitation.company,
      };
    });
  }
  async session(user: AuthUser) {
    const value = token();
    await this.pool.query(
      'INSERT INTO "AuthSession"("tokenHash","userId","expiresAt") VALUES($1,$2,now()+interval \'7 days\')',
      [digest(value), user.id],
    );
    return value;
  }
}
