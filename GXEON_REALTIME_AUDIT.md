# GXEON Realtime Audit — Mission 04A Supabase Remediation Protocol

**Date:** 2026-06-02  
**Scope:** static/local audit only; no Supabase realtime connection or publication changes.

## 1. Executive verdict

**Realtime Readiness after local remediation:** **93 / 100**

The main realtime mismatch was corrected locally: the dashboard topbar no longer subscribes to the missing `transactions` table and now uses the canonical `global_transactions` table with `base_amount`. Future production activation still requires RLS-safe realtime publication design.

## 2. Realtime consumers

| Consumer | Before remediation | After remediation | Status |
|---|---|---|---|
| Web dashboard topbar revenue total | Selected `transactions.amount`; subscribed to `transactions` | Selects `global_transactions.base_amount`; subscribes to `global_transactions` | Corrected locally |
| Dashboard transaction pages | Reads `global_transactions` | No change needed | Aligned |
| Mobile transaction pages | Reads `global_transactions` | No change needed | Aligned |
| Local GXEON websocket gateway | Runtime-local event gateway | No Supabase dependency introduced | Safe |

## 3. Approved realtime sources

| Source | Event types | Client role | Purpose | Notes |
|---|---|---|---|---|
| `global_transactions` | `INSERT`, `UPDATE` | Authenticated scoped actor/operator | Dashboard revenue and payment status refresh | Must be RLS scoped. |
| `actor_wallets` | `UPDATE` | Authenticated scoped actor/operator | Balance/commission refresh | No direct writes. |
| `revenue_events` | `INSERT` | Authenticated scoped actor/operator | Revenue timeline | Prefer append-only model. |
| `marketplace_datasets` | `INSERT`, `UPDATE` | Anon/auth for public metadata only | Marketplace cards | Avoid exposing private storage paths. |
| `dataset_purchases` | `INSERT`, `UPDATE` | Authenticated buyer/owner | Purchase status | Scope by buyer/owner. |

## 4. Blocked realtime sources

| Source | Reason |
|---|---|
| `payment_webhook_events` | Contains provider payload/audit internals. Backend only. |
| `payment_attempts` | May contain PIX/provider payload details. Use backend-safe status projections if needed. |
| `api_keys` | Security-sensitive operational metadata. Poll server endpoint or tightly scoped metadata view only. |
| `financial_ledger` raw table | Prefer dashboard view/projection to avoid overexposure. |

## 5. Publication strategy for future activation

1. Keep `supabase_realtime` publication limited to approved tables/views only.
2. Validate every realtime table has RLS enabled before adding it to publication.
3. Prefer `REPLICA IDENTITY DEFAULT`; use `FULL` only when updates need previous values and RLS review approves it.
4. Subscribe with exact table names, not wildcard client patterns.
5. Keep local websocket gateway as internal runtime telemetry path; do not mix provider secrets or webhook payloads into Supabase realtime.

## 6. Future test matrix

| Test | Expected result |
|---|---|
| Authenticated actor subscribes to own `global_transactions` | Receives own transaction changes only. |
| Authenticated actor subscribes to another actor's transaction | No payload delivered. |
| Anon subscribes to `global_transactions` | Denied/no payload. |
| Authenticated buyer subscribes to own `dataset_purchases` | Receives own purchase updates only. |
| Client attempts `payment_webhook_events` subscription | Denied/not published. |
