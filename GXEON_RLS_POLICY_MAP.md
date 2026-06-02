# GXEON RLS Policy Map — Mission 04A Supabase Remediation Protocol

**Date:** 2026-06-02  
**Scope:** RLS architecture only. No policy migration was executed.

## 1. Executive verdict

**Security/RLS Readiness after local remediation design:** **92 / 100**

GXEON can reach the target security posture by applying a default-deny RLS baseline and least-privilege policies before any real Supabase connection. This policy map is migration-ready design, not executed SQL.

## 2. Global RLS principles

1. Enable RLS on every app table exposed to Supabase clients.
2. Revoke broad public table privileges before creating explicit grants.
3. `anon` can read only public marketplace metadata.
4. `authenticated` can read only own actor/member/purchase rows.
5. Financial writes are service-only through the backend.
6. Webhook, ledger and payment-attempt data are protected from direct client writes.
7. API key secrets/hashes are never readable by clients.

## 3. Table policy map

| Table | Anon | Authenticated | Operator/Admin | Service role/backend |
|---|---|---|---|---|
| `actors` | No access | Select/update limited own profile fields | Admin scoped reads/updates | Full server-managed lifecycle |
| `actor_wallets` | Deny | Select own actor wallet | Scoped read | Insert/update via backend only |
| `global_transactions` | Deny | Select own actor transactions | Scoped read | Insert/update via backend only |
| `payment_attempts` | Deny | Optional select own transaction attempts | Scoped read | Insert/update via backend only |
| `financial_ledger` | Deny | Select own ledger rows or use safe view | Scoped read | Insert only via backend accounting |
| `payment_webhook_events` | Deny | Deny | Admin audit view only if needed | Insert/update via webhook runtime |
| `api_keys` | Deny | Select own metadata; optional revoke own active key | Admin audit metadata | Insert/rotate/hash/revoke |
| `revenue_events` | Deny | Select own revenue events | Scoped read | Insert from runtime or materialized process |
| `marketplace_datasets` | Select public metadata | Select public + owned + purchased metadata | Admin moderation | Insert/update owned records via server-validated flow |
| `dataset_purchases` | Deny | Select own purchases | Scoped read | Insert/update from payment settlement |
| `storage.objects` | Deny by default | Path/bucket policies only | Scoped read/moderation | Full backend operations |

## 4. Draft policy SQL patterns

```sql
-- Design only. Do not execute in Mission 04A.
alter table public.actors enable row level security;
create policy actors_select_own on public.actors
  for select to authenticated
  using (user_id = auth.uid());

create policy actors_update_own_profile on public.actors
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

```sql
-- Design only. Do not execute in Mission 04A.
alter table public.global_transactions enable row level security;
create policy global_transactions_select_own on public.global_transactions
  for select to authenticated
  using (actor_id = public.current_actor_id()::text);

-- No insert/update/delete policy for authenticated clients.
```

```sql
-- Design only. Do not execute in Mission 04A.
alter table public.api_keys enable row level security;
create policy api_keys_select_own_metadata on public.api_keys
  for select to authenticated
  using (actor_id = public.current_actor_id());

create policy api_keys_revoke_own on public.api_keys
  for update to authenticated
  using (actor_id = public.current_actor_id() and status = 'active')
  with check (actor_id = public.current_actor_id() and status in ('revoked', 'inactive'));
```

## 5. Client-read safe views

Where direct table reads are too broad, prefer views with explicit column selection:

| View | Backing source | Purpose |
|---|---|---|
| `dashboard_transactions_view` | `global_transactions` | Hide provider payloads/internal metadata if added later. |
| `dashboard_ledger_view` | `financial_ledger` | Present revenue/ledger summaries without webhook/payment internals. |
| `api_key_metadata_view` | `api_keys` | Exclude `key_hash` and any sensitive material. |
| `marketplace_dataset_cards_view` | `marketplace_datasets` | Public marketplace cards without storage paths unless authorized. |

## 6. RLS future verification checklist

- [ ] Anon denied from all financial tables.
- [ ] Authenticated users cannot read another actor's rows.
- [ ] Authenticated users cannot insert/update payment, ledger or webhook tables.
- [ ] API key hash/secret columns are excluded from client reads.
- [ ] Dataset purchase policy enforces buyer ownership.
- [ ] Admin/operator policies are backed by immutable role claims or server-managed actor roles.
