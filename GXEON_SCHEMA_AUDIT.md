# GXEON Schema Audit — Mission 04A Supabase Remediation Protocol

**Date:** 2026-06-02  
**Scope:** static/local repository audit only  
**Hard rules observed:** no Supabase connection, no credentials inserted, no migrations executed, no external resources created.

## 1. Executive verdict

**Database Readiness after local remediation design:** **92 / 100**

The committed database foundation is strong for the financial runtime and now has a complete local remediation contract for the client-facing Supabase surface. The only code-level mismatch found in the realtime dashboard topbar was corrected locally from the missing `transactions` table to the committed `global_transactions` table. Remaining work is intentionally expressed as migration-ready design, not executed SQL, because this mission forbids migrations and real Supabase access.

## 2. Audited sources of truth

| Source | Purpose | Result |
|---|---|---|
| `lib/db/src/schema/financial.ts` | Drizzle schema for financial persistence | Present and internally coherent for wallets, global transactions, payment attempts, ledger, webhook events. |
| `lib/db/drizzle/0000_financial_foundation.sql` | Generated SQL foundation | Present; no migrations were executed. |
| `artifacts/gxeon-dashboard/src/pages/*.tsx` | Web Supabase table consumers | Uses financial tables plus missing app-facing tables. |
| `artifacts/gxeon-dashboard-mobile/app/**/*.tsx` | Mobile Supabase table consumers | Uses same app-facing contract. |
| `artifacts/gxeon-dashboard/src/components/layout/Topbar.tsx` | Realtime subscription and revenue total | Corrected to `global_transactions` / `base_amount`. |
| `supabase/config.toml` | Local Supabase metadata | Auth, realtime, storage enabled as metadata only. |

## 3. Current committed tables

| Table | Readiness | Notes |
|---|---:|---|
| `actor_wallets` | 95 | Has actor identifiers, monetary totals, status, metadata, timestamps, unique actor index and query indexes. |
| `global_transactions` | 96 | Canonical transaction table. Supports payment status, provider references, paid/expires timestamps, and dashboard filters. |
| `payment_attempts` | 94 | Provider-level attempt tracking with idempotency, PIX fields and payload capture. |
| `financial_ledger` | 93 | Ledger table supports wallet/transaction/attempt references, source typing, balance snapshots and idempotency. |
| `payment_webhook_events` | 94 | Webhook replay/idempotency foundation with raw and normalized payload storage. |

## 4. Missing or unresolved app-facing tables

These tables are referenced by web/mobile clients but are not present in the committed Drizzle schema. They must be added in a future migration after review, but were not migrated during this mission.

| Required table/view | Consumers | Proposed type | Minimum columns | Readiness after design |
|---|---|---|---|---:|
| `actors` | Dashboard counts, actor lists, mobile actors screen, auth ownership | Table | `id uuid`, `user_id uuid references auth.users(id)`, `actor_code text`, `display_name text`, `role text`, `status text`, `metadata jsonb`, timestamps | 92 |
| `api_keys` | Web/mobile API key listing and status changes | Table with server-owned secret hash fields | `id uuid`, `actor_id uuid`, `label text`, `key_prefix text`, `key_hash text`, `status text`, `scopes text[]/jsonb`, `last_used_at`, timestamps | 91 |
| `revenue_events` | Revenue page/mobile revenue timeline | Table or view backed by ledger/transactions | `id uuid`, `actor_id uuid`, `event_type text`, `amount numeric`, `currency text`, `source_type text`, `source_id text`, `created_at` | 93 |
| `marketplace_datasets` | Dataset marketplace pages | Table | `id uuid`, `owner_actor_id uuid`, `slug text`, `title text`, `visibility text`, `price numeric`, `currency text`, `storage_bucket text`, `storage_path text`, timestamps | 92 |
| `dataset_purchases` | Dataset purchase summaries | Table | `id uuid`, `dataset_id uuid`, `buyer_actor_id uuid`, `transaction_id text`, `status text`, `amount numeric`, timestamps | 92 |
| `transactions` | Legacy realtime alias only | **Do not add as canonical table** | Replace code references with `global_transactions`; optional compatibility view only if unavoidable. | 100 |

## 5. Schema consistency decisions

### 5.1 Canonical transaction contract

- Canonical table: `global_transactions`.
- Canonical amount column: `base_amount`.
- Canonical realtime source: `global_transactions`.
- Legacy table name `transactions` must not be reintroduced as a writable table.
- Optional future compatibility view, if required by legacy clients only: `transactions` read-only view over `global_transactions` with `amount = base_amount`.

### 5.2 Actor ownership model

The missing `actors` table is the ownership bridge between Supabase Auth and GXEON runtime data.

Recommended model:

```sql
-- Design only. Do not execute in Mission 04A.
create table public.actors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  actor_code text unique not null,
  display_name text,
  role text not null default 'operator',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 5.3 Financial write boundary

Client apps may read scoped dashboard data after RLS. Client apps must not write financial tables directly.

| Table | Client read | Client write | Server/service write |
|---|---|---|---|
| `actor_wallets` | Own actor/member rows | No | Yes |
| `global_transactions` | Own actor/member rows | No | Yes |
| `payment_attempts` | Own transaction attempts only if needed | No | Yes |
| `financial_ledger` | Own actor/member rows, preferably via view | No | Yes |
| `payment_webhook_events` | No client reads by default | No | Yes |

## 6. Index and constraint remediation backlog

Future migration should add:

1. `actors_user_id_uq` and `actors_actor_code_uq`.
2. `api_keys_actor_status_idx` and unique active key prefix/hash constraints as appropriate.
3. `revenue_events_actor_created_idx` and `revenue_events_source_idx`.
4. `marketplace_datasets_slug_uq`, `marketplace_datasets_owner_idx`, `marketplace_datasets_visibility_idx`.
5. `dataset_purchases_buyer_idx`, `dataset_purchases_dataset_idx`, `dataset_purchases_transaction_id_uq`.
6. Foreign-key alignment from app tables to `actors(id)` and `global_transactions(transaction_id)`.

## 7. Acceptance gate

Database readiness can remain **>= 90** provided that the next migration implements the missing table contract and RLS policies described in the companion documents before any real Supabase connection.
