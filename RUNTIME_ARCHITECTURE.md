# RUNTIME_ARCHITECTURE.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: arquitetura de execução mapeada sem ativar integrações externas.

## 1. Diagrama textual de arquitetura

```text
[Web Dashboard: artifacts/gxeon-dashboard]
[Mobile Dashboard: artifacts/gxeon-dashboard-mobile]
[API clients: lib/api-client-react, lib/api-zod, lib/api-spec]
          |
          v
[API Server Express: artifacts/api-server]
  app.ts: pino-http -> cors -> json/rawBody -> /api router
          |
          +--> health.ts                    -> /healthz
          +--> runtime.ts                   -> server/runtime/*
          |      +--> production/recovery/deployment/snapshot
          |      +--> railway/supabase/providers/memory
          |      +--> payments/webhook/revenue/credits/commissions
          |      +--> X-Radar/autonomous revenue/subscriptions
          |
          +--> conversion.ts                -> conversion/revenue pages
          +--> governance.ts + auth         -> git/deployment/report engine
          +--> phase8.ts                    -> observability/mobile/growth/live
          |
          v
[Runtime modules: server/runtime/*.cjs]
          |
          +--> Local memory/filesystem: .gxeon_runtime, runtime memory files
          +--> Financial DB adapter: DATABASE_URL/Postgres
          +--> Mercado Pago adapter/webhook mapping
          +--> Supabase config/status mapping
          +--> Railway config/status mapping

[Auxiliary local APIs]
  api/runtime/operatorApiServer.cjs -> analytics/runtime + operator control plane
  api/dashboard/dashboardApiV2.cjs  -> dashboard aggregation
  api/conversion/conversionApi.cjs  -> conversion engine/model

[Worker runtime]
  tools/run_live_runtime.cjs -> runtime/workers/worker.cjs
    -> QueueDispatcher -> workflowEngine -> demoExecutor/compensator
    -> telemetry/events -> persistence/store -> .gxeon_runtime/*.jsonl

[Realtime]
  gateway/realtime/wsGateway.cjs -> WebSocket stream over runtime events
  -> HTTP healthcheck /healthz for Railway readiness
```

## 2. Fluxo completo — operação local de workflow

1. Um job entra via script/função `runOnce`.
2. `QueueDispatcher` registra a fila `execution` e enfileira o job.
3. Eventos `QUEUE_ENQUEUED` e `QUEUE_DISPATCHED` são persistidos em JSONL.
4. `workflowEngine` salva estados de execução.
5. `demoExecutor` executa; se `should_fail` for verdadeiro, lança `DEMO_FAILURE`.
6. Em sucesso, estado final `COMPLETED`.
7. Em falha, o engine tenta até `max_retries`, grava `FAILED`/`WAITING`/`RETRYING`.
8. Ao esgotar retries, chama `compensate` e finaliza `DEAD_LETTERED`.
9. APIs de operador/dashboard leem JSONL e agregam métricas.

## 3. Fluxo completo — API principal

1. `PORT` precisa existir para `artifacts/api-server/src/index.ts` iniciar.
2. A aplicação monta middleware global e prefixo `/api`.
3. Frontends consomem `/api/v1/*`.
4. Leituras de status geralmente retornam snapshots locais/configuração.
5. Mutações financeiras passam por `financialMutation`:
   - token obrigatório;
   - escopo obrigatório;
   - rate limit em memória;
   - idempotência em memória.
6. Webhook Mercado Pago passa pela validação específica do `processWebhook`, não pelo middleware financeiro.

## 4. Fluxo completo — monetização/pagamentos

```text
Checkout/payment request
  -> rota protegida financialMutation
  -> paymentRuntime ou revenueEngineRuntime
  -> mercadoPagoAdapter
  -> financialDb (DATABASE_URL)
  -> runtimeMemory/telemetry/revenue dashboard

Webhook notification
  -> /api/v1/webhooks/mercado-pago
  -> mercadoWebhookRuntime
  -> mercadoPagoAdapter + financialDb + subscriptionRuntime
  -> revenue/credits/subscription state
```

## 5. Pontos de falha

| Ponto | Classificação | Falha | Recuperação atual |
|---|---|---|---|
| `PORT` ausente | Critical | API server Express não inicia | Definir env antes de deploy. |
| `FINANCIAL_AUTH_TOKEN` ausente | Critical | Mutações financeiras retornam 503 | Configurar token forte e scopes. |
| `DATABASE_URL` ausente | Critical | DB financeiro indisponível | Provisionar Postgres antes da Missão 03. |
| `MERCADO_PAGO_ACCESS_TOKEN` ausente | Critical | PIX/checkout real indisponível | Configurar somente após readiness. |
| `MERCADO_PAGO_WEBHOOK_SECRET` ausente | Critical | Webhook real inseguro/bloqueado | Configurar secret forte. |
| `SUPABASE_URL` ausente | High | Status Supabase/mobile live degradado | Configurar Supabase se missão autorizar. |
| Fila em memória | High | Perda de jobs em restart | Migrar para fila durável ou DB. |
| JSONL local | Medium | Corrupção/concorrência/escala limitada | Persistência transacional. |
| CORS aberto | Medium | Exposição ampla em produção | Restringir origem no deploy. |
| Duplicidade de rotas Phase 8/runtime | Medium | Respostas divergentes para mesma rota | Consolidar contrato/roteamento. |

## 6. Recuperação existente

- Workflow engine: retry + compensação + dead-letter lógico.
- Runtime recovery: status de recuperação e sync em `runtimeRecovery.cjs`.
- Deployment integrity: checks locais/git para drift.
- Governance engine: relatórios locais e inspeção de branch/deployment.
- Health/readiness: endpoints agregam sinais, mas não substituem teste real de DB/provider.

## 7. Serviços realmente ativos no repositório

Ativos/rodáveis localmente:

- `artifacts/api-server` se `PORT` for definido.
- `api/runtime/operatorApiServer.cjs` com `PORT` Railway e fallback local `8787`.
- `api/dashboard/dashboardApiV2.cjs` com `PORT` Railway e fallback local `8791`.
- `api/conversion/conversionApi.cjs` com `PORT` Railway e fallback local `8794`.
- Worker local via `tools/run_live_runtime.cjs`.
- Dashboard web/mobile como apps de workspace conforme scripts de build/serve.

Não comprovados como ativos nesta missão:

- Supabase real.
- Mercado Pago real.
- Railway deploy real.
- Postgres financeiro real.
- Webhook externo registrado.

## 8. Recomendação arquitetural antes da Missão 03

A Missão 03 deve focar em readiness Railway com checklist ambiental fechado, sem ativar Mercado Pago/Supabase até validar: `PORT`, health, build, CORS production, DB provisioning, secret strategy, logging e rollback.
