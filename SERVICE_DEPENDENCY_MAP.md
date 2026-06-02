# SERVICE_DEPENDENCY_MAP.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: dependências estáticas e operacionais locais. Nenhuma dependência externa foi conectada.

## 1. Grafo de dependências textual

```text
Frontend web/mobile
  -> artifacts/api-server /api/v1/*
    -> server/runtime/*
      -> runtimeMemory/filesystem
      -> paymentRuntime
        -> mercadoPagoAdapter
        -> financialDb (DATABASE_URL/Postgres)
      -> mercadoWebhookRuntime
        -> mercadoPagoAdapter
        -> subscriptionRuntime
        -> financialDb
      -> revenueEngineRuntime
        -> paymentRuntime
        -> mercadoPagoAdapter
        -> subscriptionRuntime
        -> creditRuntime
        -> xRadarEngine
      -> railwayProduction
        -> providerRuntime
        -> radarContinuity
        -> signalEnrichment
        -> conversionDNA
        -> revenueTelemetry
        -> paymentRuntime
      -> supabaseRuntime/runtimeSnapshot/productionRuntime
        -> SUPABASE_URL presence/config checks

Local runtime APIs
  -> api/runtime/operatorApiServer.cjs
  -> api/dashboard/dashboardApiV2.cjs
  -> api/conversion/conversionApi.cjs
    -> analytics/runtime + dashboard/backend + conversion/runtime
    -> .gxeon_runtime JSONL

Workers
  -> runtime/workers/worker.cjs
    -> QueueDispatcher
      -> workflowEngine
        -> demoExecutor
        -> compensator
        -> telemetry/events
        -> persistence/store
```

## 2. Dependências internas principais

| Componente | Depende de | Acoplamento |
|---|---|---|
| `artifacts/api-server/src/app.ts` | Express, CORS, pino-http, routers | Alto: entrada API central. |
| `routes/runtime.ts` | praticamente todos os `server/runtime/*.cjs` | Muito alto: maior hub do backend. |
| `financialAuth.ts` | env token/scopes/rate limits | Alto: gate de mutações financeiras. |
| `mercadoWebhookRuntime.cjs` | adapter MP, DB financeiro, subscriptions, memory | Alto/crítico. |
| `paymentRuntime.cjs` | runtimeMemory, Mercado adapter, financialDb | Alto/crítico. |
| `revenueEngineRuntime.cjs` | payment, MP adapter, subscription, credits, X-Radar | Alto/crítico. |
| `railwayProduction.cjs` | provider, radar, signal, conversion, telemetry, payment | Médio/alto. |
| `runtimeMemory.cjs` | filesystem local, `SUPABASE_URL` como sinal | Médio. |
| `analytics/runtime/metricsKernel.cjs` | `.gxeon_runtime` JSONL | Médio. |
| `dashboard/backend/aggregationEngine.cjs` | metrics/control/revenue signals | Médio. |
| `gateway/realtime/wsGateway.cjs` | `ws`, events JSONL/dashboard API | Médio; `ws` declarado como dependência runtime. |

## 3. Dependências externas mapeadas

