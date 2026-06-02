# PORT_COMPLIANCE_REPORT.md — MISSÃO 03 Railway Backend Deployment Readiness

> Requisito Railway: todo serviço HTTP deve escutar `process.env.PORT`.

## 1. Resumo de compliance

| Serviço | Entrada | PORT compliance | Porta fallback local | Status Railway |
|---|---|---:|---:|---|
| `@workspace/api-server` | `artifacts/api-server/src/index.ts` | Sim, `PORT` obrigatório | Nenhum fallback | Ready. |
| `api/runtime/operatorApiServer.cjs` | `node api/runtime/operatorApiServer.cjs` | Sim, `process.env.PORT` priorizado | `GXEON_OPERATOR_API_PORT` ou `8787` | Ready como standalone. |
| `api/dashboard/dashboardApiV2.cjs` | `node api/dashboard/dashboardApiV2.cjs` | Sim, `process.env.PORT` priorizado | `GXEON_DASHBOARD_API_PORT` ou `8791` | Ready como standalone. |
| `api/conversion/conversionApi.cjs` | `node api/conversion/conversionApi.cjs` | Sim, `process.env.PORT` priorizado | `GXEON_CONVERSION_API_PORT` ou `8794` | Ready como standalone. |
| `gateway/realtime/wsGateway.cjs` | `node gateway/realtime/wsGateway.cjs` | Sim, `process.env.PORT` priorizado | `GXEON_WS_PORT` ou `8790` | Ready como standalone; depende de `ws`. |
| `gxeon-dashboard` | Vite preview | Sim via `PORT=$PORT` no Railway config | Nenhum em config runtime | Ready frontend/static. |
| `gxeon-dashboard-mobile` | Node static server | Sim via `process.env.PORT || 3000` | `3000` | Ready frontend/static. |
| `mockup-sandbox` | Vite preview | Sim via `PORT=$PORT` no Railway config | N/A | Ready sandbox. |
| `api-client-react` library health service | inline Node health service | Sim via `process.env.PORT || 3000` | `3000` | Ready only as library-health placeholder. |

## 2. Portas fixas/incompatibilidades encontradas

| Local | Antes | Ajuste/decisão | Risco remanescente |
|---|---|---|---|
| `api/runtime/operatorApiServer.cjs` | Priorizava `GXEON_OPERATOR_API_PORT || 8787` | Agora prioriza `process.env.PORT` | Baixo; fallback permanece só para local. |
| `api/dashboard/dashboardApiV2.cjs` | Priorizava `GXEON_DASHBOARD_API_PORT || 8791` | Agora prioriza `process.env.PORT` | Baixo; fallback permanece só para local. |
| `api/conversion/conversionApi.cjs` | Priorizava `GXEON_CONVERSION_API_PORT || 8794` | Agora prioriza `process.env.PORT` | Baixo; fallback permanece só para local. |
| `gateway/realtime/wsGateway.cjs` | Priorizava `GXEON_WS_PORT || 8790` | Agora prioriza `process.env.PORT` | Baixo; fallback permanece só para local. |
| `tests/realtime/realtime_gateway_smoke.cjs` | Usa portas fixas `8792`/`8793` | Teste local apenas, não deploy Railway | Nenhum para produção. |
| Tools/smokes | Usam porta efêmera `0` | Adequado para teste | Nenhum. |

## 3. Configurações Railway já existentes

| Serviço Railway | Config | Start command | Healthcheck | Restart |
|---|---|---|---|---|
| API server | `.railway/api-server/railway.json` e `artifacts/api-server/railway.json` | `pnpm --filter @workspace/api-server run start` | `/api/healthz` | `ON_FAILURE`, 10 retries. |
| Dashboard web | `.railway/gxeon-dashboard/railway.json` e `artifacts/gxeon-dashboard/railway.json` | `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard run serve` | `/` | `ON_FAILURE`, 10 retries. |
| Dashboard mobile | `.railway/gxeon-dashboard-mobile/railway.json` e `artifacts/gxeon-dashboard-mobile/railway.json` | `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard-mobile run serve` | `/` | `ON_FAILURE`, 10 retries. |
| Mockup sandbox | `.railway/mockup-sandbox/railway.json` | `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/mockup-sandbox run preview -- --host 0.0.0.0` | `/` | `ON_FAILURE`, 10 retries. |
| API client library | `lib/api-client-react/railway.json` | inline Node health service using `process.env.PORT` | `/` | `ON_FAILURE`, 10 retries. |

## 4. Comandos standalone Railway-ready para backends auxiliares

Caso sejam promovidos a serviços separados no Railway, usar:

| Serviço | Build | Start | Healthcheck |
|---|---|---|---|
| Operator API | `pnpm install --frozen-lockfile` | `node api/runtime/operatorApiServer.cjs` | `/healthz` |
| Dashboard API | `pnpm install --frozen-lockfile` | `node api/dashboard/dashboardApiV2.cjs` | `/healthz` |
| Conversion API | `pnpm install --frozen-lockfile` | `node api/conversion/conversionApi.cjs` | `/healthz` |
| Realtime gateway | `pnpm install --frozen-lockfile` | `node gateway/realtime/wsGateway.cjs` | `/healthz` |

## 5. Decisão PORT compliance

**Aprovado para Missão 03:** todos os serviços HTTP backend mapeados agora suportam `process.env.PORT`. Os fallbacks numéricos permanecem apenas para execução local/testes e não impedem Railway.
