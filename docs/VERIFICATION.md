# Verification record

## Automated

- Domain tests: weighted progress, empty progress, budget arithmetic, project validation, malformed workspace imports, Kazakhstan calendar day.
- Contrast tests: semantic text/background pairs pass WCAG AA in light and dark. The light danger token was darkened from the reference value to #C42D32 after a measured failure (4.32:1 on its soft background).
- API injection tests: health, readiness unavailable (503), readiness available (200), metrics, unified not-found errors.
- Local-state regressions: snapshot preservation, demo blob namespace isolation, pending operation invalidation, and rejecting reserved namespace IDs in backups.
- Production dependency audit: the unused resolver adapter and Swagger UI/static dependency were removed after advisories were reported; the repeated audit reported no known vulnerabilities. OpenAPI JSON remains available at `/api/docs` and `/api/docs/json`.
- TypeScript strict, ESLint, Prettier and Vite production build are run with repository scripts. See the final report for their actual completion state.

## Browser

Tested with the in-app browser against the local Vite server. Test records use the QA prefix and do not represent real projects.

Verified: desktop empty dashboard and opt-in demo portfolio; project/task creation; persistence after reload; task completion and 100% project progress; task board; 120-record task pagination; budget-line creation with actual/committed values; issue creation and open → in-progress → resolved transitions.

Language and theme checks: Russian, English and Kazakh; light/dark on desktop and 390px mobile. Mobile overflow was checked. Theme/language persisted after reload. Embedded Chromium lacked Kazakh ICU month names; a tested formatter now renders names such as “қазан”.

File workflow: uploaded a synthetic TXT fixture, reloaded, downloaded it and compared SHA-256 hashes (equal). Exported JSON backup contained the project/task/document metadata; restored it in isolated demo mode and confirmed local records were preserved. QA records were reset using an empty backup after preserving a downloadable copy.

Operational smoke: compiled API `/healthz` returned 200, `/readyz` returned 503 against deliberately unavailable dependencies, `/metrics` returned real counters and `/api/docs/json` returned 200. Prisma schema validation and client generation succeeded. No live migration was run.

Review: independent read-only review found async stale-snapshot writes and shared demo/file keys. These were fixed using current snapshot updates, scope invalidation and reserved demo namespaces. Scope checks also guard asynchronous backup restore; a regression rejects namespace-colliding imported IDs.

Further results are appended after testing. No Lighthouse score, 10k-row performance, production deployment, live database isolation or full enterprise walkthrough is claimed.

## Previous delivery environment limits

Docker is not installed. PostgreSQL and Redis integration, live migrations, worker delivery and container execution remain unverified. AI and third-party integrations are absent and do not display fabricated successes.

## Employee access update (2026-10-16)

The earlier browser-local notes above describe the previous delivery. Current data is server-backed. Isolated PostgreSQL 18.6 on loopback 55432 was initialized without changing the installed service. Additive migrations were deployed. Runtime role is non-superuser. Prisma client generation succeeded. Typecheck, lint, 25 tests (including 6 real PostgreSQL integration scenarios) and production dependency audit passed. Integration coverage includes setup once, login/CSRF/Origin, single-use invitations, owner-only team changes, tenant RLS, file isolation, optimistic conflicts and session revocation. Independent review found and prompted fixes for legacy file downloads and the nginx API proxy.

Docker/Compose and production TLS, backup restoration, Redis worker delivery remain unverified.

Final checks: pnpm format:check, lint, typecheck, 25 tests, build, Prisma validation/client generation and production audit succeeded. Build emits a >500 kB entry chunk advisory and Zod annotation warnings. Compiled API started successfully: /readyz 200, /auth/status setupRequired true, private workspace 401 without a session.

Browser QA used a separate temporary database schema and synthetic existing owner, never the real company. Verified demo procurement cancel/delete (3 to 2), RU/KK/EN examples, owner invitation form, real project creation and persistence after reload. Budget and schedule were inspected at desktop 1440px and mobile 390px in light/dark; no page overflow. Schedule permits horizontal scrolling within its timeline on mobile. Screenshots: docs/qa/budget-v2-light.png, schedule-v2-light.png, schedule-v2-mobile-dark.png. The real workspace remains at initial owner setup, with no seeded account.

