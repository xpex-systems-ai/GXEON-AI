# GXEON_PHASE04_REAL_REVENUE_PLAN

## Scope

This plan prepares the financial runtime foundation for real PIX revenue without changing frontend, dashboard UI, or existing runtime business logic. The implementation in this phase is limited to persistent PostgreSQL/Drizzle schema and migration assets plus a replacement map for the next phase.

## New Persistent Financial Schema

The Drizzle schema now exposes five production financial tables from `lib/db/src/schema/financial.ts`:

1. `global_transactions` — canonical checkout/charge record shared by the dashboard and payment provider adapters.
2. `payment_attempts` — provider-level Mercado Pago PIX attempts with QR/copy-paste/ticket fields and raw provider payloads.
3. `financial_ledger` — immutable credit/debit ledger entries with source references and idempotency keys.
4. `actor_wallets` — durable actor balances, limits, totals, and wallet status.
5. `payment_webhook_events` — durable webhook event inbox with provider event identity, signature, raw payload, processing status, and idempotency key.

The schema includes enums for transaction status, payment attempt status, wallet status, ledger entry/source types, and webhook processing status.

## Migration Files

Generated Drizzle migration artifacts:

- `lib/db/drizzle/0000_financial_foundation.sql`
- `lib/db/drizzle/meta/0000_snapshot.json`
- `lib/db/drizzle/meta/_journal.json`

The migration creates all enums, tables, foreign keys, uniqueness constraints, and runtime indexes needed for the initial real-revenue foundation.

## Replacement Map: runtime-memory.json to PostgreSQL/Supabase

| Current local state | Current writer/reader | New table | Replacement approach |
| --- | --- | --- | --- |
| `mem.payments` | `server/runtime/paymentRuntime.cjs` and `server/runtime/mercadoWebhookRuntime.cjs` | `global_transactions`, `payment_attempts` | Persist one canonical transaction plus one or more provider attempts. Keep local return shape until callers are migrated. |
| `mem.credit_wallets` | `server/runtime/creditRuntime.cjs` | `actor_wallets` | Replace wallet read/write helpers with DB queries and row-level transactions. |
| `mem.credit_ledger` | `server/runtime/creditRuntime.cjs` | `financial_ledger` | Insert immutable ledger rows inside the same DB transaction that updates `actor_wallets`. |
| `mem.webhook_processed_ids` | `server/runtime/mercadoWebhookRuntime.cjs` | `payment_webhook_events` | Enforce unique `idempotency_key`; mark duplicates as `DUPLICATE` instead of relying on an in-memory set. |
| `mem.financial_events` | `server/runtime/mercadoWebhookRuntime.cjs` | `payment_webhook_events`, `financial_ledger` | Store raw webhook in the event inbox, then create ledger entries only after verified approval. |
| `mem.pending_pix_followups` | `server/runtime/mercadoWebhookRuntime.cjs` and `server/runtime/autonomousRevenueScheduler.cjs` | follow-up table in a later P1 migration | Keep local follow-up behavior until the P0 payment path is persistent. |
| `mem.revenue_notifications` | `server/runtime/mercadoWebhookRuntime.cjs` | derived from `global_transactions`, `financial_ledger` | Generate revenue notifications from persistent events rather than storing notification state. |
| `mem.commission_settlements` | `server/runtime/commissionEngine.cjs` | later `commission_settlements` migration | Keep local for this phase; migrate after the P0 PIX charge and ledger path is stable. |
| `mem.subscriptions`, `mem.subscription_events` | `server/runtime/subscriptionRuntime.cjs` | later `subscriptions`, `subscription_events` migration | Keep local for this phase; activate persistent subscriptions after payment approval persistence is stable. |

## Runtime Impact

- No frontend or dashboard UI files were changed.
- No existing runtime business logic was changed in this phase.
- Existing JSON-memory behavior remains active until the next implementation phase wires DB repositories into payment, webhook, credit, and ledger functions.
- The new schema can be consumed by future adapters without changing public route contracts immediately.
- `@workspace/db` now exports financial table objects, insert/select Zod schemas, and inferred TypeScript types for payment and ledger persistence.

## Estimated Execution Order

### P0.1 — Schema and migration foundation

1. Apply `0000_financial_foundation.sql` to staging PostgreSQL/Supabase.
2. Confirm the migration can create or reuse the `pgcrypto` extension for `gen_random_uuid()`.
3. Validate indexes/unique constraints by inserting one pending PIX transaction and one payment attempt.

### P0.2 — Repository layer

1. Add DB repository functions for `global_transactions`, `payment_attempts`, `actor_wallets`, `financial_ledger`, and `payment_webhook_events`.
2. Keep adapters behind the current runtime function signatures to avoid route/UI changes.
3. Add idempotent upsert helpers for transaction and webhook event creation.

### P0.3 — Mercado Pago PIX adapter

1. Add a Mercado Pago adapter that creates a real PIX payment attempt and returns provider payment id, QR code/copy-paste payload, and ticket URL.
2. Persist the provider response into `payment_attempts.raw_provider_response`.
3. Link provider payment id back to `global_transactions.provider_payment_id`.

### P0.4 — Webhook persistence

1. Capture the raw request body for `/api/v1/webhooks/mercado-pago`.
2. Require `MERCADO_PAGO_WEBHOOK_SECRET` in production.
3. Insert every webhook into `payment_webhook_events` before mutating transaction or wallet state.
4. Use unique idempotency keys to make webhook replay safe.

### P0.5 — Ledger activation

1. On approved PIX, update `global_transactions.status` to `PAID`.
2. Insert a `financial_ledger` credit entry.
3. Update `actor_wallets.balance` in the same database transaction.
4. Keep subscription/commission migration as P1 unless needed for the first paid product.

## Exit Criteria for Real PIX Readiness

- A real Mercado Pago PIX charge creates rows in `global_transactions` and `payment_attempts`.
- A valid Mercado Pago webhook creates a row in `payment_webhook_events` and marks duplicate deliveries safely.
- An approved payment updates `global_transactions`, inserts `financial_ledger`, and updates `actor_wallets` transactionally.
- The runtime can stop relying on `runtime-memory.json` for payment approval, credit activation, and revenue ledger state.
