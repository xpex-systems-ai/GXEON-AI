# Ledger Model and Reconciliation — Mission 05

**Date:** 2026-06-02  
**Scope:** financial model validation only; no migrations and no external provider calls.

## 1. Executive verdict

**Ledger Readiness:** **92 / 100**

The committed schema provides a reliable financial foundation using `global_transactions`, `payment_attempts`, `actor_wallets`, `financial_ledger`, and `payment_webhook_events`. The requested conceptual tables map cleanly to current or future GXEON tables/views.

## 2. Requested ledger table mapping

| Requested domain | Current GXEON table/model | Gap |
|---|---|---|
| `payments` | `payment_attempts` + provider fields on `global_transactions` | Present. |
| `transactions` | `global_transactions` | Present; canonical name is `global_transactions`. |
| `subscriptions` | `subscriptionRuntime` local memory model | Needs durable table before recurring production. |
| `commissions` | `financial_ledger` with `entry_type='COMMISSION'` | Schema supports it; commission allocation routine should be formalized. |
| `agent_revenue` | `actor_wallets.total_earned` + `financial_ledger` | Present as wallet/ledger projection. |
| `marketplace_revenue` | `financial_ledger` with marketplace source metadata | Needs dashboard view/materialization. |
| `financial_audit` | `payment_webhook_events` + ledger metadata | Needs expanded audit events for manual/admin changes. |

## 3. Ledger invariants

| Invariant | Required behavior | Current readiness |
|---|---|---:|
| Immutability | Ledger entries are append-only in application behavior; no client writes. | 90 |
| Traceability | Every credit references transaction/provider/source metadata. | 93 |
| Idempotency | Unique ledger idempotency key prevents duplicate credit. | 94 |
| Atomicity | Approved payment updates transaction, wallet and ledger inside a DB transaction. | 94 |
| Reconciliation | Provider/payment/ledger links exist for future jobs. | 88 |
| Auditability | Webhook events and raw/normalized payloads persist when DB configured. | 92 |

## 4. Settlement sequence

1. Webhook is accepted only after valid signature and idempotency insert.
2. Approved provider status triggers `applyApprovedPayment`.
3. Transaction row is selected `FOR UPDATE` by provider payment id, transaction id or external reference.
4. `global_transactions.status` becomes `PAID` with `paid_at` set once.
5. Actor wallet is created if missing and credited by approved amount.
6. `financial_ledger` receives one `CREDIT/PAYMENT` entry with balance snapshot.
7. Webhook event is marked `PROCESSED`; errors mark `FAILED`.

## 5. Reconciliation model

| Reconciliation check | Query/source | Expected action |
|---|---|---|
| Paid transaction without ledger | `global_transactions.status='PAID'` left join ledger | Create incident; never auto-credit without provider validation. |
| Ledger credit without paid transaction | Ledger source payment left join transaction | Freeze payout and investigate. |
| Provider approved but local pending | Mercado Pago status vs transaction | Apply approved settlement if idempotency keys clear. |
| Duplicate provider event | `payment_webhook_events` unique idempotency | Return idempotent response; no ledger change. |
| Wallet balance mismatch | Sum ledger by actor vs wallet balance | Generate correction audit, require admin approval. |

## 6. Refund and chargeback requirement

Refunds and chargebacks are the major remaining ledger gap. Future model:

| Event | Ledger entry | Wallet impact | Entitlement impact |
|---|---|---|---|
| Refund approved | `DEBIT` or `REFUND` linked to original payment | Decrease balance/earned or create payable adjustment | Revoke/adjust entitlement. |
| Chargeback | `DEBIT` + risk flag | Freeze account or offset future payouts | Suspend related entitlement. |
| Manual correction | `ADJUSTMENT` | Admin-approved delta | Audit event required. |

## 7. Recommended financial audit events

- `PAYMENT_CREATED`
- `PAYMENT_ATTEMPT_CREATED`
- `WEBHOOK_RECEIVED`
- `WEBHOOK_DUPLICATE`
- `PAYMENT_APPROVED_SETTLED`
- `LEDGER_ENTRY_CREATED`
- `REFUND_SETTLED`
- `SUBSCRIPTION_ACTIVATED`
- `ENTITLEMENT_REVOKED`
- `RECONCILIATION_EXCEPTION`
