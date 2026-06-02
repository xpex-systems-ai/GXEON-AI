# WEBHOOK_MAP.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: mapeamento estático. Nenhum webhook externo foi registrado, chamado ou validado contra Mercado Pago.

## 1. Webhooks identificados

| Webhook | Método | Rota | Serviço | Controller | Status |
|---|---|---|---|---|---|
| Mercado Pago | POST | `/api/v1/webhooks/mercado-pago` | `artifacts/api-server` | `processWebhook` em `server/runtime/mercadoWebhookRuntime.cjs` | Mapeado; não ativado. |

Não foram identificadas outras rotas explícitas de webhook de terceiros no código executável principal.

## 2. Fluxo do webhook Mercado Pago

```text
Mercado Pago notification
  -> POST /api/v1/webhooks/mercado-pago
  -> express.json verify captura rawBody
  -> route lê headers:
       x-signature | x-mercado-signature
       x-request-id
     e query/body:
       data.id | id | body.data.id
  -> processWebhook(payload, metadata)
       -> valida assinatura/secret conforme configuração
       -> consulta/adapta pagamento via mercadoPagoAdapter quando aplicável
       -> atualiza runtimeMemory/subscriptionRuntime/financialDb
  -> HTTP 200 se accepted=true; HTTP 401 se rejected; HTTP 500 em exceção
```

## 3. Eventos/payloads mapeados

O payload exato aceito pelo controller é flexível (`req.body ?? {}`), com extração especial de:

| Campo | Origem | Uso |
|---|---|---|
| `x-signature` | header | Assinatura preferencial. |
| `x-mercado-signature` | header | Assinatura alternativa. |
| `x-request-id` | header | Rastreamento/idempotência operacional. |
| `data.id` | query | Identificador de pagamento/notificação. |
| `id` | query | Identificador alternativo. |
| `body.data.id` | body JSON | Fallback de identificador. |
| `rawBody` | corpo bruto capturado no middleware JSON | Base para validação de assinatura. |

## 4. Segurança

| Controle | Implementação | Classificação | Observação |
|---|---|---|---|
| Captura de corpo bruto | `express.json({ verify })` | Low risk | Necessário para HMAC/assinatura. |
| Secret | `MERCADO_PAGO_WEBHOOK_SECRET` | Critical | Ausência compromete validação; scripts/auditorias tratam como bloqueio. |
| Bypass | `ALLOW_UNSIGNED_MP_WEBHOOKS` | Critical | Deve permanecer desabilitado em produção. |
| Token Mercado Pago | `MERCADO_PAGO_ACCESS_TOKEN` | Critical | Necessário para consulta/adaptação de pagamentos. |
| Banco financeiro | `DATABASE_URL` | Critical | Necessário para persistência financeira real. |
| Idempotência | Runtime/webhook + memória/DB conforme caminho | High | Precisa ser validada em produção com DB real. |

## 5. Dependências

| Módulo | Função no webhook |
|---|---|
| `mercadoWebhookRuntime.cjs` | Processamento do payload, validação e followups. |
| `mercadoPagoAdapter.cjs` | Adapter Mercado Pago; depende de access token/API base/env. |
| `runtimeMemory.cjs` | Estado local em filesystem/memória. |
| `subscriptionRuntime.cjs` | Ativação/assinaturas ligadas a pagamento. |
| `financialDb.cjs` | Persistência Postgres via `DATABASE_URL`. |

## 6. Pontos críticos

- Webhook é o ponto mais sensível de entrada externa.
- Produção deve bloquear webhooks sem assinatura; `ALLOW_UNSIGNED_MP_WEBHOOKS` é aceitável apenas para laboratório controlado.
- A rota não aplica `financialMutation`, portanto sua segurança depende da assinatura do provedor e do secret.
- Não há evidência de registro automático do webhook no Mercado Pago dentro do repositório; apenas `MERCADO_PAGO_NOTIFICATION_URL` esperado.
