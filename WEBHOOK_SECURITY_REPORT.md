# WEBHOOK SECURITY REPORT — MERCADO PAGO

## Webhook inventory

| Provider | Method | Path | Handler | Auth model |
| --- | --- | --- | --- | --- |
| Mercado Pago | POST | `/api/v1/webhooks/mercado-pago` | `processWebhook` in `server/runtime/mercadoWebhookRuntime.cjs` | HMAC signature with timestamp freshness; optional non-production unsigned bypass |

## Signature validation

The webhook runtime parses Mercado Pago-style `x-signature`, extracts `v1` and `ts`, builds a manifest from payment id, request id and timestamp, validates freshness with a 15-minute default tolerance, and compares HMAC SHA-256 using `timingSafeEqual`. If `MERCADO_PAGO_WEBHOOK_SECRET` is missing, unsigned webhooks are only accepted when `NODE_ENV !== production` and `ALLOW_UNSIGNED_MP_WEBHOOKS=true`.

## Idempotency and replay protection

| Control | Status | Evidence |
| --- | --- | --- |
| Timestamp freshness | PRESENT | `isWebhookTimestampFresh` enforces tolerance. |
| Constant-time HMAC compare | PRESENT | `safeTimingEqualHex` uses `crypto.timingSafeEqual`. |
| DB idempotency | PRESENT when `DATABASE_URL` exists | `payment_webhook_events` has unique idempotency/provider keys in schema/migration. |
| Memory fallback idempotency | PRESENT but non-durable | Local processed ID set is used without DB. |
| Replay attack protection | PARTIAL | Timestamp + idempotency protect production when secret and DB are configured. Local fallback is restart-sensitive. |

## Critical production gates

1. `MERCADO_PAGO_WEBHOOK_SECRET` must be set in Railway production.
2. `DATABASE_URL` must be set so webhook idempotency persists through restarts.
3. `ALLOW_UNSIGNED_MP_WEBHOOKS` must not be set to `true` in production.
4. Mercado Pago notification URL must target the deployed API path: `/api/v1/webhooks/mercado-pago`.
5. Configure monitoring for any webhook response with `accepted:false` or `INVALID_SIGNATURE`.

## Risks

| Severity | Finding | Impact | Remediation |
| --- | --- | --- | --- |
| CRITICAL | Webhook persistence falls back to local memory if DB is not configured | Duplicate or lost processing after restarts | Block production payment activation unless `DATABASE_URL` is healthy |
| HIGH | No provider retry dashboard found | Failed webhooks may be hard to operationalize | Expose webhook processing status metrics and alert on `FAILED` rows |
| MEDIUM | Non-production unsigned bypass exists | Safe in dev, dangerous if env is mis-set | Add startup assertion to reject `ALLOW_UNSIGNED_MP_WEBHOOKS=true` under `NODE_ENV=production` |
