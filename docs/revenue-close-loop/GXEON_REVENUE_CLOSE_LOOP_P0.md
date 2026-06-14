# GXEON Revenue Close Loop P0

## Overview
Manual-first R$100 close loop connecting Prospect -> Oferta -> Envio Manual -> Resposta -> Pagamento Manual -> Evidência -> Ledger. Persistence is in-memory P0 only.

## API contracts
- `GET /api/revenue-close-loop/status`
- `GET /api/revenue-close-loop/summary`
- `GET /api/revenue-close-loop/loops`
- `GET /api/revenue-close-loop/loops/:id`
- `POST /api/revenue-close-loop/from-prospect/:prospectId`
- `POST /api/revenue-close-loop/from-offer/:offerId`
- `POST /api/revenue-close-loop/from-payment/:paymentRequestId`
- `PATCH /api/revenue-close-loop/loops/:id/status`
- `POST /api/revenue-close-loop/loops/:id/proof-checklist-preview`
- `POST /api/revenue-close-loop/loops/:id/confirm-revenue-manually`
- `POST /api/revenue-close-loop/loops/:id/ledger-preview`
- `POST /api/revenue-close-loop/loops/:id/next-action-preview`

## Manual close-loop flow
The operator selects or creates a prospect, creates a loop, copies an offer, sends externally, marks response, prepares manual payment copy, receives non-sensitive proof, then explicitly confirms revenue.

## Status model
DRAFT, PROSPECT_SELECTED, OFFER_READY_TO_COPY, OFFER_SENT_MANUALLY, WAITING_RESPONSE_MANUAL, ACCEPTED_MANUALLY, DECLINED_MANUALLY, PAYMENT_REQUEST_READY, PAYMENT_REQUEST_SENT_MANUALLY, WAITING_MANUAL_PAYMENT, PAYMENT_PROOF_RECEIVED_MANUALLY, OPERATOR_CONFIRMED_REVENUE, ARCHIVED_MANUALLY.

## Operator-confirmed revenue rules
Revenue confirmation requires amount > 0, approved manual payment method, operator confirmation true, and providerVerified false. Sensitive Pix, card, webhook, wallet, customer or proof image content must not be stored.

## Ledger preview behavior
Ledger preview separates preview revenue from operator-confirmed revenue and always keeps providerVerified=false and paymentGuaranteed=false.

## Rollback plan
Remove the route mount, delete the revenueCloseLoop domain folder and dashboard page/components/service, then rebuild API and dashboard.
