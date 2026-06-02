# EXECUTIVE_RUNTIME_REPORT.md — MISSÃO 02B GXEON Runtime Mapping Protocol

## Executive Summary

A Missão 02B foi executada como auditoria estática/local do runtime GXEON. Foram mapeados os serviços de API, workers, webhooks, dependências internas/externas, arquitetura de execução e variáveis de ambiente, sem ativar Supabase, Mercado Pago, Railway ou qualquer API externa.

Resultado executivo:

- O backend possui um serviço principal Express (`artifacts/api-server`) e três APIs auxiliares CJS locais.
- O runtime local de workflow existe, mas usa fila em memória e persistência JSONL local.
- O maior hub técnico é `artifacts/api-server/src/routes/runtime.ts`, que concentra runtime, pagamentos, webhook, revenue, créditos, X-Radar e readiness.
- O maior gargalo atual é a prontidão ambiental/operacional para monetização real: `PORT`, `DATABASE_URL`, `FINANCIAL_AUTH_TOKEN`, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` são bloqueadores críticos antes de qualquer produção financeira.
- A entrada na Missão 03 deve ser permitida apenas para **Railway Backend Deployment Readiness**, ainda sem ativar Mercado Pago/Supabase reais.

## Runtime Status

| Serviço | Status real auditado | Bloqueios |
|---|---|---|
| `artifacts/api-server` | Rodável se `PORT` estiver definido | `PORT` obrigatório; integrações reais dependem de envs. |
| `api/runtime/operatorApiServer.cjs` | Rodável localmente | Depende de `.gxeon_runtime` para dados úteis. |
| `api/dashboard/dashboardApiV2.cjs` | Rodável localmente | Depende de dados JSONL/agregadores. |
| `api/conversion/conversionApi.cjs` | Rodável localmente | Simulação/conversion runtime local. |
| Worker base | Rodável localmente | Fila em memória, executor demo. |
| Realtime gateway | Mapeado | Smoke depende de pacote `ws`. |
| Supabase | Não conectado | Env/checks apenas. |
| Mercado Pago | Não conectado | Env/checks/webhook mapeados apenas. |
| Railway | Não conectado | Configs e readiness mapeados. |

## Dependency Graph

```text
Dashboards/API clients
  -> artifacts/api-server (/api)
    -> routes/runtime.ts
      -> server/runtime/paymentRuntime.cjs
        -> mercadoPagoAdapter.cjs
        -> financialDb.cjs
      -> mercadoWebhookRuntime.cjs
      -> revenueEngineRuntime.cjs
      -> railwayProduction.cjs
      -> supabaseRuntime.cjs
      -> runtimeMemory.cjs
    -> routes/conversion.ts
    -> routes/governance.ts + governanceAuth
    -> routes/phase8.ts

Local worker/runtime
  -> QueueDispatcher
    -> workflowEngine
      -> demoExecutor
      -> compensator
      -> telemetry/events
      -> persistence/store (.gxeon_runtime JSONL)

Auxiliary APIs
  -> analytics/runtime/metricsKernel.cjs
  -> analytics/operators/controlPlane.cjs
  -> dashboard/backend/aggregationEngine.cjs
  -> conversion/runtime/conversionEngine.cjs
