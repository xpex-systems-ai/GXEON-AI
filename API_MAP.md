# API_MAP.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: auditoria estática/local. Nenhuma integração com Supabase, Mercado Pago, Railway ou APIs externas foi ativada.

## 1. Serviços de API identificados

| Serviço | Runtime | Entrada | Porta/env | Status auditado | Observações |
|---|---:|---|---|---|---|
| `artifacts/api-server` | Express/TypeScript | `artifacts/api-server/src/index.ts` → `app.ts` → `/api` | `PORT` obrigatório | Serviço principal implantável | Contém APIs de runtime, webhook Mercado Pago, governança, conversão, observabilidade e health. |
| `api/runtime/operatorApiServer.cjs` | Node HTTP CJS | servidor standalone | `GXEON_OPERATOR_API_PORT` ou `8787` | Serviço auxiliar/local | Lê `.gxeon_runtime/*.jsonl`; expõe snapshot, eventos e histórico. |
| `api/dashboard/dashboardApiV2.cjs` | Node HTTP CJS | servidor standalone | `GXEON_DASHBOARD_API_PORT` ou `8791` | Serviço auxiliar/local | Agrega runtime, dashboard, fila, revenue stream e marketplace signals. |
| `api/conversion/conversionApi.cjs` | Node HTTP CJS | servidor standalone | `GXEON_CONVERSION_API_PORT` ou `8794` | Serviço auxiliar/local | Expõe simulações/snapshots de conversão sem integração externa. |

## 2. Middleware global e acoplamento de API

### `artifacts/api-server`

Fluxo global:

```text
HTTP request
  -> pino-http logger
  -> cors()
  -> express.json({ verify: rawBody })
  -> express.urlencoded()
  -> /api router
      -> health/runtime/conversion/governance/phase8 routers
```

Middlewares identificados:

| Middleware | Arquivo | Uso | Risco |
|---|---|---|---|
| `cors()` | `artifacts/api-server/src/app.ts` | Global, sem restrição explícita de origem | Medium: permissivo para produção. |
| `express.json` com `rawBody` | `artifacts/api-server/src/app.ts` | Preserva corpo bruto para validação de webhooks | Low: necessário para assinatura. |
| `pino-http` | `artifacts/api-server/src/app.ts` | Logging HTTP com serialização de URL sem querystring | Low. |
| `governanceAuth` | `artifacts/api-server/src/middlewares/governanceAuth.ts` | Protege todas as rotas `/v1/governance/*` | High se `GOVERNANCE_TOKEN` ausente em produção: rotas bloqueiam com 503. |
| `financialMutation(scope)` | `artifacts/api-server/src/middlewares/financialAuth.ts` | Composição de token, escopo, rate limit e idempotência em mutações financeiras | Critical para endpoints de pagamento/créditos/revenue. |

## 3. Rotas mapeadas — `artifacts/api-server` (`/api` prefix)

### Health

| Método | Rota final | Controller | Dependências |
|---|---|---|---|
| GET | `/api/healthz` | `routes/health.ts` | Nenhuma externa. |

### Runtime principal

