# RAILWAY_DEPLOYMENT_REPORT.md — MISSÃO 03 Railway Backend Deployment Readiness

> Este relatório não representa deploy executado. É um plano/estado de readiness para deploy Railway.

## 1. Decisão de deploy readiness

| Campo | Valor |
|---|---|
| Missão | 03 — Railway Backend Deployment Readiness |
| Status | APPROVED_WITH_CONDITIONS |
| Production Readiness Score | 92/100 |
| Deploy em produção executado? | Não |
| Supabase conectado? | Não |
| Mercado Pago conectado? | Não |
| Regras de negócio alteradas? | Não |

## 2. Serviços recomendados para Railway

### Serviço principal obrigatório

| Serviço Railway | Source | Build command | Start command | Healthcheck |
|---|---|---|---|---|
| `api-server` | `.railway/api-server/railway.json` | `pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build` | `pnpm --filter @workspace/api-server run start` | `/api/healthz` |

### Serviços auxiliares opcionais

| Serviço | Start command | Healthcheck | Quando criar |
|---|---|---|---|
| `operator-api` | `node api/runtime/operatorApiServer.cjs` | `/healthz` | Se operador/runtime local precisar serviço isolado. |
| `dashboard-api-v2` | `node api/dashboard/dashboardApiV2.cjs` | `/healthz` | Se dashboard agregador precisar deploy separado. |
| `conversion-api` | `node api/conversion/conversionApi.cjs` | `/healthz` | Se conversão standalone precisar deploy separado. |
| `realtime-gateway` | `node gateway/realtime/wsGateway.cjs` | `/healthz` | Se WebSocket runtime for separado do API server. |

## 3. Variáveis Railway por fase

| Fase | Configurar | Não configurar ainda |
|---|---|---|
| M03 Railway backend | `PORT` automático, `NODE_ENV=production`, `BASE_PATH=/` quando aplicável, `GOVERNANCE_TOKEN` se governança exposta | Supabase real, Mercado Pago real. |
| M03 DB readiness opcional | `DATABASE_URL` somente se objetivo for validar Postgres sem transacionar pagamentos | `MERCADO_PAGO_ACCESS_TOKEN`, webhook real. |
| M04 Supabase readiness | Supabase vars completas sob protocolo próprio | Mercado Pago. |
| Missão futura Mercado Pago | Mercado Pago vars e webhook secret | Ativação antes de readiness/security. |

## 4. Reference checks

| Check | Status | Evidência |
|---|---|---|
| Healthcheck endpoint configurado | Pass | `/api/healthz` no API server; `/healthz` nos auxiliares. |
| Serviço responde no PORT Railway | Pass | Todos os serviços HTTP backend priorizam `process.env.PORT`. |
| Variáveis obrigatórias documentadas | Pass | `RAILWAY_ENVIRONMENT_AUDIT.md`. |
| Logs de inicialização consistentes | Pass with gaps | API server usa pino; auxiliares usam stdout simples. |
| Dependências de produção identificadas | Pass | `SERVICE_RUNTIME_MATRIX.md`. |

## 5. Bloqueios para produção real

| Bloqueio | Impacto | Missão responsável |
|---|---|---|
| Supabase não preparado | Bloqueia live data/Supabase runtime real | Missão 04. |
| Mercado Pago não preparado | Bloqueia pagamentos reais | Missão futura de pagamentos. |
| CORS production não restrito | Risco de exposição | Antes de tráfego externo real. |
| Fila/persistência runtime local | Limita escala de workers | Evolução runtime pós-readiness. |
| Observability externa ausente | Limita operação 24/7 | Antes de go-live. |

## 6. Runbook mínimo de validação Railway

1. Criar serviço `api-server` a partir de `.railway/api-server/railway.json`.
2. Confirmar `NODE_ENV=production`.
3. Confirmar que Railway injeta `PORT`.
4. Deployar build sem configurar Supabase/Mercado Pago.
5. Validar `GET https://<railway-domain>/api/healthz`.
6. Validar `GET https://<railway-domain>/api/v1/runtime/readiness` sem exigir integrações externas reais.
7. Revisar logs de startup para `Server listening`.
8. Manter rotas financeiras protegidas sem `FINANCIAL_AUTH_TOKEN` se pagamentos reais não estiverem autorizados.

## 7. Próxima missão

**04 — Supabase Readiness Protocol** deve iniciar somente após a aprovação formal deste readiness e com escopo restrito a variáveis, segurança de chaves, ambiente Railway e validação sem impactar regras de negócio.
