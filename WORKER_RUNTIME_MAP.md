# WORKER RUNTIME MAP — GXEON RAILWAY

## Worker model found

The repository does not define separate Railway worker services, queue daemons, cron processes, BullMQ, Sidekiq, or always-on schedulers. Worker-like execution is implemented as **HTTP-triggered runtime functions** in `server/runtime/*.cjs`, exposed through `artifacts/api-server/src/routes/runtime.ts`.

## Active worker-like modules

| Module | Entry points/routes | Trigger | Monitoring state | Risk |
| --- | --- | --- | --- | --- |
| `autonomousRevenueScheduler.cjs` | `/runtime/tasks/enqueue`, `/runtime/tasks/run-cycle`, `/runtime/tasks/generate-from-radar`, `/runtime/autonomous-revenue` | Manual API calls | Exposes queue counts via API; no background supervisor | HIGH: silent failure if no caller triggers cycles |
| `xRadarScheduler.cjs` | `/x-radar/scan-cycle`, `/x-radar/revenue-cycle` | Manual API calls | API response only | HIGH: no retry/schedule loop observed |
| `paymentOrchestrator.cjs` | `/runtime/payments/auto` | Manual financial API call | API response only | MEDIUM: depends on live Mercado Pago and DB secrets |
| `mercadoWebhookRuntime.cjs` | `/webhooks/mercado-pago`, `/runtime/pix/followups/process` | External webhook + manual followup processing | DB webhook table if `DATABASE_URL`; local memory fallback otherwise | CRITICAL if DB missing in production |
| `runtimeSnapshot.cjs` | `/runtime/snapshots` | Manual GET | Writes local snapshot JSON | MEDIUM: local filesystem state is ephemeral on Railway |
| `runtimeMemory.cjs` | many runtime modules | In-process/local memory fallback | Exposed through `/runtime/memory` | MEDIUM: not durable unless Supabase/Postgres path is used |
| `operatorAlerts.cjs` | `/runtime/alerts` | Manual GET | Static/runtime alert payload | LOW: route duplicate may shadow this endpoint |

## Queues and persistence

| Queue/state | Backing store | Idempotency/retry | Finding |
| --- | --- | --- | --- |
| Autonomous task queue | `runtimeMemory` local JSON/memory | Status updates exist; no durable retry daemon observed | Needs external scheduler or Railway cron/worker service |
| Pending PIX followups | DB when configured; memory fallback otherwise | Manual process endpoint; webhook dedupe key | Needs scheduled processor and alerting |
| Webhook processed IDs | Postgres `payment_webhook_events` when configured; memory fallback otherwise | DB unique/idempotency key or local set | Production must use DB only |
| Payment attempts | Postgres `payment_attempts` | idempotency key upsert | Good DB pattern if migration applied |

## Silent failure risks

1. **Manual scheduler cycles:** queue settlement and radar revenue cycles run only when protected endpoints are called.
2. **Local memory fallback:** Railway restarts can erase in-process/local state.
3. **No external observability hook confirmed:** env names for Slack/PagerDuty/Sentry/OTEL exist, but live configuration was not observable.
4. **No retry worker:** failed tasks are recorded but no autonomous retry backoff loop was found.

## Recommended Railway worker activation

1. Add a dedicated Railway worker service or Railway cron that invokes:
   - `POST /api/v1/runtime/tasks/run-cycle`
   - `POST /api/v1/x-radar/scan-cycle`
   - `POST /api/v1/x-radar/revenue-cycle`
   - `POST /api/v1/runtime/pix/followups/process`
2. Require `FINANCIAL_AUTH_TOKEN`, `FINANCIAL_AUTH_SCOPES`, and `Idempotency-Key` for every scheduled mutation request.
3. Store queue state in Postgres tables instead of local memory before scaling horizontally.
4. Emit failure counters to the dashboard and an external alert destination.
