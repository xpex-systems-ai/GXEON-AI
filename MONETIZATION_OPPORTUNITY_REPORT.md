# MONETIZATION OPPORTUNITY REPORT — GXEON RAILWAY

## Monetization assets found

| Asset | Current endpoint/module | Revenue model | Readiness | Notes |
| --- | --- | --- | --- | --- |
| PIX payment creation | `/api/v1/runtime/payments/create`, `paymentRuntime.cjs` | Transaction fees / direct checkout | HIGH | Needs live Mercado Pago credentials and DB validation |
| Revenue engine checkout | `/api/v1/revenue-engine/checkout` | Catalog checkout | HIGH | Already protected by financial mutation middleware |
| Subscription sales | `/api/v1/revenue-engine/subscriptions/sale`, `/api/v1/monetization/subscriptions/subscribe` | Recurring SaaS plans | HIGH | Add external billing reconciliation and customer portal |
| Credit packs | `/api/v1/revenue-engine/credits/packs/sale`, `/api/v1/runtime/credits/*` | Prepaid usage credits | HIGH | Strong fit for API usage monetization |
| Radar signal checkout | `/api/v1/revenue-engine/radar/checkout`, `/api/v1/x-radar/signals/*` | Paid signals / intelligence API | HIGH | Productize as usage-metered API |
| Autonomous task queue | `/api/v1/runtime/tasks/*` | Paid task execution / agent marketplace | MEDIUM | Needs durable queue, worker SLA and retry model |
| Conversion intelligence | `/api/v1/conversion/*` | Analytics SaaS / dashboard upsell | MEDIUM | Many routes are demo/static; connect to live customer data |
| Financial database APIs | `/api/v1/financial/*` | Admin dashboard / reporting add-on | MEDIUM | Must add auth before exposing to customers |
| Runtime observability | `/api/v1/runtime/*`, `/api/v1/observability/metrics` | Ops dashboard / premium observability | MEDIUM | Needs auth, tenancy and external metrics sink |

## API products that can become SaaS

1. **GXEON Payments API** — PIX checkout, webhook status, payment attempts, transaction ledger.
2. **GXEON Credits API** — wallet creation, credit transfer, prepaid packs and entitlement activation.
3. **GXEON Radar Signals API** — generate, price, sell and consume premium intelligence signals.
4. **GXEON Revenue Engine** — checkout, subscription sale, cart recovery and analytics endpoints.
5. **GXEON Operator Observability** — Railway/runtime/Supabase/financial health as a managed dashboard.

## Highest-value activation path

| Phase | Action | Success metric |
| --- | --- | --- |
| 1 | Lock down open financial reads and sensitive runtime reads | No unauthenticated financial data exposure |
| 2 | Provision `DATABASE_URL`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_NOTIFICATION_URL` | `/financial/health` healthy and signed webhook accepted |
| 3 | Run one sandbox PIX checkout through approved webhook | Ledger entry and wallet credit are created idempotently |
| 4 | Convert `revenue-engine/catalog` into public product catalog | Public catalog returns only sellable SKUs |
| 5 | Meter x-radar signal consumption by credits | Every signal consume decrements wallet or creates charge |

## Monetization blockers

| Severity | Blocker | Why it matters |
| --- | --- | --- |
| CRITICAL | Open `/api/v1/financial/wallets` and `/api/v1/financial/transactions` | Customer/financial data cannot be public |
| HIGH | No durable background worker for queue/retry cycles | Paid tasks need reliable delivery and retry guarantees |
| HIGH | Live Mercado Pago secrets not verifiable in static scan | Real revenue cannot be confirmed locally |
| MEDIUM | Static/demo conversion data mixed with runtime monetization | Product analytics need real tenant/customer data |
| MEDIUM | No tenant boundary observed | SaaS APIs need account/project isolation before external sale |

## Recommended sellable packages

| Package | Included endpoints | Suggested packaging |
| --- | --- | --- |
| Starter Revenue API | Catalog, checkout status, PIX create | Monthly + transaction fee |
| Pro Signal API | x-radar metrics, generate/consume signals | Credit-metered usage |
| Operator Cloud | runtime/health/readiness/database reports | Per-seat admin dashboard |
| Agent Marketplace | task enqueue/run-cycle, subscription sale, entitlement activation | Revenue share + usage fees |
