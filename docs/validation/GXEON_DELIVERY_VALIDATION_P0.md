# GXEON Delivery Validation P0

Delivery Validation P0 is a safe preview-only/manual-first runtime layer between Execution Center P0 and future Release Gate work.

## Role

Delivery Validation P0 accepts Execution Center preview-like input and creates internal validation preview records. It tracks:

- `mode: PREVIEW_ONLY`
- evidence state and evidence checklist
- acceptance criteria
- approval state
- revision and rejection state/reasons
- blocked actions inherited from execution previews
- the next manual gate

## Runtime API contracts

All routes are mounted under `/api/validation` and return `{ success, data }`.

- `GET /api/validation/status` returns `DELIVERY_VALIDATION_P0_READY` and the preview-only safety flags.
- `GET /api/validation/previews` lists in-memory validation previews.
- `GET /api/validation/previews/:id` reads one preview.
- `POST /api/validation/previews` creates an in-memory validation preview from execution-preview-like input.
- `PATCH /api/validation/previews/:id/state` allows safe manual state transitions only.

## Execution Center relationship

Execution Center P0 creates internal execution previews. Delivery Validation P0 reads the execution preview shape from the dashboard action and stores a separate validation preview record. This does not mark execution complete and does not approve delivery.

## Future Release Gate and Ledger

Release Gate and Ledger remain future stages. P0 may show `READY_FOR_RELEASE_REVIEW` as a manual review state, but it does not expose release routes, release buttons, real approval routes or ledger writes.

## Validation commands

Expected validation commands:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/gxeon-dashboard run build
git diff --check
PORT=3000 pnpm --filter @workspace/api-server run start
curl -s http://localhost:3000/api/validation/status
curl -s -X POST http://localhost:3000/api/validation/previews -H "Content-Type: application/json" -d '{"title":"Fix Supabase RLS for dashboard","executionPreviewId":"execution_preview_000001","taskId":"task_preview_001","riskEnergy":82,"blockedActions":["external_contact","payment_action","change_database","github_write"],"evidenceRequirements":["Screenshot or report of manual result","Before/after notes","Operator confirmation","Rollback notes"],"checklist":["Review Broker recommended route","Confirm blocked actions remain blocked","Collect evidence before claiming delivery"]}'
curl -s http://localhost:3000/api/validation/previews
```

## Future work

- Release Gate P0 preview runtime.
- Ledger preview/runtime integration.
- Database persistence only after an explicit persistence phase.
- External evidence integrations only after explicit safety review and operator authorization.