| Método | Rota final | Controller/função | Dependências internas | Integração externa ativada? |
|---|---|---|---|---|
| GET | `/api/v1/runtime/sync` | `getRuntimeSyncStatus` | `runtimeRecovery.cjs` | Não. |
| GET | `/api/v1/runtime/recovery` | `getRecoveryStatus` | `runtimeRecovery.cjs` | Não. |
| GET | `/api/v1/runtime/production` | `getProductionRuntimeStatus` | `productionRuntime.cjs`, `runtimeHeartbeat.cjs`, `runtimeRecovery.cjs` | Não; lê env `SUPABASE_URL`. |
| GET | `/api/v1/runtime/deployment` | `getDeploymentIntegrityStatus` | `deploymentIntegrity.cjs` | Não; executa checks locais/git. |
| GET | `/api/v1/runtime/snapshots` | `getRuntimeSnapshotStatus` | `runtimeSnapshot.cjs` | Não; filesystem local. |
| GET | `/api/v1/runtime/railway` | `getRailwayRuntimeStatus` | `railwayProduction.cjs` | Não; lê env Railway. |
| GET | `/api/v1/runtime/radar` | `getRadarStatus` | `radarContinuity.cjs` | Não. |
| GET | `/api/v1/runtime/providers` | `getProviderRuntimeStatus` | `providerRuntime.cjs` | Não. |
| GET | `/api/v1/runtime/memory` | `getRuntimeMemoryStatus` | `runtimeMemory.cjs` | Não; filesystem local. |
| GET | `/api/v1/runtime/supabase` | `getSupabaseRuntimeStatus` | `supabaseRuntime.cjs` | Não conecta; reporta configuração. |
| GET | `/api/v1/runtime/provider-logs` | `getSanitizedProviderSummary` | `runtimeLogSanitizer.cjs` | Não. |
| POST | `/api/v1/runtime/log-sanitize` | `sanitizeRuntimeEvent` | `runtimeLogSanitizer.cjs` | Não. |
| GET | `/api/v1/runtime/railway-core` | `getRailwayCoreStatus` | `railwayProduction.cjs` | Não. |
| GET | `/api/v1/runtime/signals` | `getSignalIntelligence` | `signalEnrichment.cjs` | Não. |
| GET | `/api/v1/runtime/conversion-dna` | `getConversionDNA` | `conversionDNA.cjs` | Não. |
| GET | `/api/v1/runtime/alerts` | `getOperatorAlerts` | `operatorAlerts.cjs` | Não. |
| GET | `/api/v1/runtime/monetization` | `getMonetizationDNA` | `conversionDNA.cjs` | Não. |
| GET | `/api/v1/runtime/revenue` | `getRevenueTelemetry` | `revenueTelemetry.cjs`, `paymentRuntime.cjs` | Não; pode refletir Mercado Pago env. |
| GET | `/api/v1/runtime/financial-core` | `getFinancialCoreStatus` | `railwayProduction.cjs` | Não. |
| GET | `/api/v1/runtime/monetization-audit` | `runMonetizationAudit` | payments, conversion, telemetry, railway, recovery, supabase, alerts | Não. |
| GET | `/api/v1/runtime/readiness` | agregador readiness | múltiplos runtimes | Não. |
| GET | `/api/v1/dashboard/runtime` | agregador dashboard | runtime/revenue dashboard | Não. |

### Pagamentos, créditos, revenue e X-Radar