| Dependência | Componentes | Variáveis | Status |
|---|---|---|---|
| Supabase | `supabaseRuntime`, `productionRuntime`, `runtimeMemory`, `runtimeSnapshot`, frontend/mobile Supabase client, governance route check | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mapeado; não conectado. |
| Mercado Pago | `mercadoPagoAdapter`, `paymentRuntime`, `mercadoWebhookRuntime`, `revenueEngineRuntime`, smoke/check scripts | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_NOTIFICATION_URL`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET`, `MERCADO_PAGO_PIX_KEY`, `MERCADO_PAGO_DEFAULT_PAYER_EMAIL`, `MERCADO_PAGO_API_BASE` | Mapeado; não conectado. |
| Railway | deploy configs, production readiness, `railwayProduction`, scripts deploy/provision | `RAILWAY_ENVIRONMENT`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_STATIC_URL`, `PORT` | Mapeado; não conectado. |
| Postgres financeiro | `financialDb`, drizzle, validate DB script | `DATABASE_URL` | Mapeado; não conectado. |
| GitHub Actions/Pages | `.github/workflows/*`, `scripts/github_pages_spa_fallback.cjs` | GitHub runtime vars/secrets; `BASE_PATH` | Mapeado. |
| Observability alerting | activation checks | `MONITORING_DSN`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `ALERT_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY`, `SLACK_WEBHOOK_URL` | Opcional/mapeado. |

## 4. Componentes que dependem de Supabase

- Backend: `server/runtime/supabaseRuntime.cjs`, `productionRuntime.cjs`, `runtimeMemory.cjs`, `runtimeSnapshot.cjs`, scripts `supabase_env_check.cjs`, `production_activation_check.cjs`.
- API server: `routes/governance.ts` audita `VITE_SUPABASE_URL`/`SUPABASE_URL`.
- Frontend mobile: `artifacts/gxeon-dashboard-mobile/lib/supabase.ts`, settings e dashboard avisam ausência de `EXPO_PUBLIC_SUPABASE_*`.
- Frontend web: usa rotas de API; dependência Supabase direta é menor que no mobile, mas runtime exibe status de Supabase.

## 5. Componentes que dependem de Mercado Pago

- `server/runtime/mercadoPagoAdapter.cjs`.
- `server/runtime/paymentRuntime.cjs`.
- `server/runtime/mercadoWebhookRuntime.cjs`.
- `server/runtime/revenueEngineRuntime.cjs`.
- `server/runtime/monetizationAudit.cjs`.
- Scripts: `mercado_pago_env_check.cjs`, `runtime_pix_smoke_test.cjs`, `production_activation_check.cjs`.
- Env examples: `.env.mercadopago.example`, `payments/mercado-pago-production.env.example`.

## 6. Componentes que dependem de Railway

- `.railway/*/railway.json` e `artifacts/*/railway.json`.
- `server/runtime/railwayProduction.cjs`.
- Scripts: `railway_autodeploy.sh`, `provision_railway_postgres.sh`, `production_activation_check.cjs`.
- Docs existentes: `RAILWAY_ARCHITECTURE_REPORT.md`, `docs/RAILWAY_DATABASE_PROVISIONING.md`, `DEPLOY_READINESS_REPORT.md`.

## 7. Acoplamentos e cascatas

| Cascata | Classificação | Descrição |
|---|---|---|
| `DATABASE_URL` ausente → `financialDb` indisponível → payment/webhook/revenue engine degradados | Critical | Impede persistência financeira real. |
| `MERCADO_PAGO_ACCESS_TOKEN` ausente → PIX checkout/webhook reconciliation falham | Critical | Impede monetização real. |
| `FINANCIAL_AUTH_TOKEN` ausente → mutações financeiras retornam 503 | Critical | Proteção correta, mas bloqueia operação. |
| `SUPABASE_URL` ausente → status Supabase/produção degradado e mobile sem live data | High | Afeta experiência e readiness. |
| `PORT` ausente no API server Express → bootstrap falha | Critical | Serviço principal não sobe. |
| Fila em memória + JSONL local → restart perde jobs pendentes e rate-limit/idempotência em memória | High | Risco em produção horizontal. |
| `ws` ausente → realtime gateway não inicia | Medium | Mitigado nesta missão com dependência runtime declarada. |

## 8. Maior gargalo atual

O maior gargalo é a combinação de **serviço principal fortemente centralizado em `routes/runtime.ts`** com **monetização real dependente simultaneamente de `PORT`, `DATABASE_URL`, `FINANCIAL_AUTH_TOKEN`, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`**. Essa concentração cria um bloco crítico: sem ambiente completo, a API sobe parcialmente ou bloqueia mutações financeiras, e sem fila/DB duráveis o runtime local não representa produção resiliente.
