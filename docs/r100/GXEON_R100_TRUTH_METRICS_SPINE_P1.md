# GXEON R$100 Truth Metrics Spine P1

## Purpose
The R$100 Truth Metrics Spine centralizes the manual-first monetization state used by the Topbar, Sidebar, Operator Assistant, War Room, Brain and Ledger UI. It gives the operator one runtime summary for prospects, offers, manual payment requests, close loops, ledger previews, execution packs, delivery workspaces, open handoffs and the next official step.

## Safety model
This mission is strict preview-only. The spine reads in-memory stores only, never mutates source stores, never calls payment providers, never creates checkout sessions or invoices, never registers webhooks, never auto-sends external messages, never writes to GitHub and never scrapes.

## Revenue terminology
- `forecastRevenueBrl`: forecast/manual preview value in BRL.
- `operatorConfirmedRevenueBrl`: value the operator manually confirmed after external proof review. This is an internal preview/accounting value only.
- `providerVerifiedRevenueBrl`: provider-settled or provider-verified value. It remains `0` in P1 by policy.
- `pendingRevenueBrl`: value still pending manual review.
- `lostRevenueBrl`: value marked lost/cancelled.

`operatorConfirmedRevenueBrl` may be shown to the operator as manual progress. It must not be presented as fiscal receipt, provider settlement or real provider-verified revenue. `providerVerifiedRevenueBrl` remains `0` because this mission explicitly forbids payment provider APIs, checkout, invoices and webhooks.

## Summary fields
The `/api/r100-truth/summary` response includes counts for `prospectsCount`, `clientOfferPacksCount`, `manualPaymentRequestsCount`, `closeLoopsCount`, `ledgerPreviewCount`, `executionPacksCount`, `deliveryWorkspaceCount`, and `openHandoffsCount`; flow fields for `currentOfficialStep`, `nextOfficialStep`, `currentRoute`, `nextRoute`, `nextManualAction`; display fields for `revenueDisplayLabel`, `revenueDisplayValue`, `revenueDisplayQualifier`, `revenueSafetyLabel`, `nextActionButtonLabel`; and safety flags for manual-first preview-only operation.

## Endpoints
- `GET /api/r100-truth/status`
- `GET /api/r100-truth/summary`
- `GET /api/r100-truth/topbar`
- `GET /api/r100-truth/sidebar`

All endpoints set `Cache-Control: no-store` and return safe fallback data on errors.

## Rollback plan
1. Remove the `r100TruthRouter` mount from `artifacts/api-server/src/routes/index.ts`.
2. Remove `artifacts/api-server/src/r100Truth` and `artifacts/api-server/src/routes/r100Truth.ts`.
3. Revert Topbar/Sidebar to previous workflow/static data.
4. Remove the dashboard R$100 truth service and hook.
5. Revert the operator workflow ledger preview count import if needed.
