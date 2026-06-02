# GXEON Auth Flow — Mission 04A Supabase Remediation Protocol

**Date:** 2026-06-02  
**Scope:** local design only; no Supabase login, keys, project calls, or external resources.

## 1. Executive verdict

**Auth Readiness after local remediation design:** **91 / 100**

The repository already has server-side token guards for financial mutations, but public Supabase clients require a defined Supabase Auth-to-actor ownership model before real connection. This document establishes the JWT/session flow and role boundaries required to activate safely later.

## 2. Identity model

| Identity | Source | Trust level | Allowed use |
|---|---|---|---|
| `anon` | Supabase public anon key | Public/unauthenticated | Read public marketplace metadata only. No financial/admin/API-key access. |
| `authenticated` | Supabase Auth JWT | User-scoped | Own actor profile, own dashboard data, owned or purchased dataset metadata. |
| `operator` | `actors.role = 'operator'` or custom JWT claim | Scoped operational user | Own/member operational reads; no direct privileged financial writes. |
| `admin` | Custom claim or server-managed actor role | Elevated human/admin | Audit-safe administrative reads and constrained admin actions. |
| `service_role` | Backend only | Privileged | Financial writes, webhook processing, payment attempts, key hashing, admin jobs. Never exposed to web/mobile. |

## 3. Required JWT claims

The RLS policy design assumes these claims or equivalent SQL helper functions:

| Claim/helper | Purpose | Required before real connection |
|---|---|---|
| `auth.uid()` | Bind user to `actors.user_id` | Yes |
| `actor_id` custom claim or `actors` lookup | Fast actor ownership | Recommended |
| `role` / `app_role` | Distinguish operator/admin/service behavior | Yes for admin/operator |
| `actor_memberships` helper | Support future teams/orgs | Recommended before multi-operator launch |

Recommended helper functions for future migration:

```sql
-- Design only. Do not execute in Mission 04A.
create function public.current_actor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.actors where user_id = auth.uid() and status = 'active' limit 1
$$;

create function public.current_actor_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.actors where user_id = auth.uid() and status = 'active' limit 1
$$;
```

## 4. Web/mobile session flow

1. Client starts without Supabase connection if env vars are absent.
2. User authenticates through Supabase Auth in a future mission.
3. Supabase returns JWT/session to the client.
4. Client reads only tables with RLS policies scoped by `auth.uid()` and `current_actor_id()`.
5. Financial writes, payment creation, webhook writes, API-key secret creation and Mercado Pago operations continue through the GXEON API server.
6. Server writes use `service_role` only in backend runtime, never in frontend bundles or mobile public config.

## 5. API key flow

Direct client updates to `api_keys` are unsafe unless restricted to non-secret status requests. The safe future model is:

| Action | Client table access | Server endpoint | Notes |
|---|---|---|---|
| List own key metadata | `select` own rows only | Optional | Return prefix, label, scopes, status; never hash/secret. |
| Create key | No direct insert | Required | Server generates secret, stores hash, returns secret once. |
| Rotate key | No direct update to hash | Required | Server creates new secret and revokes old one atomically. |
| Revoke key | Optional direct update `status='revoked'` under RLS, or server endpoint | Preferred server | Audit event required. |

## 6. Auth test matrix for future activation

| Test | Expected result |
|---|---|
| Anon selects `actor_wallets` | Denied. |
| Authenticated user selects own `actors` row | Allowed. |
| Authenticated user selects another actor row | Denied. |
| Authenticated user inserts `global_transactions` | Denied. |
| Service role inserts `global_transactions` | Allowed through backend only. |
| Authenticated user lists purchased dataset metadata | Allowed if `dataset_purchases.status = 'paid'`. |
| Anon lists public datasets | Allowed only for `visibility='public'` metadata columns. |
