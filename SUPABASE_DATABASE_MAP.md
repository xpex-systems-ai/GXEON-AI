# SUPABASE_DATABASE_MAP.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive database verdict

**Status:** YELLOW — connect only after schema corrections.

The current repository contains a solid **financial foundation schema** for wallet, transaction, payment attempt, ledger, and webhook idempotency persistence. It does **not** yet contain every table consumed by the GXEON web/mobile Supabase clients, and no RLS policy SQL is present in the committed schema.

## 2. Current committed database foundation

Source of truth audited:

- `lib/db/src/schema/financial.ts`
- `lib/db/drizzle/0000_financial_foundation.sql`
- `lib/db/drizzle/meta/_journal.json`
- `server/runtime/financialDb.cjs`

### 2.1 Enums

| Enum | Values | Purpose |
|---|---|---|
| `transaction_status` | `PENDING`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`, `REFUNDED` | Payment lifecycle for `global_transactions`. |
| `payment_attempt_status` | `CREATED`, `PENDING`, `APPROVED`, `FAILED`, `EXPIRED`, `REFUNDED`, `CANCELED` | Provider-level payment attempt lifecycle. |
| `wallet_status` | `ACTIVE`, `SUSPENDED`, `CLOSED` | Wallet availability state. |
| `ledger_entry_type` | `CREDIT`, `DEBIT`, `TRANSFER`, `HOLD`, `RELEASE`, `REFUND`, `COMMISSION`, `PAYOUT`, `ADJUSTMENT` | Financial ledger movement type. |
| `ledger_source_type` | `PAYMENT`, `COMMISSION`, `TASK`, `SUBSCRIPTION`, `MANUAL`, `REFUND` | Origin category for ledger entries. |
| `webhook_processing_status` | `RECEIVED`, `PROCESSED`, `DUPLICATE`, `REJECTED`, `FAILED` | Webhook ingestion state. |

### 2.2 Tables implemented in Drizzle

| Table | Primary purpose | Key columns | Read/write runtime dependency |
|---|---|---|---|
| `actor_wallets` | Balance and credit wallet per GXEON actor. | `id`, `actor_id`, `actor_code`, `currency`, `balance`, `credit_limit`, `total_spent`, `total_earned`, `status`, `metadata`, timestamps. | `financialDb.applyApprovedPayment`, dashboards, commissions pages. |
| `global_transactions` | Canonical transaction/payment records. | `transaction_id`, `actor_id`, `actor_code`, `base_amount`, `currency`, `status`, `gateway_provider`, `external_reference`, `provider_payment_id`, timestamps, `metadata`. | Payment runtime, dashboard metrics, transaction list, health check. |
| `payment_attempts` | Provider attempt records for a transaction. | `transaction_id`, `provider`, `provider_payment_id`, `status`, `amount`, `idempotency_key`, PIX QR/copy-paste fields, provider payloads. | Payment creation and provider reconciliation. |
| `financial_ledger` | Immutable-ish ledger entries for payments, commissions, subscriptions, tasks, and adjustments. | `ledger_entry_id`, `actor_id`, `wallet_id`, `transaction_id`, `payment_attempt_id`, `entry_type`, `source_type`, `source_id`, `amount`, `balance_after`, `idempotency_key`, `metadata`. | Credit settlement and approved payment accounting. |
| `payment_webhook_events` | Webhook event idempotency and audit trail. | `provider`, `provider_event_id`, `provider_payment_id`, `event_type`, `action`, `signature`, `idempotency_key`, `processing_status`, raw/normalized payloads. | Mercado Pago webhook duplicate detection and processing audit. |

## 3. Relationships and referential map

| Relationship | Constraint behavior | Readiness |
|---|---|---|
| `payment_attempts.transaction_id -> global_transactions.transaction_id` | `ON DELETE CASCADE` | Ready for attempts owned by a transaction. |
| `financial_ledger.wallet_id -> actor_wallets.id` | `ON DELETE SET NULL` | Ready for ledger retention after wallet lifecycle changes. |
| `financial_ledger.transaction_id -> global_transactions.transaction_id` | `ON DELETE SET NULL` | Ready for retaining ledger entries independent of transaction cleanup. |
| `financial_ledger.payment_attempt_id -> payment_attempts.id` | `ON DELETE SET NULL` | Ready for retaining ledger entries independent of attempt cleanup. |

## 4. Index and constraint map

### 4.1 Unique constraints/indexes

| Table | Unique index | Purpose |
|---|---|---|
| `actor_wallets` | `actor_wallets_actor_id_uq` | One wallet per actor. |
| `global_transactions` | `global_transactions_transaction_id_uq` | Stable internal payment id. |
| `global_transactions` | `global_transactions_external_reference_uq` | Provider/order idempotency. |
| `payment_attempts` | `payment_attempts_idempotency_key_uq` | Provider attempt idempotency. |
| `financial_ledger` | `financial_ledger_ledger_entry_id_uq` | Ledger identity. |
| `financial_ledger` | `financial_ledger_idempotency_key_uq` | Ledger idempotency. |
| `payment_webhook_events` | `payment_webhook_events_idempotency_key_uq` | Webhook replay protection. |
| `payment_webhook_events` | `payment_webhook_events_provider_event_uq` | Provider event uniqueness by provider/event/type. |

### 4.2 Query indexes

| Table | Indexes |
|---|---|
| `actor_wallets` | `actor_code`, `status` |
| `global_transactions` | `actor_id`, `actor_code`, `status`, `provider_payment_id`, `created_at` |
| `payment_attempts` | `transaction_id`, `provider_payment_id`, `status`, `created_at` |
| `financial_ledger` | `actor_id`, `wallet_id`, `transaction_id`, `(source_type, source_id)`, `created_at` |
| `payment_webhook_events` | `provider_payment_id`, `processing_status`, `received_at` |

## 5. GXEON tables consumed but not committed in schema

Static frontend/mobile audit found Supabase reads/writes against tables not present in the current Drizzle migration.

| Table referenced | Referenced by | Current schema status | Required action before real connection |
|---|---|---|---|
| `actors` | Web dashboard and mobile dashboard/actors screens. | Missing. | Add canonical actor profile table or update clients to use existing actor sources. |
| `api_keys` | Web/mobile API key pages; web update status action. | Missing. | Add API key table with owner, status, scopes, secret hash, timestamps, RLS, and no raw key storage. |
| `revenue_events` | Web/mobile revenue pages. | Missing. | Add event table or route revenue UI through API server/runtime snapshots. |
| `marketplace_datasets` | Web/mobile dataset pages. | Missing. | Add marketplace dataset catalog table. |
| `dataset_purchases` | Web/mobile dataset revenue aggregation. | Missing. | Add dataset purchase table tied to actor/user and payment status. |
| `transactions` | Web topbar realtime channel. | Missing and semantically overlaps `global_transactions`. | Replace with `global_transactions` or create a compatibility view named `transactions` with RLS-safe projection. |

## 6. Database readiness findings

### Passes

- Financial persistence has typed Drizzle schema, generated SQL, and migration journal registration.
- Core payment runtime is prepared for PostgreSQL via `DATABASE_URL` and uses parameterized SQL.
- Idempotency exists at payment attempt, ledger, and webhook-event layers.
- Financial tables use indexes aligned with expected dashboard and webhook query patterns.

### Gaps

- No committed SQL for RLS enabling or policies.
- No Supabase auth user ownership columns on financial tables (`user_id`, `owner_id`, or `tenant_id`). Existing ownership is actor-oriented (`actor_id`, `actor_code`).
- Dashboard/mobile table expectations exceed the committed schema.
- `transactions` vs `global_transactions` naming is inconsistent.
- No migration exists for Supabase-specific realtime publication configuration.

## 7. Required database corrections before connection

1. Decide canonical table naming: prefer `global_transactions` and update `Topbar` away from `transactions`, or create a read-only `transactions` compatibility view.
2. Add missing tables: `actors`, `api_keys`, `revenue_events`, `marketplace_datasets`, `dataset_purchases`.
3. Add ownership columns required for RLS: recommended `owner_user_id uuid references auth.users(id)` where user-owned, and `actor_id` for actor-scoped business rows.
4. Add RLS policy migration in a new file after design approval; do not run it until Mission 04 is approved.
5. Add Supabase publication/realtime plan for only low-risk tables/channels.

## 8. Readiness score

**Database score:** 68 / 100

- +35 financial schema coverage
- +15 constraints/indexes/idempotency
- +10 PostgreSQL runtime adapter
- +8 migration artifacts present
- -20 missing dashboard/mobile tables
- -15 missing RLS policies
- -5 inconsistent `transactions` naming

**Decision:** YELLOW — not blocked forever, but real Supabase connection should wait for table/RLS alignment.
