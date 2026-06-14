# GXEON GitHub Demand Execution Pack P0

GitHub Demand Execution Pack P0 converts a selected GitHub Demand Conversion Pack into an internal execution-ready package. It adds operator summary, technical checklist, evidence checklist, delivery artifacts, validation checklist, release preview notes, ledger preview notes and next manual action.

## Safety model

All outputs are `PREVIEW_ONLY` and `COPY_ONLY`. The layer does not clone candidate repositories, execute external code, write GitHub comments, open PRs, contact users, create payment links, call payment APIs, claim rewards or mark revenue received.

## API contracts

- `POST /api/github-demand/conversion-packs/:id/execution-pack`
- `GET /api/github-demand/execution-packs`
- `GET /api/github-demand/execution-packs/:id`
- `POST /api/github-demand/execution-packs/:id/task-preview`
- `POST /api/github-demand/execution-packs/:id/broker-preview`
- `POST /api/github-demand/execution-packs/:id/execution-center-preview`
- `POST /api/github-demand/execution-packs/:id/validation-preview`
- `POST /api/github-demand/execution-packs/:id/release-preview`
- `POST /api/github-demand/execution-packs/:id/ledger-preview`

Each action returns an `actionResult` with status, pack id, safety flags and next manual action.

## Manual test flow

Open `/ops/github-demand`, search demand, create pipeline preview, generate conversion pack, generate execution pack, then create task, broker, execution, validation, release and ledger previews. Verify every action is visible in the UI and no external action occurs.

## Rollback

Remove the execution pack routes, store, bridge, UI card and docs. Because storage is in-memory only, rollback has no database migration or data cleanup.
