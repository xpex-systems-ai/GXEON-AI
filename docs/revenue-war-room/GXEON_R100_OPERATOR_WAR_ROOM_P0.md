# GXEON R$100 Operator War Room P0

Purpose: one manual-first command room at `/ops/r100-war-room` and `/api/r100-war-room/*` for the operator to pursue the first R$100 with operator-provided prospects, copy-only offers, manual payment previews, GitHub Demand conversion packs, Brain sprint context, and ledger preview.

## API contracts
- `GET /api/r100-war-room/status` returns P0 readiness and safety flags.
- `GET /api/r100-war-room/summary` returns fastest route, next best manual action, counts, panels, preview estimate and `realRevenueBrl: 0`.
- `GET /api/r100-war-room/actions` returns ranked copy-only manual actions.
- `POST /api/r100-war-room/manual-action-preview` returns selected action copy preview only.
- `POST /api/r100-war-room/focus-sprint-preview` returns a 15-minute checklist preview only.

## Manual test flow
Open `/ops/r100-war-room`, confirm `PREVIEW_ONLY`, create a manual prospect, generate offer/payment previews, return to the War Room, and confirm the next best manual action updates. Never send, charge, scrape, or confirm revenue automatically.

## Rollback
Remove the route import/mount, page route/sidebar item, War Room service/components/page, and this documentation folder.
