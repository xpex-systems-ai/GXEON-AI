# GXEON Manual Payment Request Center P0

Manual Payment Request Center P0 is a manual-first monetization handoff. It converts a delivery workspace or manual offer into copy-only Pix/Mercado Pago-style instructions, proof checklist, manual confirmation checklist, non-fiscal receipt draft, and ledger preview.

## API contracts

- `GET /api/manual-payment/status`
- `GET /api/manual-payment/requests`
- `GET /api/manual-payment/requests/:id`
- `POST /api/manual-payment/requests`
- `POST /api/manual-payment/from-delivery-workspace/:id`
- `PATCH /api/manual-payment/requests/:id/state`
- `POST /api/manual-payment/requests/:id/proof-checklist-preview`
- `POST /api/manual-payment/requests/:id/receipt-draft-preview`
- `POST /api/manual-payment/requests/:id/ledger-preview`
- `POST /api/delivery-workspace/workspaces/:id/manual-payment-request-preview`

Every response remains preview-only and includes `paymentProviderDisabled: true`, `realRevenueClaimed: false`, and `paymentNotGuaranteed: true`.

## Manual test flow

Open `/ops/manual-payment`, create a R$100 Pix manual request, copy PT-BR text, preview proof checklist, preview ledger, move status to waiting and proof received, then verify the ledger remains preview revenue only.
