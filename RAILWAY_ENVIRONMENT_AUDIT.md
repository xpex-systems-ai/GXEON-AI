# RAILWAY_ENVIRONMENT_AUDIT.md — MISSÃO 03 Railway Backend Deployment Readiness

> Escopo: inventário de variáveis para deploy Railway. Segredos reais não foram lidos, solicitados ou conectados.

## 1. Variáveis obrigatórias para Railway backend

| Variável | Obrigatória para M03? | Serviço | Tipo | Observação |
|---|---:|---|---|---|
| `PORT` | Sim | Todos os serviços HTTP | Runtime Railway | Injetada pelo Railway; API server falha de propósito se ausente. |
| `NODE_ENV` | Recomendado | API server, auth/governance, Vite | Config | Usar `production` no Railway. |
| `BASE_PATH` | Condicional | Dashboards/static | Config | Usar `/` se deploy root. |
| `GOVERNANCE_TOKEN` | Sim se rotas governance expostas | API server | Secret | Sem token, governance retorna 503 fora de dev. |
| `FINANCIAL_AUTH_TOKEN` | Sim para liberar mutações financeiras | API server | Secret | Para M03 pode permanecer não configurado se mutações devem ficar bloqueadas. |
| `FINANCIAL_AUTH_SCOPES` | Recomendado | API server | Config sensível | Escopos mínimos; default interno é `financial:*` se ausente após auth. |
| `FINANCIAL_RATE_LIMIT_WINDOW_MS` | Opcional | API server | Config | Default interno. |
| `FINANCIAL_RATE_LIMIT_MAX_REQUESTS` | Opcional | API server | Config | Default interno. |

## 2. Variáveis de integrações externas — documentadas, não ativadas

| Família | Variáveis | Status M03 |
|---|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Não configurar/conectar nesta missão; preparar para Missão 04. |
| Mercado Pago | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_NOTIFICATION_URL`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET`, `MERCADO_PAGO_PIX_KEY`, `MERCADO_PAGO_DEFAULT_PAYER_EMAIL`, `MERCADO_PAGO_API_BASE` | Não configurar/conectar nesta missão. |
| Postgres/DB | `DATABASE_URL` | Pode ser preparado como readiness, mas não deve ativar fluxos financeiros reais nesta missão. |
| Railway metadata | `RAILWAY_ENVIRONMENT`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_STATIC_URL`, `RAILWAY_RESTART_POLICY` | Injetadas/gerenciadas pelo Railway; documentadas para status. |
| Observability | `MONITORING_DSN`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `ALERT_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY`, `SLACK_WEBHOOK_URL` | Opcionais; configurar após estratégia de observabilidade. |

## 3. Variáveis por serviço

| Serviço | Obrigatórias | Opcionais/condicionais |
|---|---|---|
| `@workspace/api-server` | `PORT` | `NODE_ENV`, `GOVERNANCE_TOKEN`, `FINANCIAL_AUTH_TOKEN`, `FINANCIAL_AUTH_SCOPES`, `DATABASE_URL`, Supabase/Mercado Pago vars conforme missão futura. |
| Operator API auxiliar | `PORT` no Railway | `GXEON_OPERATOR_API_PORT` local. |
| Dashboard API auxiliar | `PORT` no Railway | `GXEON_DASHBOARD_API_PORT` local. |
| Conversion API auxiliar | `PORT` no Railway | `GXEON_CONVERSION_API_PORT` local. |
| Realtime gateway | `PORT` no Railway | `GXEON_WS_PORT` local. |
| Dashboard web | `PORT`, `BASE_PATH` | `REPL_ID`, `NODE_ENV`. |
| Dashboard mobile static | `PORT`, `BASE_PATH`, `EXPO_PUBLIC_DOMAIN` | `EXPO_PUBLIC_REPL_ID`, Supabase public vars para missão futura. |

## 4. Duplicidades/aliases detectados

| Variável/alias | Impacto | Decisão recomendada |
|---|---|---|
| `FINANCIAL_AUTH_TOKEN` vs `FINANCIAL_API_TOKEN` | Dois nomes para token financeiro | Padronizar `FINANCIAL_AUTH_TOKEN` em Railway. |
| `FINANCIAL_AUTH_SCOPES` vs `FINANCIAL_API_SCOPES` | Dois nomes para escopos | Padronizar `FINANCIAL_AUTH_SCOPES`. |
| `SUPABASE_ANON_KEY` vs `SUPABASE_PUBLISHABLE_KEY` | Chave pública Supabase com nomes alternativos | Definir matriz na Missão 04. |
| `VITE_SUPABASE_*` vs `EXPO_PUBLIC_SUPABASE_*` | Web e mobile exigem prefixes diferentes | Manter ambos quando Supabase for liberado. |
| `RAILWAY_PUBLIC_DOMAIN` vs `EXPO_PUBLIC_DOMAIN` | Mobile precisa domínio público explícito | Em build mobile usar `EXPO_PUBLIC_DOMAIN=${RAILWAY_PUBLIC_DOMAIN}`. |
| `PORT` vs `GXEON_*_PORT` | Railway exige `PORT`; locais têm fallbacks | `PORT` sempre vence no Railway. |

## 5. Segredos hardcoded

Resultado da auditoria: **nenhum segredo real hardcoded foi identificado** nos serviços backend preparados para Railway.

Observações:

- Arquivos `.env.*.example` contêm placeholders, não segredos reais.
- `scripts/production_activation_check.cjs` contém uma referência fixa de projeto Supabase (`project_ref`/URL). Isso não é tratado como segredo, mas deve ser revisado na Missão 04 para evitar acoplamento a ambiente específico.
- URLs/DSNs/webhooks de observability devem ser tratados como segredos no Railway.

## 6. Variáveis que faltam para Missão 04

Missão 04 — Supabase Readiness Protocol — permanece bloqueada até definir pelo menos:

- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_ANON_KEY` ou `SUPABASE_PUBLISHABLE_KEY`.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` se mobile live data for escopo.
