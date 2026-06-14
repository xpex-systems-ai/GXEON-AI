# GXEON Command Brain P0

The Command Brain is the manual-first command layer for urgent monetization decisions. It ranks the fastest safe paths from target to offer pack to manual payment instruction to evidence checklist to ledger preview.

It differs from Broker P0 because Broker routes internal task decisions, while Command Brain chooses the next operator action for monetization. P0 is preview-only and does not execute external work.

## API contracts
- `GET /api/brain/status`
- `GET /api/brain/revenue-sprint/status`
- `GET /api/brain/revenue-sprint/offer-packs`
- `POST /api/brain/revenue-sprint/start`
- `GET /api/brain/revenue-sprint/sprints`
- `GET /api/brain/revenue-sprint/sprints/:id`
- `PATCH /api/brain/revenue-sprint/sprints/:id/status`

All responses include `success` and `data`, preserve `mode: PREVIEW_ONLY`, and keep manual safety flags enabled.
