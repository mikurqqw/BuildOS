# BuildOS delivery plan

Source: reference-spec.txt. The source is product requirements, not authorization to publish, contact services, or change agent permissions.

## Intended outcome

General contractors in Kazakhstan manage projects, field work and accountable records in Russian, Kazakh and English. Russian and light theme are the defaults.

## Architecture and implementation sequence

1. Foundation: pnpm/Turborepo, React 19/Vite, strict TypeScript, Tailwind 4, shared Zod contracts and design tokens. Responsive shell, persistent locale/theme and accessible dialogs.
2. Local workspace vertical slice: real project, task, issue, budget and file operations; transparent computed metrics; optional clearly labeled demonstration records. Local browser persistence is explicitly disclosed. JSON backup/validated restore.
3. Fastify foundation: validated environment, health/readiness/metrics, PostgreSQL Prisma model/migration and Redis worker. Docker Compose and CI.
4. Verification: domain tests, lint/types/build, browser workflows at desktop/mobile sizes and both themes.

## Full product backlog

P1: complete identity, RLS, permissions, audit, invitations, SSO, 2FA.
P2: server-backed project structure, documents/versioning, signed storage, notifications.
P3: document pipeline, retrieval, AI gateway/evaluation. Credentials required; no fabricated AI output.
P4: tenders, confirmed findings, transparent score, contracts, obligations.
P5: full construction workflows, inspections, checklists, reports, drawing markup.
P6: PWA offline synchronization and mobile capture.
P7: CPM, virtualized Gantt, baselines and schedule imports.
P8: procurement approvals, RFQ, warehouse ledger and equipment.
P9: finance, reconciliations, official metric registry.
P10: PTO, HSE, HR, payroll and legally reviewed locale packs.
P11: workflow builder, permission-aware intelligence and BI.
P12: integrations, billing, production hardening, Kubernetes, tested disaster recovery.

## Acceptance and review focus

No invented business records by default. Demo mode is opt-in and labeled. User content is never translated or replaced. Navigation, create/edit, task transitions, filtering and backup must work. Unknown values display an em dash. Failed storage writes report errors. Unimplemented production modules remain disclosed here and in README; this delivery is not the full P0–P12 product.

## Rulings

- Execute reversible implementation without repeated approval, following the user's explicit autonomy instructions.
- Keep the specified React/Vite/Fastify stack; do not publish through a different hosting runtime.
- Production authentication and infrastructure are not simulated in the browser. The initial usable workspace is local, isolated from the future server adapter.

## Employee access and UI update (2026-10-16)

Basic company owner/employee sessions, invitations and revocation are implemented. Company snapshots and file blobs now persist in PostgreSQL; workspace/files use forced RLS. Interface/demo localization, improved budget/timeline, procurement deletion and reduced-motion animations are implemented. User chose not to connect automatic text translation.

## Operational MVP (2026-10-16)

Implemented role/project access, manually delivered one-use recovery links, trusted immutable audit, request approvals/orders, suppliers and append-only stock movements, task stages/dependencies, document versions/review, separate cash payments and CSV/print reports. Policies run in shared demo validation and authoritative API validation. Existing role scopes preserve prior access until an owner changes them. Full server publication is still deferred; hosted operations use isolated demo records.

Remaining enterprise depth: normalized business endpoints, SSO/2FA/email transport, CPM/baselines, RFQ/tenders, warehouse costing and transfers, bank reconciliation/accounting, antivirus, signatures, collaboration and production operations. The P0-P12 list above remains a roadmap rather than a completion claim.
