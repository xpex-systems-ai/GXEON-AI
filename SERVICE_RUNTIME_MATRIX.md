# SERVICE_RUNTIME_MATRIX.md — MISSÃO 03 Railway Backend Deployment Readiness

> Escopo: comandos de build/start, dependências runtime e logs iniciais. Nenhum deploy foi executado.

## 1. Matriz de serviços backend

| Serviço | Build command | Start command | Porta | Health | Dependências runtime | Log inicial esperado | Status |
|---|---|---|---|---|---|---|---|
| API server | `pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build` | `pnpm --filter @workspace/api-server run start` | `PORT` obrigatório | `/api/healthz` | Express, pino, cors, api-zod, db package | `Server listening` com port | Ready. |
| Operator API | N/A ou root install | `node api/runtime/operatorApiServer.cjs` | `PORT` no Railway | `/healthz` | Node built-ins + analytics/runtime | `[GXEON_OPERATOR_API] listening on <port>` | Ready standalone. |
| Dashboard API | N/A ou root install | `node api/dashboard/dashboardApiV2.cjs` | `PORT` no Railway | `/healthz` | Node built-ins + analytics/dashboard | `dashboard api on` | Ready standalone. |
| Conversion API | N/A ou root install | `node api/conversion/conversionApi.cjs` | `PORT` no Railway | `/healthz` | Node built-ins + conversion runtime/model | `conversion api on` | Ready standalone. |
| Realtime gateway | N/A ou root install | `node gateway/realtime/wsGateway.cjs` | `PORT` no Railway | `/healthz` | `ws`, Node built-ins | `WS gateway on <port>` | Ready; `ws` declarado como dependência runtime. |
| Worker base | N/A | `node tools/run_live_runtime.cjs` | N/A | N/A | runtime worker/dispatcher/engine | JSON result | Local/smoke, not HTTP Railway service. |
| Schedulers | Bundled in API server | Acionados por rotas protegidas | API server `PORT` | API server `/api/healthz` | runtime memory, payment, credits, X-Radar | API logs | Ready as API functions; real finance blocked by env. |
| Webhooks | Bundled in API server | `POST /api/v1/webhooks/mercado-pago` | API server `PORT` | API server `/api/healthz` | Mercado webhook runtime | API logs per request | Mapped only; not externally activated. |

## 2. Package scripts validados

| Package | Script | Resultado da auditoria |
|---|---|---|
| root | `pnpm run typecheck` | Passou. |
| root | `pnpm run build:libs` | Passou. |
| `@workspace/api-server` | `build` | Passou via `pnpm --filter @workspace/api-server run build`. |
| `@workspace/api-server` | `start` | Validado com `PORT=4010` e health HTTP 200. |
| `@workspace/gxeon-dashboard` | `serve` | Config Railway usa `PORT=$PORT BASE_PATH=...`; não executado como backend target. |
| `@workspace/gxeon-dashboard-mobile` | `serve` | Static server usa `process.env.PORT || 3000`; não executado como backend target. |

## 3. Dependências de produção identificadas

| Serviço | Dependências críticas |
|---|---|
| API server | `express`, `cors`, `pino`, `pino-http`, `@workspace/api-zod`, `@workspace/db`, `drizzle-orm`. |
| Financial DB path | `pg` disponível via `lib/db/node_modules/pg` no runtime atual. |
| Realtime gateway | `ws`. |
| Dashboard/mobile builds | React/Vite/Expo toolchain conforme packages; escopo frontend/static. |
| Auxiliary CJS APIs | Node built-ins e módulos internos do repositório. |

## 4. Logs iniciais e observabilidade

| Serviço | Log inicial | Observabilidade atual | Gap |
|---|---|---|---|
| API server | Pino `Server listening` | pino-http por request | Falta sink externo configurado. |
| Operator API | Console log simples | stdout | Sem logger estruturado. |
| Dashboard API | Console log simples | stdout | Sem logger estruturado. |
| Conversion API | Console log simples | stdout | Sem logger estruturado. |
| Realtime gateway | Console log simples | stdout + WS events | Sem métricas de conexões. |

## 5. Validação de startup

A validação local confirmou que o API server constrói, inicia com `PORT` e responde healthcheck. Serviços auxiliares foram validados por import/start em portas efêmeras, evitando conflito e sem conectar integrações externas.
