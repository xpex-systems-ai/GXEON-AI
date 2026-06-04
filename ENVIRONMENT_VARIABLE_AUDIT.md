# ENVIRONMENT VARIABLE AUDIT — RAILWAY GXEON

## Required for API boot

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `PORT` | Yes | API server bootstrap | API throws before listen; Railway deploy fails |
| `NODE_ENV` | Recommended | auth/webhook runtime behavior | Dev-only paths could be unclear if omitted |
| `LOG_LEVEL` | Optional | logger | Less controlled logs |

## Required for financial production

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Drizzle/Postgres, financial services, webhook persistence | DB health degraded; wallet/transaction APIs fail; webhook idempotency non-durable |
| `DIRECT_URL` | Optional/Drizzle | DB migration workflows | Some migration paths may lack direct DB URL |
| `FINANCIAL_AUTH_TOKEN` or `FINANCIAL_API_TOKEN` | Yes for mutations | financial middleware | Protected mutations return 503 if absent |
| `FINANCIAL_AUTH_SCOPES` or `FINANCIAL_API_SCOPES` | Recommended | financial middleware | Defaults to broad `financial:*` when token is valid |
| `FINANCIAL_RATE_LIMIT_WINDOW_MS` | Optional | rate limiter | Defaults to 60 seconds |
| `FINANCIAL_RATE_LIMIT_MAX_REQUESTS` | Optional | rate limiter | Defaults to 30 requests/window |

## Required for Mercado Pago monetization

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `MERCADO_PAGO_ACCESS_TOKEN` | Yes for real PIX | Mercado Pago adapter/payment runtime | Real payment creation/status blocked |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Yes for production webhook | webhook HMAC validation | Production webhooks rejected or unsafe if bypassed |
| `MERCADO_PAGO_NOTIFICATION_URL` | Yes for provider callbacks | PIX charge creation | Provider may not call backend |
| `MERCADO_PAGO_DEFAULT_PAYER_EMAIL` | Recommended | payer fallback | PIX creation may fail without payer email |
| `MERCADO_PAGO_VALIDATION_PAYMENT_ID` | Optional | validation scripts | Cannot validate a known payment |
| `GXEON_ALLOW_REAL_PIX_VALIDATION` | Optional safety gate | validation scripts | Real validation remains blocked unless intentional |
| `GXEON_OPERATOR_CONFIRMED_REAL_PIX` | Optional safety gate | validation scripts | Prevents accidental real payment tests |

## Required for governance/admin

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `GOVERNANCE_TOKEN` | Yes for production governance APIs | governance middleware | Governance endpoints return 503 when unset |
| `GXEON_API_BASE_URL` / `PRODUCTION_BASE_URL` | Recommended | scripts/probes | Validation scripts cannot target deployed API |

## Supabase/frontend/mobile

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` | Required for live UI/Supabase probes | dashboard/mobile/scripts | Live data disabled |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Required for client Supabase | dashboard/mobile | Live client data disabled |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for server-side Supabase go-live validation | scripts | REST validation blocked |
| `SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_REF` | Optional | scripts/reporting | Project inference may be weaker |
| `EXPO_PUBLIC_DOMAIN` | Recommended | mobile web build | Mobile build may use fallback domain |
| `BASE_PATH` | Optional | web/mobile build/serve | Defaults to `/` |

## Observability/alerts

| Variable | Required | Used by | Risk if missing |
| --- | --- | --- | --- |
| `SENTRY_DSN`, `MONITORING_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional but recommended | observability/runtime env inventory | Limited production tracing/error visibility |
| `SLACK_WEBHOOK_URL`, `ALERT_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY` | Optional but recommended | alert integrations/scripts | Silent incidents |
| `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_ENVIRONMENT`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_RESTART_POLICY` | Railway-provided/recommended | runtime reports/builds | Lower fidelity runtime reports |

## Secret exposure scan

No plaintext production secret values were intentionally copied into this report. Example env files exist for Supabase and Mercado Pago and should remain templates only.

## Missing-variable risk matrix

| Severity | Variable(s) | Effect |
| --- | --- | --- |
| CRITICAL | `PORT`, `DATABASE_URL`, `MERCADO_PAGO_WEBHOOK_SECRET` | API boot/payment integrity failures |
| HIGH | `FINANCIAL_AUTH_TOKEN`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_NOTIFICATION_URL`, `GOVERNANCE_TOKEN` | Mutations/payment/governance blocked or unsafe |
| MEDIUM | Supabase public/server keys, observability DSNs | Live UI and monitoring gaps |
| LOW | build defaults like `BASE_PATH`, `LOG_LEVEL` | Operational tuning |
