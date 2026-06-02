# ENVIRONMENT_VARIABLES_AUDIT.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: variáveis encontradas por auditoria estática em código, scripts, exemplos `.env` e configs. Nenhum secret real foi lido ou solicitado.

## 1. Variáveis obrigatórias por contexto

### API server principal

| Variável | Obrigatória? | Consumidor | Risco se ausente |
|---|---:|---|---|
| `PORT` | Sim | `artifacts/api-server/src/index.ts`, Railway configs | Critical: API server não inicia. |
| `NODE_ENV` | Condicional | logger, governance auth, deployment checks | Medium: comportamento dev/prod pode divergir. |
| `LOG_LEVEL` | Opcional | logger | Low. |

### Mutações financeiras e revenue

| Variável | Obrigatória? | Consumidor | Segredo? | Risco |
|---|---:|---|---:|---|
| `FINANCIAL_AUTH_TOKEN` | Sim para mutações | `financialAuth.ts` | Sim | Critical: sem ela endpoints protegidos retornam 503. |
| `FINANCIAL_API_TOKEN` | Alternativa | `financialAuth.ts` | Sim | High: fallback. |
| `FINANCIAL_AUTH_SCOPES` | Recomendado | `financialAuth.ts` | Não necessariamente | High: controla permissões. |
| `FINANCIAL_API_SCOPES` | Alternativa | `financialAuth.ts` | Não necessariamente | High. |
| `FINANCIAL_RATE_LIMIT_WINDOW_MS` | Opcional | `financialAuth.ts` | Não | Medium se mal configurado. |
| `FINANCIAL_RATE_LIMIT_MAX_REQUESTS` | Opcional | `financialAuth.ts` | Não | Medium se permissivo demais. |
| `DATABASE_URL` | Sim para DB financeiro | `financialDb.cjs`, scripts DB | Sim | Critical: pagamentos/revenue persistente indisponível. |

### Mercado Pago

| Variável | Obrigatória? | Consumidor | Segredo? | Risco |
|---|---:|---|---:|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Sim para operação real | adapter, webhook, payment runtime | Sim | Critical. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Sim para webhook real | webhook runtime/checks | Sim | Critical. |
| `MERCADO_PAGO_NOTIFICATION_URL` | Sim para webhook delivery | adapter/checks/examples | Não sensível | High. |
| `MERCADO_PAGO_PUBLIC_KEY` | Opcional/cliente | adapter/examples | Não | Medium. |
| `MERCADO_PAGO_CLIENT_ID` | Opcional | adapter/examples | Parcial | Medium. |
| `MERCADO_PAGO_CLIENT_SECRET` | Opcional/secret | adapter/examples | Sim | High. |
| `MERCADO_PAGO_PIX_KEY` | Opcional/PIX config | adapter/examples | Sensível operacional | High. |
| `MERCADO_PAGO_DEFAULT_PAYER_EMAIL` | Opcional/teste | adapter/examples | PII leve | Low/Medium. |
| `MERCADO_PAGO_API_BASE` | Opcional | adapter | Não | Medium se apontar para host incorreto. |
| `MERCADO_PAGO_VALIDATION_PAYMENT_ID` | Opcional | activation checks | Não/operacional | Low. |
| `ALLOW_UNSIGNED_MP_WEBHOOKS` | Deve ser false/ausente em prod | webhook runtime | Não | Critical se habilitado. |
| `GXEON_ALLOW_REAL_PIX_VALIDATION` | Confirmação manual | activation check | Não | High. |
| `GXEON_OPERATOR_CONFIRMED_REAL_PIX` | Confirmação manual | activation check | Não | High. |
| `GXEON_REAL_PIX_VALIDATION_AMOUNT` | Validação | activation check | Não | Medium. |
| `GXEON_REAL_PIX_PAYMENT_CONFIRMED` | Validação | activation check | Não | Medium. |
| `GXEON_REAL_PIX_WEBHOOK_CONFIRMED` | Validação | activation check | Não | Medium. |

### Supabase

| Variável | Obrigatória? | Consumidor | Segredo? | Risco |
|---|---:|---|---:|---|
| `SUPABASE_URL` | Sim se Supabase habilitado | backend runtimes/scripts | Não secret, mas sensível | High. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim para backend real | activation checks/env examples | Sim | Critical. |
| `SUPABASE_ANON_KEY` | Condicional | examples/checks | Publicável | Medium. |
| `SUPABASE_PUBLISHABLE_KEY` | Alternativa | checks | Publicável | Medium. |
| `VITE_SUPABASE_URL` | Sim para web se Supabase | governance/frontend build checks | Não secret | Medium. |
| `VITE_SUPABASE_ANON_KEY` | Sim para web se Supabase | frontend/checks | Publicável | Medium. |
| `EXPO_PUBLIC_SUPABASE_URL` | Sim para mobile live data | mobile settings/client | Não secret | Medium. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sim para mobile live data | mobile settings/client | Publicável | Medium. |

### Railway/deploy

