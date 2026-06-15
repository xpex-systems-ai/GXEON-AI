# GXEON R$100 Ledger Revenue Sync P2

## What changed

- Revenue Close Loop manual confirmation now syncs a linked ledger preview by `closeLoopId`.
- Ledger exposes preview/status/summary APIs with manual-first safety flags.
- Ledger page separates forecast, operator confirmed, provider verified, pending and lost totals.
- Command Brain and R$100 War Room expose `operatorConfirmedRevenueBrl` and `ledgerPreviewCount` without claiming provider settlement.

## API contracts

- `GET /api/ledger/status`: runtime status, totals, allowed statuses and safety boundary.
- `GET /api/ledger/summary`: financial summary with `forecastRevenueBrl`, `operatorConfirmedRevenueBrl`, `providerVerifiedRevenueBrl`, `pendingRevenueBrl`, `lostRevenueBrl` and `ledgerPreviewCount`.
- `GET /api/ledger/previews`: all in-memory preview records.
- `GET /api/ledger/previews/:id`: one preview record.
- `POST /api/ledger/from-close-loop/:closeLoopId`: idempotently creates or updates one preview for the close loop.
- `PATCH /api/ledger/previews/:id/status`: manual-only preview status transition.

## Manual-only safety boundary

All endpoints return or preserve preview-only flags: provider APIs disabled, payment capture disabled, checkout disabled, invoice disabled, webhook disabled, external contact disabled and GitHub write disabled.

## Why operatorConfirmedRevenue is not providerVerifiedRevenue

`operatorConfirmedRevenueBrl` is an internal manual confirmation recorded after the operator reviewed proof outside GXEON. `providerVerifiedRevenueBrl` remains `0` because this phase does not connect a payment provider, webhook, checkout, invoice, wallet, payout or settlement API.

## Rollback plan

1. Remove the close-loop call to ledger sync.
2. Remove the new ledger routes for close-loop sync and manual preview status.
3. Keep the older ledger preview behavior for release previews.
4. Rebuild API and dashboard.

## Manual QA checklist

1. Open `/ops/revenue-close-loop`.
2. Confirm R$100 manually with `providerVerified=false`.
3. Check the response includes `ledgerPreviewId`.
4. Open `/ops/ledger`.
5. Confirm Operator confirmed shows R$100 and Provider verified shows R$0.
6. Open `/ops/r100-war-room` and `/ops/brain`.
7. Confirm manual revenue is labeled as manual/operator confirmed only.

## Next suggested phase

`GXEON_R100_PROVIDER_READY_GATE_P3`: prepare a provider-ready approval gate without connecting payment APIs.
