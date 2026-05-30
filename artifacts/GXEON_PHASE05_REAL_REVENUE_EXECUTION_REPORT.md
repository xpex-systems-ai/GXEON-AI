# GXEON_PHASE05_REAL_REVENUE_EXECUTION_REPORT

## Objective

Substitute the local-only financial simulation with a production PIX execution path capable of persisting `payment.approved` into PostgreSQL/Supabase.

## Files Changed

- `server/runtime/mercadoPagoAdapter.cjs` — real Mercado Pago HTTP adapter with `createPixCharge` and `getPaymentStatus`.
- `server/runtime/financialDb.cjs` — PostgreSQL persistence layer for transactions, attempts, webhook inbox, wallet crediting, and ledger insertion.
- `server/runtime/paymentRuntime.cjs` — real PIX creation path requiring `DATABASE_URL` and `MERCADO_PAGO_ACCESS_TOKEN`, persisting `global_transactions` and `payment_attempts`.
- `server/runtime/mercadoWebhookRuntime.cjs` — production webhook signature validation, duplicate protection, status lookup, transaction update, ledger insert, wallet credit, and subscription activation bridge.
- `server/runtime/paymentOrchestrator.cjs` and `server/runtime/autonomousRevenueScheduler.cjs` — async payment creation compatibility for the real PIX path.
- `artifacts/api-server/src/app.ts` — raw JSON body capture for webhook signature validation.
- `artifacts/api-server/src/routes/runtime.ts` — async payment/webhook endpoints with production error handling.
- `artifacts/GXEON_MONETIZATION_AUDIT.md` — updated audit status after Phase 05 execution.

## Environment Required

P0 production execution requires:

- `DATABASE_URL` — PostgreSQL/Supabase connection string with the Phase 04 financial migration applied.
- `MERCADO_PAGO_ACCESS_TOKEN` — server-side Mercado Pago access token.
- `MERCADO_PAGO_WEBHOOK_SECRET` — webhook secret used to validate `x-signature`.
- `MERCADO_PAGO_DEFAULT_PAYER_EMAIL` or request-level `payer.email` — required by Mercado Pago PIX creation.

Optional:

- `MERCADO_PAGO_NOTIFICATION_URL` — explicit webhook URL sent in Mercado Pago payment creation.
- `MERCADO_PAGO_API_BASE` — override for Mercado Pago API base, defaults to `https://api.mercadopago.com`.
- `ALLOW_UNSIGNED_MP_WEBHOOKS=true` — development-only bypass for unsigned webhook tests.

## Migration Required

Apply before first production charge:

- `lib/db/drizzle/0000_financial_foundation.sql`

The runtime now writes to:

- `global_transactions`
- `payment_attempts`
- `payment_webhook_events`
- `actor_wallets`
- `financial_ledger`

## Execution Flow

1. `POST /api/v1/runtime/payments/create` calls `createPixPayment`.
2. `createPixPayment` validates envs, inserts/updates `global_transactions`, calls Mercado Pago `/v1/payments`, inserts `payment_attempts`, and returns `provider_payment_id`, `qrCode`, `qrCodeBase64`, `copyPastePix`, and `ticketUrl`.
3. Mercado Pago sends `POST /api/v1/webhooks/mercado-pago` with `x-signature` and `x-request-id`.
4. The API uses raw body capture plus Mercado Pago manifest validation.
5. `payment_webhook_events` stores the webhook idempotently.
6. The runtime fetches provider status with `getPaymentStatus`.
7. On approved PIX, `applyApprovedPayment` marks `global_transactions` as `PAID`, credits `actor_wallets`, and inserts `financial_ledger` in one DB transaction.
8. If a valid plan is present, subscription activation is bridged through the existing subscription runtime pending P1 subscription table migration.

## Blocking Issues

- The repository cannot complete an actual approved PIX without live `DATABASE_URL`, Mercado Pago credentials, and a reachable webhook URL.
- Subscription persistence is still local and should be moved to a `subscriptions` table in P1.
- Follow-up queues and commission settlements remain local and should be migrated after the first paid PIX path is stable.
- A full integration test should run against Mercado Pago sandbox/test users after secrets are provisioned.

## Revenue Readiness Score

**Score: 82/100 — FOUNDATION_READY_ENV_BLOCKED**

- Adapter real: complete.
- Transaction persistence: complete for P0 tables.
- Webhook security: complete with secret/signature validation and idempotency inbox.
- Approval flow: complete for transaction status, ledger insertion, wallet credit, and subscription bridge.
- Remaining risk: live credentials, applied migration, webhook reachability, and sandbox/live validation.
