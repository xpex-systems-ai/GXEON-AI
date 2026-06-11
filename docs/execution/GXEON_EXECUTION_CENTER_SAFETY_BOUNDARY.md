# GXEON Execution Center Safety Boundary

Execution Center P0 is constrained to preview-only manual planning.

## Always true on every execution preview

- `mode: PREVIEW_ONLY`
- `executionDisabled: true`
- `approvalRequired: true`
- `evidenceRequired: true`
- `externalContact: false`
- `githubWrites: false`
- `paymentAction: false`
- `autonomousExecution: false`

## Explicitly prohibited in P0

Execution Center P0 must not:

- Execute code or shell commands from runtime API routes.
- Deploy services.
- Write to GitHub, create issues, create PRs, add comments, or create commits from app runtime code.
- Contact external users or send emails.
- Call Stripe, Mercado Pago, or any checkout/capture/payment flow.
- Mutate production databases.
- Add database persistence.
- Add workers or schedulers.
- Install or activate agents.
- Add credential forms or expose secrets in the frontend.
- Fake completed real delivery.

## Route boundary

Allowed P0 routes:

- `GET /api/execution/status`
- `GET /api/execution/previews`
- `GET /api/execution/previews/:id`
- `POST /api/execution/previews`
- `PATCH /api/execution/previews/:id/status`

Disallowed route concepts:

- `/execute`
- `/run`
- `/deploy`
- external contact actions
- GitHub write actions
- payment actions
- agent installation or activation actions

## Data boundary

The P0 store is in-memory only. A process restart clears previews. This is intentional to avoid persistence or production database mutation before the safety model is expanded and reviewed.

## Manual evidence boundary

Evidence requirements can reference links or screenshots that an operator manually creates outside the runtime. The runtime must not create those artifacts itself.

## Rollback boundary

Rollback notes are instructions for manual operator review. The runtime must not perform rollback automation in P0.