## Password-free demo entry

The public demo bypasses company login only for illustrative in-memory records, without creating an employee session. AuthGate regression tests cover API failure, no-session demo access and standalone demo without unavailable password fields. VITE_DEMO_ONLY disables session queries for the static deployment. The full API remains protected.

Release checks: 28 tests, lint, types, formatting and the standalone demo production build passed. Clean browser reload resolved a development HMR context mismatch; standalone demo opened with no company session, and procurement status changed successfully without API access. GitHub main contains the source. Sites deployment succeeded at https://buildos-demo.activelynx16.chatgpt.site with owner-private access. Full Fastify/PostgreSQL deployment remains deferred by the user.

## Materials, two demo modes and chart update (2026-10-16)

33 tests passed, including catalog selection validation, custom names/units, translated canonical entries, compatibility and fresh empty/full demo snapshots. Browser QA on the standalone production demo covered empty login, first project creation, concrete B30 at 12.5 m3 with default unit, custom material and custom unit, EN translation without changing custom text, KK catalog/unit labels, switching to original populated demo, budget and schedule/deadline views. Desktop 1440px and mobile 390px light/dark layouts inspected; modal Escape and page overflow checked. Native SVG/bullet charts replace the Recharts budget chunk (approximately 390 kB to 8 kB for that lazy page). Independent static review reported no substantial defects.

The initial demo build exposed stale shared output; build:demo now builds dependency packages first. Current Sites access was read as public and will be preserved, rather than resetting the owner's audience. Full company server deployment remains deferred.

## Access and operational MVP (2026-10-16)

45 tests passed with TEST_DATABASE_URL explicitly supplied, including 7 real PostgreSQL scenarios in unique temporary schemas. New coverage includes selected-project reads and merge preservation, viewer writes, file project boundaries, append-only audit and cursor pagination, single-use recovery/session revocation, own-submission approval restrictions, supplier/price ordering, partial/full receipt, stock balance/history, payment evidence/history, document version continuity and project boundaries, dependency cycles/start rules and CSV formula escaping. Independent read-only review found an employee could delete another employee's draft; the ownership check now precedes deletion and a regression test covers it. No additional substantial findings were reported.

Full lint, format check, strict typecheck, production build, standalone demo build, Prisma generation and production dependency audit passed. The additive operations migration was deployed to the existing isolated local PostgreSQL cluster without creating or changing real accounts. Build warnings remain: the approximately 554 kB initial entry chunk, third-party Zod annotation warnings and the existing build helper's Node shell deprecation advisory.

Browser smoke on the production demo build: submitted and approved the concrete request, created a synthetic supplier, ordered at 25,000 KZT/unit, received 120 m3 and issued 20 m3 with a reason; displayed stock became 100 m3. Created a 100,000 KZT planned payment and recorded it paid with a date and reference. Created a stage and saved a task's start, stage and completed predecessor. Uploaded a synthetic document, submitted/approved version 1, uploaded version 2, inspected both versions and downloaded version 1; SHA-256 matched its original. CSV download succeeded. RU/EN/KK report labels, 1440px desktop and 390px mobile dark layouts were inspected; no page overflow. Demo 1 remained empty after switching from Demo 2. A rebuild during testing invalidated already-loaded lazy chunk URLs; reloading the finished build restored the expected page.

These checks do not claim a real bank transfer, automatic email delivery, accounting compliance, remote API deployment, container execution, backup restoration or full production hardening. Recovery links are manually delivered; payments are records only. The published Site remains a static demo, while authoritative roles and persistence run in the locally implemented API.

## GitHub Pages preparation (2026-10-16)

The Pages workflow builds only the standalone demo with `/BuildOS/` asset paths and hash routing. The ordinary build keeps its original base path and BrowserRouter. Production demo build, lint, formatting and all 45 tests passed. Local browser verification opened `/BuildOS/`, entered Demo 2, navigated to `#/finance`, reloaded, re-entered the demo and returned to Payments without a 404. The keyboard skip-link focuses `main` while preserving `#/finance`. Read-only review checked output paths, deployment permissions and exclusion of API/configuration files from the static artifact. The GitHub Pages repository setting must be enabled separately; a working local build is not evidence of a live Pages publication.
