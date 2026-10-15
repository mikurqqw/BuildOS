# BuildOS UX and employee access

## User decisions

- Translate all illustrative content to Russian, Kazakh and English; keep project names unchanged. Arbitrary user content is not auto-translated; no paid translation API is authorized.
- The entire workspace requires an employee account, not merely a contact-directory record.
- Improve budget charts, schedule, request deletion and purposeful motion. Preserve light/Russian defaults.

## Implementation

1. Demo copy catalogue and non-destructive locale projection. Tests cover all three languages and unchanged project names/custom text.
2. Clean budget comparison/allocation visualizations, project timeline with calendar scale, today marker and focused project/task views. Delete procurement requests with confirmation. Add reduced-motion-aware transitions and responsive refinements.
3. PostgreSQL-backed identity: initial owner setup, invitation-only employee registration from Team, Argon2id password hashes, hashed opaque sessions in httpOnly/SameSite cookies, server CSRF and origin enforcement, rate limits, owner-only team administration, logout/revocation.
4. Authenticated company workspace API with schema validation, optimistic revision checks and PostgreSQL RLS; no browser-only security gate. Preserve legacy local records until explicit import. Authenticated file storage and downloads; demo remains isolated and available only after login.
5. Migrations, environment validation, local isolated PostgreSQL bootstrap and integration tests against real PostgreSQL. Test tenant isolation, unauthenticated rejection, invitations, session revocation, CSRF and stale writes.
6. Verify lint, formatting, types, tests, build, audit and desktop/mobile light/dark rendering. User creates their own real owner credentials; testing uses a separate test database.

## Runtime decision

An installed PostgreSQL 18 binary is available; its existing Windows service and data must not be modified. Use an isolated ignored workspace cluster on 127.0.0.1:55432 for local development/testing. Compose and CI retain PostgreSQL 16 compatibility. Do not install or change system services.

## Boundaries

This adds a small real account/tenant layer, not full enterprise identity (SSO, 2FA, password recovery or full RBAC). Account invitations are shared manually; no email is sent. Workspace records use a validated company-scoped JSONB snapshot pending normalized business-module migrations. No deployment or publication is authorized.
