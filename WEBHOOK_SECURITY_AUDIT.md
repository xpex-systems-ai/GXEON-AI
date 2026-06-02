# Webhook Security Audit — Mercado Pago Mission 05

**Date:** 2026-06-02  
**Mode:** AUDIT_ONLY; no external webhook execution.

## 1. Executive verdict

**Webhook Security Readiness:** **93 / 100**

Mission 05 reviewed and hardened the local webhook runtime. Signature validation already used HMAC and constant-time comparison; this mission added timestamp freshness enforcement, production-safe unsigned-webhook behavior, and non-production-only raw body compatibility fallback.

## 2. Security controls audited

| Control | Current state | Readiness |
|---|---|---:|
| HMAC signature verification | Uses `MERCADO_PAGO_WEBHOOK_SECRET` and provider manifest fields. | 93 |
| Constant-time comparison | Uses `crypto.timingSafeEqual` after length check. | 92 |
| Timestamp replay window | Added 15-minute default tolerance via `isWebhookTimestampFresh`. | 94 |
| Unsigned webhook behavior | Allowed only outside production when explicitly opted in. | 94 |
| Idempotency | DB unique key and local processed set prevent duplicate processing. | 93 |
| Audit trail | `payment_webhook_events` stores raw/normalized payloads and processing status. | 92 |
| Spoofing protection | Signature required for production settlement. | 93 |

## 3. Webhook threat map

| Threat | Severity | Mitigation | Remaining action |
|---|---|---|---|
| Webhook spoofing | Critical | HMAC signature and production unsigned rejection. | Ensure `MERCADO_PAGO_WEBHOOK_SECRET` is configured before go-live. |
| Replay attack | Critical | Fresh timestamp check + idempotency key. | Add alerting for repeated stale signatures. |
| Duplicate financial credit | Critical | `payment_webhook_events` idempotency + ledger idempotency. | Add integration test with duplicated approved webhook. |
| Provider-event tampering | High | Optional provider status fetch when access token present. | Require provider status reconciliation in production mode. |
| Lost webhook | High | Audit table and future reconciliation job. | Implement scheduled reconciliation. |
| Raw payload PII exposure | Medium | Backend-only storage recommended. | Add retention/redaction policy. |

## 4. Signature validation behavior

| Scenario | Expected result |
|---|---|
| Valid `ts` + valid `v1` + correct data/request manifest | Accepted. |
| Valid signature but stale timestamp | Rejected. |
| Missing timestamp with secret configured | Rejected. |
| No secret and `NODE_ENV=production` | Rejected even if `ALLOW_UNSIGNED_MP_WEBHOOKS=true`. |
| No secret and non-production with explicit unsigned flag | Accepted for local/dev compatibility only. |
| Raw-body compatibility signature | Allowed only outside production. |

## 5. Idempotency model

| Layer | Key | Effect |
|---|---|---|
| Provider event audit | `${action}::${providerEventId}::${providerPaymentId}` | Duplicate webhook returns idempotent response. |
| Provider create payment | `X-Idempotency-Key` | Prevents duplicate PIX creation requests at provider. |
| Payment attempt table | `payment_attempts_idempotency_key_uq` | Prevents duplicate local provider attempts. |
| Ledger settlement | `payment-approved:{providerPaymentId/externalReference/event}` | Prevents duplicate wallet credit. |

## 6. Audit findings

### Passed

- Signature parsing supports `ts` and `v1` fields.
- Manifest includes data id, request id and timestamp when present.
- DB idempotency path runs before settlement.
- Approved settlement uses a DB transaction and `FOR UPDATE` transaction lookup.
- Webhook processing status is marked `PROCESSED` or `FAILED`.

### Needs future implementation

1. Add provider-status reconciliation as a mandatory production step, not only conditional on token presence.
2. Add alerting for invalid signature spikes and duplicate webhook storms.
3. Add raw payload retention limits and PII redaction policy.
4. Add automated route-level tests that preserve exact raw body and headers.
5. Add chargeback/refund-specific webhook handling with ledger reversal.
