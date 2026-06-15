# GXEON R$100 Live State Invalidation P1

## Truth refresh event

The dashboard uses `GXEON_R100_TRUTH_REFRESH` as a browser-local event bus. Safe manual action handlers dispatch the event after a successful backend response. Consumers of `useR100TruthSummary` subscribe to the event and refresh `GET /api/r100-truth/summary` without reloading the page.

The event payload is metadata-only: `reason`, `source`, `timestamp`, `route`, optional `entityId`, and `safe: true`. It never performs external calls, never stores secrets, and never creates payment/provider resources.

## Safe event sources

- `prospects`
- `client_offers`
- `manual_payment`
- `revenue_close_loop`
- `operator_assistant`

## R$100 truth endpoints

- `GET /api/r100-truth/status`
- `GET /api/r100-truth/summary`
- `GET /api/r100-truth/topbar`
- `GET /api/r100-truth/sidebar`

All truth endpoints set `Cache-Control: no-store, max-age=0` and preserve safe fallback behavior.

## Revenue semantics

`operatorConfirmedRevenueBrl` means the operator manually recorded an external proof/revenue state. It is not provider-settled, not captured by GXEON, and not payment-provider verified. `providerVerifiedRevenueBrl` must remain `0` unless a future explicit provider-verification project adds a safe approved integration.

## Route consistency

Official R$100 step 4 is **Revenue Sprint** and routes to `/ops/revenue-sprint`. The legacy `/ops/monetization` route can remain available for non-official monetization views, but it is not the official step 4 route.

## Safety boundaries

- Manual-first and preview-only.
- No auto-send, email, WhatsApp, Telegram, or external contact.
- No checkout, invoice, payment intent/session, webhook, or provider payment API.
- No GitHub runtime write/comment/issue/PR.
- No scraping or crawler.
- No frontend secret persistence.

## Rollback plan

1. Remove imports/usages of `dispatchR100TruthRefresh` and `subscribeR100TruthRefresh`.
2. Remove `artifacts/gxeon-dashboard/src/lib/r100TruthEvents.ts`.
3. Revert the R$100 step 4 truth route only if `/ops/revenue-sprint` becomes unavailable; document any temporary fallback.
4. Keep `fallbackR100TruthSummary` behavior intact so backend outages continue showing SAFE R$0/provider-not-verified state.
