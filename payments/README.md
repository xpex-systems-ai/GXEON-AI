# payments

Domain reserved for GXEON core restructure protocol.

## Mercado Pago production PIX setup

Real PIX checkout creation is intentionally environment-driven. Do **not** commit access tokens, client secrets, CPF, e-mail PIX keys, or random PIX keys into this repository.

1. Copy `payments/mercado-pago-production.env.example` into your deployment secret manager.
2. Configure at least:
   - `DATABASE_URL`
   - `MERCADO_PAGO_ACCESS_TOKEN` using the production `APP_USR-...` token
3. Configure `MERCADO_PAGO_NOTIFICATION_URL` to point to `/api/v1/webhooks/mercado-pago` so paid PIX events reconcile automatically.
4. Optionally configure `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET`, `MERCADO_PAGO_PIX_KEY`, and `MERCADO_PAGO_DEFAULT_PAYER_EMAIL` for masked readiness visibility and automated X-Radar checkout tests.
5. Run `pnpm mercado:check` before enabling live traffic. The command prints masked credentials only.

The dashboard Revenue Engine page reads the masked readiness payload and can generate real Mercado Pago PIX checkouts once the required environment variables are active.
