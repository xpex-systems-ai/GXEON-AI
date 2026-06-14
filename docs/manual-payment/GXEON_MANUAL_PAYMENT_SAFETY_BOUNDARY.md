# Manual Payment Safety Boundary

P0 does not call Mercado Pago, Stripe, checkout APIs, invoice APIs, webhooks, email, WhatsApp, Telegram, Twilio, workers, schedulers, or external customer contact automations.

Operator-provided payment links are stored only as display URLs labeled `OPERATOR_PROVIDED_MANUAL_LINK`. Pix key labels are display labels, not secrets. Proof is manually verified outside GXEON. The receipt draft is not a fiscal invoice. Ledger previews are expected-payment previews and are not confirmed revenue.

Rollback: remove the `/api/manual-payment` router mount, dashboard `/ops/manual-payment` route, and the in-memory manual payment files. No database migration or external provider cleanup is required.