```

## Critical Risks

| Risco | Classificação | Impacto | Mitigação proposta |
|---|---|---|---|
| `PORT` ausente no API server principal | Critical | Serviço não inicia | Garantir Railway env e health check. |
| `DATABASE_URL` ausente | Critical | DB financeiro indisponível | Provisionar Postgres e validar schema antes de produção. |
| `FINANCIAL_AUTH_TOKEN` ausente | Critical | Mutações financeiras bloqueadas por 503 | Configurar token forte + scopes mínimos. |
| `MERCADO_PAGO_ACCESS_TOKEN` ausente | Critical | Checkout/PIX real indisponível | Só configurar em missão de pagamento dedicada. |
| `MERCADO_PAGO_WEBHOOK_SECRET` ausente | Critical | Webhook real inseguro/bloqueado | Configurar secret forte; manter unsigned desativado. |
| `ALLOW_UNSIGNED_MP_WEBHOOKS` habilitado em produção | Critical | Aceitação indevida de webhooks | Proibir em production readiness. |
| Fila em memória | High | Perda de jobs/cascata em restart | Introduzir fila durável na evolução arquitetural. |
| JSONL local como persistência runtime | High/Medium | Escala, concorrência e durabilidade limitadas | Migrar para DB/event store. |
| `runtime.ts` centraliza muitos domínios | High | Alto blast radius | Separar routers/domínios antes de expansão. |
| CORS global permissivo | Medium | Superfície ampla em produção | Restringir origens por env. |

## Technical Debt

1. Centralização excessiva de domínios no router runtime principal.
2. Persistência runtime local em JSONL sem garantias transacionais.
3. Rate limit e idempotência financeira em memória, sem distribuição horizontal.
4. Duplicidade/possível divergência entre rotas runtime e Phase 8.
5. APIs auxiliares CJS e API Express principal coexistem sem um contrato único de ativação.
6. Dependências frontend usam rotas `/api/v1/*`, enquanto APIs auxiliares expõem `/api/dashboard/*`, `/api/runtime/*`, `/api/conversion/*`.
7. Realtime gateway depende de `ws` e precisa validação explícita no workspace.

## Environment Audit

Variáveis bloqueadoras por fase:

| Fase | Variáveis mínimas |
|---|---|
| API server local/Railway | `PORT` |
| Governança produção | `GOVERNANCE_TOKEN` |
| Mutações financeiras protegidas | `FINANCIAL_AUTH_TOKEN`, `FINANCIAL_AUTH_SCOPES` |
| DB financeiro | `DATABASE_URL` |
| Mercado Pago real | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_NOTIFICATION_URL`, `FINANCIAL_AUTH_TOKEN`, `DATABASE_URL` |
| Supabase real | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, chaves públicas `VITE_*`/`EXPO_PUBLIC_*` |
| Mobile API | `EXPO_PUBLIC_DOMAIN` |
| Railway readiness | `RAILWAY_ENVIRONMENT`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_PUBLIC_DOMAIN`, `PORT` |

Segredos mais críticos: `FINANCIAL_AUTH_TOKEN`, `DATABASE_URL`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOVERNANCE_TOKEN`.

## Recommendations

### Liberar para Missão 03 com restrição

Recomendação: **liberar Missão 03 — Railway Backend Deployment Readiness**, mas apenas para readiness/deploy backend. Não ativar Supabase, Mercado Pago ou pagamentos reais.

### Checklist para Missão 03

1. Validar `PORT` e `/api/healthz` no Railway.
2. Confirmar build do `@workspace/api-server`.
3. Definir política de CORS production.
4. Definir estratégia de secrets por ambiente.
5. Provisionar/validar `DATABASE_URL` somente como readiness de DB, sem transacionar pagamentos reais.
6. Confirmar logs, restart policy e rollback.
7. Confirmar que `ALLOW_UNSIGNED_MP_WEBHOOKS` não está setado em produção.
8. Separar checklist de Mercado Pago para missão posterior.

### Bloquear ainda

- Ativação real de Mercado Pago.
- Registro/uso real de webhook Mercado Pago.
- Conexão operacional Supabase.
- Tráfego financeiro real.
- Mudanças de regra de negócio.

## Next Mission

| Campo | Valor |
|---|---|
| ID | 03 |
| Título | Railway Backend Deployment Readiness |
| Status sugerido | Liberada com restrições |
| Bloqueios resolvidos pela 02B | Runtime Mapping Complete, Environment Audit Complete, Dependency Audit Complete |
| Restrições remanescentes | Sem integrações externas reais; foco em deploy readiness. |

## Mapas gerados

- `API_MAP.md`
- `WORKER_MAP.md`
- `WEBHOOK_MAP.md`
- `SERVICE_DEPENDENCY_MAP.md`
- `RUNTIME_ARCHITECTURE.md`
- `ENVIRONMENT_VARIABLES_AUDIT.md`
