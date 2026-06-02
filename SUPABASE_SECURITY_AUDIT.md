# SUPABASE_SECURITY_AUDIT.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive security verdict

**Status:** YELLOW approaching RED if connected immediately.

The repo has good secret hygiene patterns and strong server-side guards for financial mutations, but real Supabase connection is not safe until RLS policies and missing ownership columns/tables are designed.

## 2. Secret exposure audit

| Area | Finding | Risk |
|---|---|---|
| Supabase env template | `.env.supabase.example` uses placeholders for service role, anon key, and database password. | Low. |
| Supabase project metadata | `supabase/README.md` and `supabase/config.toml` commit project ref/URL only. | Low; non-secret metadata. |
| Runtime status | `supabaseRuntime.cjs` masks configured env values. | Low. |
| Service role | Required in docs but not hardcoded in audited files. | Low if kept in secret store. |
| Frontend envs | Public anon URL/key are expected in Vite/Expo; service role must not be used. | Medium pending RLS. |

## 3. RLS strategy

### 3.1 Default rule

All application tables must have RLS enabled before real Supabase use. Default posture: **deny all, then explicitly allow minimum required reads/writes**.

### 3.2 Policy matrix

| Table/object | RLS posture | Read policy | Write policy |
|---|---|---|---|
| `actor_wallets` | Enable RLS. | Authenticated actor owner/admin can read limited rows; service can read all. | Service/API only. No direct client balance mutation. |
| `global_transactions` | Enable RLS. | Authenticated owner/admin can read own transactions or dashboard-safe projection. | Service/API only. |
| `payment_attempts` | Enable RLS. | Usually service/admin only; client may see redacted checkout status via API/view. | Service/API only. |
| `financial_ledger` | Enable RLS; highly sensitive. | Service/admin only or owner redacted view. | Service/API only. |
| `payment_webhook_events` | Enable RLS; service-only. | Service/admin audit only. | Service/webhook only. |
| `actors` | Enable RLS when added. | Owner/admin read. | Owner limited profile updates; admin/service for role fields. |
| `api_keys` | Enable RLS when added. | Owner sees metadata only, never secret hash. | Create/rotate/revoke via API server; status update only if audited. |
| `revenue_events` | Enable RLS when added. | Aggregated/owner/admin read. | Service/API only. |
| `marketplace_datasets` | Enable RLS when added. | Public/anon can read approved public metadata only. | Owner/admin/service writes. |
| `dataset_purchases` | Enable RLS when added. | Purchaser/seller/admin reads. | Payment/service writes. |
| Storage buckets | Enable storage policies. | Depends on bucket; private by default. | Service/admin or owner-limited writes. |

## 4. Permissions and roles

| Role | Allowed capability |
|---|---|
| `anon` | Public metadata only; no financial rows, no private storage, no writes. |
| `authenticated` | Own actor/profile rows, own permitted dashboard projections, purchased dataset access. |
| `operator` | Operational views for assigned scope; no direct financial mutation. |
| `admin` | Admin dashboard reads and controlled admin actions through backend. |
| `service_role` | Server-side only for migrations, controlled jobs, webhooks, and privileged writes. |

## 5. Data exposure map

| Data category | Current exposure risk if connected now | Notes |
|---|---:|---|
| Financial transactions | High | Direct web/mobile reads exist; RLS missing. |
| Wallet balances | High | Dashboard/commissions read `actor_wallets`; no RLS committed. |
| API keys metadata | High | `api_keys` table missing; UI has direct update pattern. |
| Raw webhook payloads | Medium | Server-side table; should never be client-readable. |
| Dataset assets/purchases | High | Tables and bucket policies missing. |
| Runtime telemetry | Medium | Local gateway currently separate; Supabase publication must be scoped. |

## 6. Existing server-side security controls

| Control | Status |
|---|---|
| Financial mutation token requirement | Present; blocks if `FINANCIAL_AUTH_TOKEN` is missing. |
| Financial scopes | Present; supports exact scope, wildcard, env/header scopes. |
| Rate limiting | Present in process memory for financial mutations. |
| Idempotency header | Present and required for financial mutations. |
| Governance token | Present for governance routes. |
| Supabase env masking | Present in runtime status. |
| Local no-connect readiness script | Present but fails when required Supabase envs are missing, as expected. |

## 7. Risk register

| Risk | Severity | Current decision | Required mitigation |
|---|---:|---|---|
| No RLS policies committed. | Critical | Block real connection for direct clients. | Add RLS migration/policy docs and tests. |
| Missing tables referenced by clients. | High | Block client activation. | Add schema or update clients. |
| `transactions` vs `global_transactions` mismatch. | High | Block realtime subscription. | Align naming/view. |
| Direct `api_keys` update from client. | High | Must be redesigned. | Move to API server or strict RLS/audit trigger. |
| No Supabase login/session flow. | High | Auth incomplete. | Implement login/session and ownership mapping. |
| No storage bucket policies. | High | Storage inactive. | Version bucket and policy architecture. |
| Financial RLS ownership not modeled. | High | Needs schema change. | Add user/actor membership model. |

## 8. Security readiness score

**Security score:** 56 / 100

- +15 no real secrets found in committed Supabase templates/config
- +15 financial API mutation guardrails
- +10 governance auth separation
- +8 runtime masking/fail-soft config checks
- +8 idempotency/rate-limit controls
- -20 absent RLS policies
- -10 missing ownership columns/tables
- -10 direct client table access before RLS
- -5 storage policy absent

**Decision:** YELLOW/guarded — connect only after RLS and schema corrections. Immediate real client connection would be RED.
