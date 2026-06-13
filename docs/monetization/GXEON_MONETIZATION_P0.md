# GXEON Monetization P0

Monetization P0 is a preview-only, manual-first runtime layer. It connects the dashboard monetization board to Ledger P0 readiness without creating checkout sessions, payment captures, invoices, receipts, customer contact, provider calls, database persistence, workers, or schedulers.

## Runtime role

- `GET /api/monetization/status` reports `MONETIZATION_RUNTIME_READY` with `mode: PREVIEW_ONLY`.
- `GET /api/monetization/offers` returns static microtask offer templates and checkout readiness.
- Every response includes the P0 safety flags: `paymentProvidersConnected: false`, `captureEnabled: false`, `checkoutSessionCreationEnabled: false`, `invoiceDisabled: true`, `realRevenueClaimed: false`, and `approvalRequired: true`.

## Ledger P0 relationship

The runtime reads the in-memory Ledger P0 summary to expose `counts.ledgerPreviewEvents`. Ledger records remain forecasts/previews only and received revenue remains zero.

## Microtask offer templates

The template registry exposes internal preview-only offer templates for:

- GitHub repository audits.
- Vercel/Railway deploy rescue.
- Supabase RLS safety audits.
- AI Ops agent workflow setup.

Templates are not client offers. They include no checkout URL, no payment link, and require manual approval.

## API contracts

### `GET /api/monetization/status`

Returns `{ success: true, data }` where `data.status` is `MONETIZATION_RUNTIME_READY`, payment providers are `NOT_CONNECTED`, counts are preview counts, and the first-revenue path is `Opportunity -> Proposal -> Task -> Evidence -> Ledger Preview -> Manual Payment Review`.

### `GET /api/monetization/offers`

Returns `{ success: true, data }` where `data.registeredOffers` is empty, `data.templates` contains the static registry, and `data.checkoutReadiness.status` is `NOT_CONNECTED`.

## Future stage

Future payment provider integration must be a separately approved stage with backend-only credentials, explicit operator approval, test-mode validation, webhook verification, and updated safety documentation before any provider connection is enabled.