| Método | Rota final | Proteção | Controller/função | Dependências críticas |
|---|---|---|---|---|
| GET | `/api/v1/runtime/payments` | sem mutation auth | `getPaymentsRuntimeAsync` | `paymentRuntime`, `mercadoPagoAdapter`, `financialDb`. |
| POST | `/api/v1/runtime/payments/create` | `financial:payments:create` | `createPixPayment` | `MERCADO_PAGO_ACCESS_TOKEN`, `DATABASE_URL`, `FINANCIAL_AUTH_TOKEN`. |
| POST | `/api/v1/runtime/payments/auto` | `financial:payments:auto` | `executeAutonomousPixRun` | payment orchestrator, scheduler. |
| GET | `/api/v1/runtime/credits` | sem mutation auth | `getCreditRuntime` | `runtimeMemory`. |
| POST | `/api/v1/runtime/credits/wallet` | `financial:credits:wallet` | `upsertWallet` | `runtimeMemory`. |
| POST | `/api/v1/runtime/credits/transfer` | `financial:credits:transfer` | `transferCredits` | `runtimeMemory`. |
| GET | `/api/v1/runtime/commissions` | sem mutation auth | `getCommissionRuntime` | `runtimeMemory`. |
| POST | `/api/v1/runtime/commissions/settle` | `financial:commissions:settle` | `settleCommission` | `runtimeMemory`. |
| GET | `/api/v1/runtime/autonomous-revenue` | sem mutation auth | `getAutonomousRevenueRuntime` | scheduler, payment, x-radar, subscription. |
| POST | `/api/v1/runtime/tasks/enqueue` | `financial:revenue:tasks` | `enqueueTask` | scheduler memory. |
| POST | `/api/v1/runtime/tasks/run-cycle` | `financial:revenue:scheduler` | `runSchedulerCycle` | scheduler, payments, credits. |
| POST | `/api/v1/runtime/credits/auto-topup` | `financial:credits:auto-topup` | `autoTopupViaPix` | payment runtime. |
| POST | `/api/v1/runtime/tasks/generate-from-radar` | `financial:revenue:radar` | `generateSellableTasksFromRadar` | X-Radar. |
| GET | `/api/v1/x-radar/metrics` | sem mutation auth | `getXRadarMetrics` | `runtimeMemory`. |
| POST | `/api/v1/x-radar/signals/generate` | `financial:x-radar:signals` | `generateSignal` | credits/commission. |
| POST | `/api/v1/x-radar/signals/consume` | `financial:x-radar:consume` | `consumePremiumSignal` | credits/commission. |
| POST | `/api/v1/x-radar/scan-cycle` | `financial:x-radar:scan` | `runXRadarScanCycle` | X-Radar scheduler. |
| POST | `/api/v1/x-radar/revenue-cycle` | `financial:x-radar:revenue` | `runXRadarRevenueCycle` | revenue engine. |
| GET | `/api/v1/monetization/subscriptions/catalog` | sem mutation auth | `getSubscriptionCatalog` | subscription runtime. |
| POST | `/api/v1/monetization/subscriptions/subscribe` | `financial:monetization:subscriptions` | `subscribeAgent` | subscription/runtime memory. |
| POST | `/api/v1/runtime/pix/followups/process` | `financial:payments:followups` | `processPendingPixFollowups` | Mercado webhook runtime. |
| GET | `/api/v1/runtime/revenue-dashboard` | sem mutation auth | `getRevenueDashboardMetrics` | revenue dashboard runtime. |
| GET | `/api/v1/revenue-engine/catalog` | sem mutation auth | `getRevenueCatalog` | revenue engine. |
| GET | `/api/v1/revenue-engine/analytics` | sem mutation auth | `getRevenueAnalytics` | revenue engine. |
| POST | `/api/v1/revenue-engine/checkout` | `financial:revenue-engine:checkout` | `createRevenueCheckout` | payment runtime + Mercado adapter. |
| GET | `/api/v1/revenue-engine/checkout/:id/status` | sem mutation auth | `getCheckoutStatus` | revenue engine. |
| POST | `/api/v1/revenue-engine/recovery/process` | `financial:revenue-engine:recovery` | `processCartRecovery` | revenue engine. |
| POST | `/api/v1/revenue-engine/subscriptions/sale` | `financial:revenue-engine:subscriptions` | `sellSubscription` | revenue engine. |
| POST | `/api/v1/revenue-engine/credits/packs/sale` | `financial:revenue-engine:credits` | `sellCreditPack` | revenue engine. |
| POST | `/api/v1/revenue-engine/radar/checkout` | `financial:revenue-engine:radar` | `createRadarMonetizationCheckout` | revenue engine. |
| POST | `/api/v1/revenue-engine/entitlements/activate` | `financial:revenue-engine:entitlements` | `activatePaidEntitlement` | revenue engine. |

### Webhook

| Método | Rota final | Controller | Segurança | Dependências |
|---|---|---|---|---|
| POST | `/api/v1/webhooks/mercado-pago` | `processWebhook` | Usa `rawBody`, `x-signature`/`x-mercado-signature`, `x-request-id`, `data.id`; depende de `MERCADO_PAGO_WEBHOOK_SECRET` salvo se `ALLOW_UNSIGNED_MP_WEBHOOKS` estiver liberado. | `mercadoWebhookRuntime`, `mercadoPagoAdapter`, `subscriptionRuntime`, `financialDb`. |

### Conversão

| Método | Rota final | Controller | Dependências |
|---|---|---|---|
| GET | `/api/v1/conversion/funnels` | dados estáticos/agregados | rota conversion. |
| GET | `/api/v1/conversion/leads` | lista paginada | rota conversion. |
| POST | `/api/v1/leads/capture` | captura lead em memória/estático | rota conversion. |
| GET | `/api/v1/conversion/telemetry` | telemetria | rota conversion. |
| GET | `/api/v1/conversion/forecast` | forecast | rota conversion. |
| GET | `/api/v1/conversion/opportunities` | oportunidades | rota conversion. |
| GET | `/api/v1/conversion/runtime` | runtime conversion | rota conversion. |
| GET | `/api/v1/revenue/live` | revenue live | rota conversion. |

