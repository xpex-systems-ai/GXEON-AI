# Client Offer Send Safety Boundary

Client Offer Send P0 is strictly `PREVIEW_ONLY` and `COPY_ONLY`.

## Disabled actions
- No automatic email, WhatsApp, Telegram, LinkedIn, or GitHub messages.
- No scraping, lead harvesting, or recipient validation.
- No Mercado Pago, Stripe, checkout, invoice, capture, or webhook call.
- No GitHub issue, comment, PR, or write action.
- No real revenue confirmation and no provider verification.
- No secrets, card data, tokens, workers, schedulers, or database persistence.

## Manual statuses
- `DRAFT`
- `READY_TO_COPY`
- `SENT_MANUALLY`
- `WAITING_RESPONSE_MANUAL`
- `ACCEPTED_MANUALLY`
- `DECLINED_MANUALLY`
- `PAYMENT_PROOF_RECEIVED_MANUAL`
- `MANUAL_REVIEW_REQUIRED`
- `ARCHIVED`

Revenue remains preview-only until the operator confirms payment outside GXEON and outside this P0 layer.
