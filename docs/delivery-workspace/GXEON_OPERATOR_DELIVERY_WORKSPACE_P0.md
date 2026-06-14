# GXEON Operator Delivery Workspace P0

Purpose: convert one GitHub Demand Execution Pack into an in-memory, preview-only operator workbench for manual delivery preparation.

Flow: GitHub Demand candidate → conversion pack → execution pack → delivery workspace preview. The workspace centralizes operator brief, PT-BR and EN-US copy-only delivery drafts, evidence checklist, delivery checklist, validation checklist, release checklist and ledger preview.

API contracts:
- `GET /api/delivery-workspace/status`
- `GET /api/delivery-workspace/workspaces`
- `GET /api/delivery-workspace/workspaces/:id`
- `POST /api/delivery-workspace/from-github-execution-pack/:id`
- `POST /api/delivery-workspace/workspaces/:id/evidence-preview`
- `POST /api/delivery-workspace/workspaces/:id/validation-preview`
- `POST /api/delivery-workspace/workspaces/:id/release-preview`
- `POST /api/delivery-workspace/workspaces/:id/ledger-preview`
- Bridge: `POST /api/github-demand/execution-packs/:id/delivery-workspace-preview`

Manual test flow: open `/ops/github-demand`, generate/use an execution pack, create task and ledger previews, create delivery workspace preview, open `/ops/delivery-workspace`, copy a draft manually, create evidence, validation, release and ledger previews, and confirm no external action occurred.

Rollback plan: remove delivery workspace routes, service/page/component imports, and the bridge endpoint; the underlying GitHub Demand execution pack flow remains preview-only.
