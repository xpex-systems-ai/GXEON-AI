# Subscription Model — Mission 05 Mercado Pago Readiness

**Date:** 2026-06-02  
**Scope:** subscription architecture audit only; no real subscription/preapproval API calls.

## 1. Executive verdict

**Subscription Readiness:** **90 / 100 as a PIX-recurring operating model; 82 / 100 for fully automated provider-native recurring billing.**

GXEON can safely sell subscription access through PIX checkout and activate entitlements after approved payments. Full provider-native recurring billing still requires durable subscription tables, renewal scheduler, payment retry/dunning, cancellation persistence and refund/chargeback reversal.

## 2. Current subscription components

| Component | Current behavior | Readiness |
|---|---|---:|
| `subscriptionRuntime.cjs` | Defines BASIC/PRO/ENTERPRISE plans and activates subscription in local runtime memory. | 82 |
| `revenueEngineRuntime.cjs` | Creates subscription checkout using PIX and plan metadata. | 88 |
| `mercadoWebhookRuntime.cjs` | Activates subscription after approved payment if plan metadata is recognized. | 88 |
| Dashboard revenue runtime | Counts active subscriptions from local memory. | 80 |
| Financial DB schema | No durable `subscriptions` table yet. | 76 |

## 3. Subscription lifecycle map

| Lifecycle event | Current/Future flow | Required financial control |
|---|---|---|
| Creation | Client requests subscription checkout; PIX payment created with plan metadata. | Payment must be pending until provider approval. |
| Approval | Signed webhook settles ledger and activates plan. | Entitlement activation only after ledger settlement. |
| Renewal | Future scheduler creates renewal checkout or provider-native recurrence. | Renewal must create new transaction and ledger entry. |
| Cancellation | Future endpoint marks subscription canceling/canceled. | No further renewals; preserve historical ledger. |
| Payment failure | Future dunning/recovery flow creates retry notifications. | No extension of paid entitlement unless grace policy is explicit. |
| Recovery | Future retry checkout or payment link. | New payment attempt linked to subscription period. |
| Refund/chargeback | Future reversal flow. | Debit/refund ledger and entitlement revocation/suspension. |

## 4. Required durable schema for future migration

```sql
-- Design only. Do not execute in Mission 05.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  plan text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_transaction_id text references public.global_transactions(transaction_id),
  provider text not null default 'mercado_pago',
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 5. Renewal and dunning model

| Phase | Timing | Action |
|---|---|---|
| Renewal preparation | T-7 days | Create renewal notice and validate payer/contact. |
| Renewal checkout | T-3 to T-0 | Generate PIX checkout or provider-native charge. |
| Grace period | T+0 to T+3 days | Keep entitlement active only if business policy allows. |
| Failure recovery | T+1, T+3, T+7 | Notify, retry, offer payment recovery. |
| Suspension | After grace | Suspend paid features; preserve account/profile. |
| Cancellation | User/admin request or failed recovery | Mark canceled and stop renewals. |

## 6. Subscription risks

| Risk | Severity | Mitigation |
|---|---|---|
| Subscription active without settled payment | Critical | Activate only from approved webhook after ledger settlement. |
| Renewal failure not detected | High | Add durable renewal scheduler and dunning events. |
| Duplicate activation | High | Use transaction/ledger idempotency and subscription period uniqueness. |
| Refund without entitlement revocation | High | Add refund/chargeback handlers. |
| Dashboard inconsistent with durable state | Medium | Move subscription runtime from memory to Postgres/Supabase. |

## 7. Go-live model

- **Allowed for initial launch:** manual/PIX-based subscription sale with approved-payment activation.
- **Not yet approved:** fully automated recurring billing without durable subscriptions/reconciliation.
- **Required before scale:** durable subscription table, renewal jobs, cancellation/refund handlers and dashboard backed by persistent state.
