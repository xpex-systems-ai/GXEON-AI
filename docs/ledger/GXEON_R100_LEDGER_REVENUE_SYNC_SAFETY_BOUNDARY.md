# Safety Boundary — R$100 Ledger Revenue Sync P2

This mission is `MANUAL_FIRST_PREVIEW_ONLY`.

## Forbidden actions

- No Mercado Pago, Stripe, PayPal, wallet, checkout, invoice, webhook, capture, charge, settlement or payout API calls.
- No email, WhatsApp, Telegram, SMS, GitHub issue/comment/PR runtime writes or external client contact automation.
- No secret, Pix key, customer private data or sensitive proof file storage.
- No workers, schedulers, cron jobs, queues or autonomous agents.

## Required invariant values

- `providerVerified=false`.
- `paymentGuaranteed=false`.
- `realRevenueClaimed=false`.
- `providerVerifiedRevenueBrl=0`.
- `receiptType=NON_FISCAL_PREVIEW_ONLY`.
- `manualProofRequired=true`.

## Interpretation

Ledger preview records are internal operational previews. They are not accounting records, fiscal receipts, invoices, provider settlements, payment captures or proof that money was received by a provider.