| Variável | Obrigatória? | Consumidor | Segredo? | Risco |
|---|---:|---|---:|---|
| `RAILWAY_ENVIRONMENT` | Condicional | railway runtime/checks | Não | Medium. |
| `RAILWAY_PROJECT_ID` | Condicional | railway runtime/checks | Não/operacional | Medium. |
| `RAILWAY_SERVICE_ID` | Condicional | activation checks | Não/operacional | Medium. |
| `RAILWAY_PUBLIC_DOMAIN` | Condicional | configs/mobile/API URLs | Não | High se ausente no frontend. |
| `RAILWAY_DEPLOYMENT_ID` | Opcional | activation checks | Não | Low. |
| `RAILWAY_STATIC_URL` | Opcional | railway runtime | Não | Low/Medium. |
| `RAILWAY_RESTART_POLICY` | Opcional | activation checks | Não | Low. |
| `PRODUCTION_BASE_URL` | Condicional | activation checks | Não | High para callbacks/readiness. |
| `DATABASE_BACKUP_VERIFIED` | Recomendado | activation checks | Não | High para go-live. |

### Frontend/build/mobile

| Variável | Obrigatória? | Consumidor | Risco |
|---|---:|---|---|
| `BASE_PATH` | Opcional | Vite/mobile serve/pages build | Medium se deploy em subpath. |
| `EXPO_PUBLIC_DOMAIN` | Sim para mobile API calls | mobile runtime/conversion/governance | High. |
| `EXPO_PUBLIC_REPL_ID` | Opcional | mobile build | Low. |
| `REPL_ID` | Opcional | Vite/mobile build | Low. |
| `REPLIT_INTERNAL_APP_DOMAIN` | Opcional | mobile build | Low. |
| `REPLIT_DEV_DOMAIN` | Opcional | mobile build/dev | Low. |
| `REPLIT_EXPO_DEV_DOMAIN` | Opcional dev | mobile package script | Low. |
| `REACT_NATIVE_PACKAGER_HOSTNAME` | Opcional/dev | mobile package script | Low. |

### Governança e observability

| Variável | Obrigatória? | Consumidor | Segredo? | Risco |
|---|---:|---|---:|---|
| `GOVERNANCE_TOKEN` | Sim em produção | governance auth | Sim | High: sem token, rotas bloqueiam 503; em dev pode liberar local. |
| `MONITORING_DSN` | Opcional | activation checks | Sim/endpoint | Low. |
| `SENTRY_DSN` | Opcional | activation checks | Sim/endpoint | Low. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Opcional | activation checks | Sim/endpoint | Low. |
| `ALERT_WEBHOOK_URL` | Opcional | activation checks | Sim | Medium. |
| `PAGERDUTY_ROUTING_KEY` | Opcional | activation checks | Sim | Medium. |
| `SLACK_WEBHOOK_URL` | Opcional | activation checks | Sim | Medium. |

### APIs auxiliares CJS

| Variável | Obrigatória? | Consumidor | Risco |
|---|---:|---|---|
| `PORT` | Obrigatória no Railway | APIs auxiliares e gateway realtime | Critical para deploy Railway; tem prioridade sobre fallbacks locais. |
| `GXEON_OPERATOR_API_PORT` | Opcional local | operator API | Low; default `8787`. |
| `GXEON_DASHBOARD_API_PORT` | Opcional local | dashboard API | Low; default `8791`. |
| `GXEON_CONVERSION_API_PORT` | Opcional local | conversion API | Low; default `8794`. |
| `GXEON_WS_PORT` | Opcional local | realtime gateway | Low; default `8790`. |

## 2. Inconsistências identificadas

| Inconsistência | Classificação | Detalhe |
|---|---|---|
| Supabase usa múltiplos nomes públicos/privados | Medium | `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_*`, `EXPO_PUBLIC_*`; precisa matriz por plataforma. |
| Financial auth tem aliases | Medium | `FINANCIAL_AUTH_TOKEN` e `FINANCIAL_API_TOKEN`; `FINANCIAL_AUTH_SCOPES` e `FINANCIAL_API_SCOPES`. |
| API server exige `PORT`, APIs CJS usam defaults | Medium | Deploy principal falha sem `PORT`, mas serviços auxiliares sobem com fallback. |
| Mercado Pago possui variáveis de confirmação real | High | Flags manuais devem impedir ativação acidental; manter bloqueadas até missão própria. |
| `ALLOW_UNSIGNED_MP_WEBHOOKS` existe | Critical | Qualquer ativação em produção seria risco crítico. |
| Frontend mobile depende de `EXPO_PUBLIC_DOMAIN` | High | Sem domínio, telas avisam que API calls não funcionarão. |

## 3. Segredos identificados

- `FINANCIAL_AUTH_TOKEN`, `FINANCIAL_API_TOKEN`.
- `DATABASE_URL`.
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_CLIENT_SECRET`, potencialmente `MERCADO_PAGO_PIX_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`; anon/publishable keys são publicáveis, mas ainda devem ser controladas por ambiente.
- `GOVERNANCE_TOKEN`.
- `SENTRY_DSN`, `MONITORING_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `ALERT_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY`, `SLACK_WEBHOOK_URL`.

## 4. Resposta às perguntas executivas de ambiente

- Variáveis obrigatórias mínimas para subir API principal: `PORT`.
- Variáveis obrigatórias para mutações financeiras: `FINANCIAL_AUTH_TOKEN` + escopos adequados.
- Variáveis obrigatórias para monetização real: `DATABASE_URL`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_NOTIFICATION_URL`, `FINANCIAL_AUTH_TOKEN`.
- Variáveis obrigatórias para mobile live/API: `EXPO_PUBLIC_DOMAIN`; Supabase mobile exige `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Variáveis obrigatórias para Supabase real: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e chaves públicas por cliente.
