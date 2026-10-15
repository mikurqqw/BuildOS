# BuildOS access and operations implementation plan

**Goal:** Deliver working role/project access, recovery and audit; procurement, suppliers, stock and scheduling dependencies; document versions/approval, payment records and export in the existing MVP.
**Architecture:** Keep the modular Fastify/React monolith and tenant JSON snapshot. Shared Zod contracts and workflow validation run in both demo and API. The API filters by project, merges hidden records safely, enforces roles/transitions, and records trusted append-only audit separately. No paid services or bank/email integrations.
**Stack:** Existing strict TypeScript, React/Vite, Fastify, PostgreSQL/Prisma, pnpm.

## Contracts and ownership

- Root: packages/shared/src/operations.ts (schemas), access.ts (role/project permissions), policies.ts (normalize/validate transitions); workspace contracts, provider, navigation, task dependencies/stages and integration.
- Access implementer: apps/api/**, packages/shared/src/auth.ts, web Team/auth screens and access translations/styles. Add additive migrations, project restrictions, trusted audit, single-use owner-issued password recovery, owner recovery CLI. No real credentials/accounts changed.
- Procurement implementer: new web Procurement.tsx, procurement translations/styles. Requests workflow requested → submitted → approved/rejected → ordered → received; immutable receipts/issues; supplier register.
- Documents/finance implementer: web Documents.tsx, new Finance.tsx and Reports.tsx, document/finance translations/styles. Version history, pending/approved/rejected review, separate cash payment journal and safe CSV/print reports.

## Shared data contract

AccessActor: id, role OWNER|MANAGER|EMPLOYEE|PROCUREMENT|FINANCE|VIEWER, allProjects:boolean, projectIds:string[]. Defaults preserve existing employees' visibility. OWNER administers team; selected project scope filters reads and merges writes. MANAGER manages project/stage/task/issue, approves requests/docs; PROCUREMENT handles orders/stock/suppliers; FINANCE handles budget/payment; EMPLOYEE works on tasks/issues/docs and draft/submitted requests; VIEWER reads. OWNER can approve own records; other reviewers cannot approve their own submission.

Workspace adds suppliers, stockMovements, payments, stages (arrays default empty). Tasks gain dependsOn:string[], start?:ISO date, stageId?:id. Request adds supplierId?, unitPrice (KZT integer, default 0), createdBy?, approvedBy?, approvedAt? and extended status. Stock movement: id, projectId, requestId, direction IN|OUT, quantity>0, date, note, createdBy?. Supplier: id, name, contact, email, phone, notes, active. Payment: id, projectId, budgetLineId?, payee, amount integer KZT>0, due, status planned|paid|cancelled, paidOn?, reference, note, createdBy?. Stage: id, projectId, name, start, end. Document adds seriesId?, version>=1 default1, reviewStatus draft|pending|approved|rejected defaultdraft, submittedBy?, reviewedBy?, reviewedAt?, reviewNote. Existing records parse without migration of JSON.

Shared exports: canWrite(actor, collection), canApprove(actor), canAccessProject(actor,id), visibleWorkspace(workspace,actor), mergeWorkspace(previous,input,actor), validateWorkspaceChange(previous,next,actor):Workspace. Inventory helpers stockBalance(workspace,requestId), paymentTotals(payments); safeCsv(rows). Provider exposes actor and canWrite(collection); every update is validated before commit, authoritative API repeats validation. Business validation stamps actor IDs server-side; user activity remains illustrative, not a trusted audit.

## Tasks / acceptance

- [x] Shared tests first: role/project merge, approval transitions, append-only inventory/nonnegative balance, payments, document versions, dependency cycle/start rules, CSV formula escaping and backward compatibility.
- [x] Access API: enforce all private routes including file project ownership; immutable AuditEvent SQL trigger; owner-issued one-use recovery tokens with session invalidation. Team UI for role/project scope; journal UI. Test tenant and object boundaries using synthetic PostgreSQL schemas.
- [x] Procurement UI: draft/create, submit, review, supplier/price/order, partial receipts, stock issue and balance; no deletion of approved/historical operations.
- [x] Documents/finance: upload new version without deleting old file, read history/download, submit/review; planned/paid cash records, referenced budget line validation, CSV and print reports. Cash flow is distinct from accrual cost and does not silently double-count budget actuals.
- [x] Scheduling: stages CRUD, task predecessor selection, cycles/cross-project dependencies rejected, dependent work cannot start until predecessors complete.
- [x] Verify lint/types/tests/full and static builds, actual desktop/mobile workflows and failure paths; independent review. Preserve the two demos, RU/KK/EN and light/dark. Update GitHub and existing hosted demo after verification; full API deployment remains deferred.

## Rulings

- Scope is an operational MVP for these modules, not SSO/2FA, automated bank payments, an accounting ledger, RFQ/tender bidding, warehouse costing, CAD or CPM baseline optimization. Those were not requested in the chosen list.
- Recovery links are manually delivered by the owner. No invented email delivery; an operator CLI covers owner recovery with database administration access.
- Never reset existing company data or migrate destructively; only additive database changes and compatible JSON defaults.
