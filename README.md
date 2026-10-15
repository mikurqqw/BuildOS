# BuildOS

MVP for AlmatyHUB.

## Hosted demo

Demo: https://buildos-demo.activelynx16.chatgpt.site (Sites hosting; current audience is preserved). Source: https://github.com/mikurqqw/BuildOS. The full API/database is not deployed.

The sign-in screen offers Demo 1 (empty) and Demo 2 (populated), both password-free. It uses an illustrative in-memory workspace and never grants company access. Reload resets its records. `pnpm build:demo` builds a standalone demo in `dist/` with employee login disabled and no API calls. The full server-backed development build retains employee authentication. Demo files use browser storage and are not uploaded to a server.

Construction workspace for contractors in Kazakhstan. Requested stack: React 19 / Vite / strict TypeScript / Tailwind / Fastify 5 / PostgreSQL / Prisma / pnpm / Turbo. Russian and light theme are defaults; Kazakh, English and dark theme are available.

## Current delivery

An employee login protects the whole workspace. The first owner creates the company, then invites employees from Team. Invitations are single-use and expire; disabling an employee revokes sessions. Owner-only team administration, Argon2id passwords, opaque HttpOnly sessions, CSRF/Origin checks, tenant-scoped queries and forced RLS on workspace/files are implemented.

Projects, tasks/board, issues, budgets, procurement and document metadata persist in a company PostgreSQL snapshot with optimistic version checks. Files are tenant-scoped database blobs (20 MB maximum), authenticated on download. File uploads and workspace updates are separate operations. No normalized enterprise business schema or full per-module role matrix is claimed.

Budget charts compare plan, actual and committed amounts. The schedule shows project spans, progress and task deadlines with month/quarter views, plus an ordered deadline list. Budget diagrams use an accessible native SVG gauge and project comparison bars with a common monetary scale. Procurement requests support status changes and confirmed deletion. The searchable catalog includes 81 construction materials across 13 categories, material specifications and 15 units, plus custom material/specification/unit entry. Catalog labels follow RU/KK/EN; custom text is preserved. Responsive motion respects reduced-motion preferences.

The optional demo is isolated from real records. Demo examples and interface have RU/KK/EN translations; project names remain unchanged. Arbitrary user text is preserved and is not automatically translated. No AI credentials, paid translation service or external integration is connected.

Settings exports/restores validated JSON metadata. Files are excluded: back up PostgreSQL separately. Previous browser records can be imported explicitly; download old IndexedDB files from the legacy panel and re-upload them after import. Original browser data is preserved.

The full specification is in docs/reference-spec.txt; remaining enterprise modules are listed in docs/IMPLEMENTATION.md. This is a locally implemented MVP, not the complete P0-P12 platform.

## Local development

```powershell
pnpm install --frozen-lockfile
pnpm db:local
pnpm dev
```

Open http://127.0.0.1:5173, create your owner account, then invite employees in Team. No owner password is seeded in the real workspace. `db:local` uses installed PostgreSQL binaries (default Windows PostgreSQL 18; override POSTGRES_BIN), starts an isolated cluster on 127.0.0.1:55432, deploys additive migrations and writes ignored .local credentials/apps/api/.env.local. It does not modify an existing PostgreSQL service. API runs on 3001; Vite proxies /api to it.

For another database, supply DATABASE_URL and WEB_ORIGIN using apps/api/.env.example. Use a non-superuser database login without BYPASSRLS. Run `pnpm --filter @buildos/api db:migrate` with that environment before starting. Production requires NODE_ENV=production, HTTPS and a random SETUP_TOKEN (minimum 32 characters), entered only for initial company setup. The optional worker/Redis outbox remains a foundation; QUEUE_ENABLED=false does not require Redis readiness.

## Checks

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

Integration tests use TEST_DATABASE_URL or the local ignored API database configuration. They create and drop only unique test schemas; without a database they skip. CI supplies a non-superuser Postgres 16 role. See docs/VERIFICATION.md for checks actually run.

## Containers

Docker is unavailable in the implementation environment; this packaging has not been executed.

```powershell
Copy-Item .env.example .env
# Replace all password/token placeholders. Use URL-safe random passwords.
docker compose --profile app up --build -d
```

Fresh volumes initialize a separate buildos_admin and non-superuser buildos application role. Existing volumes are never reset: if initialized with the previous superuser-only configuration, provision a non-superuser role and privileges manually before using the API. Do not delete a volume to repair credentials.

Compose migrates first, then runs API and web at loopback http://127.0.0.1:8080. Nginx forwards /api to the api service; a standalone web container requires an API container reachable as `api:3001` on the same network. Default Compose mode is local development. A production deployment needs TLS termination, APP_ENV=production, matching HTTPS WEB_ORIGIN, secret management and restrictive networking.

## Before launch

Configure TLS, rate-limit behavior behind the actual proxy, account recovery, operational audit, backups and a verified restore procedure. Back up the complete PostgreSQL database (including StoredFile) with pg_dump and test restoration into a separate database. Rollback app releases only when compatible with deployed migrations; do not reverse migrations by deleting data. Monitor /healthz, /readyz and logs. User offboarding and company isolation have local integration coverage; production, containers, Redis delivery and disaster recovery remain unverified.

No SSO, 2FA, password reset, per-project permissions, immutable audit, real-time collaboration, file versioning/scanning, CPM scheduling, procurement approval/warehouse ledger, accounting, offline sync, AI/OCR, signatures or billing is connected. The demo is deployed; the full company server is not.