### Governança

Todas usam `governanceAuth`:

| Método | Rota final | Controller |
|---|---|---|
| GET | `/api/v1/governance/merge` | merge queue/status. |
| GET | `/api/v1/governance/branches` | análise de branches. |
| GET | `/api/v1/governance/deployments` | drift/deployment status. |
| GET | `/api/v1/governance/conflicts` | conflitos de merge. |
| GET | `/api/v1/governance/recovery` | status recovery. |
| GET | `/api/v1/governance/runtime-sync` | runtime sync. |
| POST | `/api/v1/governance/reports` | grava report local em `.local/governance-reports`. |

### Phase 8 / dashboard expansion

| Método | Rota final | Controller |
|---|---|---|
| GET | `/api/v1/observability/metrics` | métricas observability. |
| GET | `/api/v1/revenue/forecast` | forecast de revenue. |
| GET | `/api/v1/telemetry/live` | telemetria live. |
| POST | `/api/v1/mobile/runtime` | payload runtime mobile. |
| GET | `/api/v1/mobile/telemetry` | telemetria mobile. |
| GET | `/api/v1/conversion/live` | conversão live. |
| GET | `/api/v1/growth/runtime` | growth runtime. |
| GET | `/api/v1/runtime/production` | duplicata lógica do runtime production para Phase 8. |
| GET | `/api/v1/runtime/activation` | activation status. |
| GET | `/api/v1/runtime/health` | health agregado. |
| GET | `/api/v1/runtime/alerts` | alerts de Phase 8. |
| GET | `/api/v1/reports` | lista/report payload. |

## 4. Rotas mapeadas — APIs auxiliares CJS

### `api/runtime/operatorApiServer.cjs`

| Método | Rota | Controller | Fonte de dados |
|---|---|---|---|
| GET | `/api/runtime/snapshot` | `summarize()` | `.gxeon_runtime/workflows.jsonl`, `events.jsonl`. |
| GET | `/api/operators/control-plane` | `getOperatorView()` | `metricsKernel`. |
| GET | `/api/runtime/events` | `filterFeed(readJsonl(EVT_FILE))` | eventos JSONL. |
| GET | `/api/workflows/history` | `filterFeed(readJsonl(WF_FILE))` | histórico JSONL. |

### `api/dashboard/dashboardApiV2.cjs`

| Método | Rota | Controller | Fonte de dados |
|---|---|---|---|
| GET | `/api/dashboard/live-overview` | `buildLiveOverview()` | aggregation engine + runtime. |
| GET | `/api/dashboard/runtime-health` | `summarize()` | metrics kernel. |
| GET | `/api/dashboard/live-events` | pagina eventos | JSONL local. |
| GET | `/api/dashboard/revenue-stream` | `revenueStream()` | aggregation engine. |
| GET | `/api/dashboard/operator-feed` | `getOperatorView()` | control plane. |
| GET | `/api/dashboard/workflow-live-status` | pagina workflows | JSONL local. |
| GET | `/api/dashboard/queue-health` | `queueHealth()` | aggregation engine. |
| GET | `/api/dashboard/marketplace-signals` | `marketplaceSignals()` | aggregation engine. |

### `api/conversion/conversionApi.cjs`

| Método | Rota | Controller | Fonte de dados |
|---|---|---|---|
| GET | `/api/conversion/snapshot` | `computeConversionSnapshot()` | conversion engine. |
| POST | `/api/conversion/tick` | `runConversionTick()` | conversion engine. |
| GET | `/api/conversion/behavior-score` | `behaviorScore(payload)` | query params numéricos. |
| GET | `/api/conversion/intent` | `evaluateSignal(signal)` | query params numéricos. |

## 5. Dependências de API críticas

- `artifacts/api-server` é o único serviço Express completo e possui maior acoplamento operacional.
- As APIs auxiliares CJS dependem de persistência JSONL local e são mais adequadas para smoke/local runtime.
- Mutações financeiras são corretamente bloqueadas quando `FINANCIAL_AUTH_TOKEN` não existe, mas isso torna produção dependente de env completo.
- O webhook Mercado Pago é o principal ponto de entrada externo, mas nesta missão foi apenas mapeado, não acionado.
