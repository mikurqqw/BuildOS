# BuildOS workspace

- Product requirements: docs/reference-spec.txt. Progress and deferred scope: docs/IMPLEMENTATION.md and README.md.
- pnpm workspaces/Turborepo; Node >=22.12; React 19 + Vite 7; Tailwind 4; strict TypeScript; Fastify 5; PostgreSQL 16/Prisma 6; Redis/BullMQ.
- Commands: pnpm dev, pnpm dev:api, pnpm lint, pnpm typecheck, pnpm test, pnpm build, pnpm format:check.
- Russian is the default UI language and light is the default theme. All UI strings require matching ru/kk/en keys. Preserve user content when locale changes.
- Private routes require employee sessions. Company workspace and files live in PostgreSQL with tenant-scoped access and RLS. Demo is ephemeral. No AI or external integrations are connected.
- Never replace existing user data with demo records. Demo state is isolated and explicitly labeled.
- Business schemas and metric rules live in packages/shared. Theme tokens live in packages/ui.
- No credentials in source or logs. No destructive migrations, public publication or pushes without authorization.
