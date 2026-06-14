# GXEON Client Offer Send Checklist P0

Client Offer Send Checklist P0 is a manual-first, copy-only workspace for converting Manual Payment Requests, Delivery Workspaces, GitHub Demand Conversion Packs, or direct manual offers into operator-reviewed client offer packs.

## Purpose
- Prepare PT-BR and EN-US short/full offer messages.
- Provide manual send, proof-of-send, follow-up, and delivery promise checklists.
- Preview ledger/payment readiness without claiming revenue.
- Route operators to send manually outside GXEON.

## API contracts
- `GET /api/client-offer-send/status`
- `GET /api/client-offer-send/packs`
- `GET /api/client-offer-send/packs/:id`
- `POST /api/client-offer-send/packs`
- `POST /api/client-offer-send/from-manual-payment/:id`
- `POST /api/client-offer-send/from-delivery-workspace/:id`
- `PATCH /api/client-offer-send/packs/:id/state`
- `POST /api/client-offer-send/packs/:id/proof-of-send-preview`
- `POST /api/client-offer-send/packs/:id/follow-up-preview`
- `POST /api/client-offer-send/packs/:id/ledger-preview`
- `POST /api/manual-payment/requests/:id/client-offer-preview`

Every response includes `autoSendDisabled: true`, `externalContactDisabled: true`, `paymentProviderDisabled: true`, `realRevenueClaimed: false`, and `rewardNotGuaranteed: true`.

## Manual test flow
1. Open `/ops/manual-payment`.
2. Create an R$100 manual payment request.
3. Verify the action result panel is readable.
4. Click **Create Client Offer Pack Preview**.
5. Open `/ops/client-offers`.
6. Copy PT-BR short/full messages.
7. Mark sent manually, waiting response, and create follow-up/ledger previews.
8. Verify no external message or payment provider call occurred.

## Rollback
Remove the client offer route registration, client offer frontend route/sidebar entry, and in-memory `clientOffer` source files. Because persistence is `IN_MEMORY_P0`, no database rollback is required.
