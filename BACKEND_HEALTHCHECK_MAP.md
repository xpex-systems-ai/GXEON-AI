# BACKEND_HEALTHCHECK_MAP.md — MISSÃO 03 Railway Backend Deployment Readiness

> Escopo: validação local/Railway readiness. Nenhum deploy foi executado e nenhuma integração externa foi conectada.

## 1. Resultado executivo de healthcheck

| Serviço backend | Tipo | Healthcheck | HTTP 200 local | Railway path recomendado | Status |
|---|---|---|---:|---|---|
| `@workspace/api-server` | Express API principal | `GET /api/healthz` | Sim | `/api/healthz` | Ready para Railway. |
| `api/runtime/operatorApiServer.cjs` | Node HTTP auxiliar | `GET /healthz` e `GET /api/healthz` | Sim | `/healthz` | Ready como serviço backend standalone se configurado no Railway. |
| `api/dashboard/dashboardApiV2.cjs` | Node HTTP auxiliar | `GET /healthz` e `GET /api/healthz` | Sim | `/healthz` | Ready como serviço backend standalone se configurado no Railway. |
| `api/conversion/conversionApi.cjs` | Node HTTP auxiliar | `GET /healthz` e `GET /api/healthz` | Sim | `/healthz` | Ready como serviço backend standalone se configurado no Railway. |
| `gateway/realtime/wsGateway.cjs` | WebSocket/HTTP gateway | `GET /healthz` e `GET /api/healthz` | Sim | `/healthz` | Ready como serviço realtime standalone; `ws` declarado como dependência runtime. |
| Workers base | Função/CLI, sem HTTP | N/A | N/A | N/A | Não é serviço Railway HTTP isolado; readiness por smoke/runtime. |
| Schedulers financeiros/X-Radar | Funções acionadas por API | Herdam health do `api-server` | Sim via API server | `/api/healthz` | Deployam junto do API server; mutações continuam bloqueadas por auth/env. |
| Webhook Mercado Pago | Rota inbound no API server | Herdam health do `api-server` | Sim via API server | `/api/healthz` | Rota mapeada, não ativada externamente. |

## 2. Endpoints health localizados/criados

| Endpoint | Implementação | Observações |
|---|---|---|
| `/api/healthz` | `artifacts/api-server/src/routes/health.ts` | Já existia; valida schema `HealthCheckResponse` e retorna `{ status: "ok" }`. |
| `/healthz` e `/api/healthz` | `api/runtime/operatorApiServer.cjs` | Criado para readiness Railway do serviço auxiliar. |
| `/healthz` e `/api/healthz` | `api/dashboard/dashboardApiV2.cjs` | Criado para readiness Railway do serviço auxiliar. |
| `/healthz` e `/api/healthz` | `api/conversion/conversionApi.cjs` | Criado para readiness Railway do serviço auxiliar. |
| `/healthz` e `/api/healthz` | `gateway/realtime/wsGateway.cjs` | Criado no servidor HTTP usado pelo WebSocket gateway. |

## 3. Readiness endpoints mapeados

| Rota | Serviço | Função |
|---|---|---|
| `GET /api/v1/runtime/readiness` | `@workspace/api-server` | Readiness agregado de runtime/produção. |
| `GET /api/v1/runtime/production` | `@workspace/api-server` | Status de produção/runtime. |
| `GET /api/v1/runtime/deployment` | `@workspace/api-server` | Integridade de deployment local/git. |
| `GET /api/v1/runtime/railway` | `@workspace/api-server` | Status Railway/configuração; não conecta Railway. |
| `GET /api/v1/runtime/financial-core` | `@workspace/api-server` | Status financeiro/DB por configuração. |
| `GET /api/runtime/snapshot` | Operator API auxiliar | Snapshot runtime local. |
| `GET /api/dashboard/runtime-health` | Dashboard API auxiliar | Saúde runtime agregada local. |
| `GET /api/conversion/snapshot` | Conversion API auxiliar | Snapshot de conversão local. |

## 4. Validação HTTP 200 executada

| Serviço | Comando de validação | Resultado |
|---|---|---|
| API server | `PORT=4010 pnpm --filter @workspace/api-server run start` + request `GET /api/healthz` | HTTP 200 validado. |
| Operator API | Server importado em porta efêmera + request `GET /healthz` | HTTP 200 validado. |
| Dashboard API | Server importado em porta efêmera + request `GET /healthz` | HTTP 200 validado. |
| Conversion API | Server importado em porta efêmera + request `GET /healthz` | HTTP 200 validado. |
| Realtime gateway | `RealtimeGateway().start(0)` + request `GET /healthz` | HTTP 200 validado. |

## 5. Pendências de healthcheck

Nenhum serviço backend HTTP mapeado ficou sem endpoint health. Workers e schedulers não possuem healthcheck HTTP próprio porque são funções/processos acionados pelo API server ou por scripts locais; para Railway, eles devem ser expostos como serviços separados apenas se houver necessidade operacional de processos long-running.
