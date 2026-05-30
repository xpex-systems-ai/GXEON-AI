# GXEON_MONETIZATION_AUDIT

## Objetivo

Localizar o caminho mais curto para monetização real do runtime GXEON, separando o que já existe como fluxo financeiro local do que ainda falta para cobrar PIX real via Mercado Pago em produção.

## Executive Summary

- **Status Mercado Pago:** existe apenas runtime local com `provider: "mercado_pago"`; não há SDK oficial Mercado Pago instalado nem chamada HTTP/API real para criação de cobrança PIX.
- **Status PIX:** o fluxo cria registros locais `PENDING`, processa webhooks simulados/recebidos e ativa créditos/subscriptions em memória local.
- **Persistência financeira:** pagamentos, ledger, wallets, subscriptions, follow-ups e settlements são persistidos em `artifacts/runtime-memory.json` via `server/runtime/runtimeMemory.cjs`, não em Supabase/Postgres transacional.
- **Readiness para pagamento real:** **NOT_READY** até implementar adapter Mercado Pago real, schema financeiro persistente, webhook seguro com raw body/secret obrigatório e reconciliação.
- **Caminho mais curto para receita:** implementar um adapter Mercado Pago PIX mínimo no backend, persistir em Supabase/Postgres, expor checkout PIX ao dashboard e validar webhook aprovado end-to-end.

## Mercado Pago Status

| Item | Estado | Evidência |
| --- | --- | --- |
| SDK oficial Mercado Pago | **Ausente** | Busca em manifests e lockfile não encontrou `mercadopago`, `mercado-pago` ou `@mercadopago/*`. |
| Provider marcado como Mercado Pago | **Presente, local** | `createPixPayment` cria objeto com `provider: 'mercado_pago'`. |
| Criação de cobrança PIX real | **Ausente** | `createPixPayment` gera ID local `pix_<timestamp>`, status `PENDING`, grava em memória e retorna o objeto, sem SDK/fetch/HTTP externo. |
| Webhook Mercado Pago | **Parcial** | Existe rota `/api/v1/webhooks/mercado-pago` que chama `processWebhook`. |
| Segurança webhook | **Bloqueador** | `verifyWebhookSignature` aceita qualquer payload quando `MERCADO_PAGO_WEBHOOK_SECRET` não está configurado. |

## PIX Flow Atual

1. `POST /api/v1/runtime/payments/create` chama `createPixPayment(req.body)`.
2. `createPixPayment` gera um ID local, cria pagamento `PENDING`, marca provider `mercado_pago` e grava no array `payments` da memória local.
3. `POST /api/v1/runtime/payments/auto` chama `executeAutonomousPixRun`, que cria múltiplos pagamentos PIX locais via `createPixPayment`.
4. `POST /api/v1/runtime/credits/auto-topup` chama `autoTopupViaPix`, cria pagamento local e adiciona item em `pending_pix_followups`.
5. `POST /api/v1/webhooks/mercado-pago` chama `processWebhook`.
6. Se o webhook for `APPROVED` ou `payment.approved`, o runtime transfere créditos de `platform_treasury` para o agente e, se houver plano válido, ativa subscription.
7. Se o webhook for `PENDING`, o runtime adiciona follow-up por WhatsApp/Email quando houver contato no payload.
8. O estado resultante é escrito em `runtime-memory.json` através de `writeMemory`.

## Todas as Chamadas PIX Localizadas

| Chamada/arquivo | Tipo | Status |
| --- | --- | --- |
| `server/runtime/paymentRuntime.cjs:createPixPayment` | Criação PIX local | Mock/local, sem provider externo |
| `server/runtime/paymentOrchestrator.cjs:executeAutonomousPixRun` | Geração autônoma de PIX | Mock/local |
| `server/runtime/autonomousRevenueScheduler.cjs:autoTopupViaPix` | Top-up PIX automático | Mock/local |
| `server/runtime/mercadoWebhookRuntime.cjs:processWebhook` | Recebimento webhook | Parcial, depende de payload recebido/simulado |
| `scripts/runtime_pix_smoke_test.cjs` | Smoke test PIX | Simula webhook aprovado com HMAC local |
| `artifacts/api-server/src/routes/runtime.ts` | Rotas HTTP PIX/payment | Expõe endpoints acima |

## Onde Pagamentos São Persistidos

- `paymentRuntime` lê e escreve `mem.payments` via `readMemory/writeMemory`.
- `mercadoWebhookRuntime` atualiza `payments`, `financial_events`, `pending_pix_followups`, `revenue_notifications` e `webhook_processed_ids` em memória local.
- `creditRuntime` atualiza `credit_wallets` e `credit_ledger` em memória local.
- `commissionEngine` atualiza `commission_settlements` em memória local.
- `subscriptionRuntime` atualiza `subscriptions` e `subscription_events` em memória local.
- O arquivo físico atual é `artifacts/runtime-memory.json`.

## Schema Financeiro e Ledger

### Estado Atual

- Há biblioteca `@workspace/db` com PostgreSQL/Drizzle e exigência de `DATABASE_URL`.
- O schema Drizzle real está vazio/scaffold; não há tabelas financeiras implementadas em `lib/db/src/schema/index.ts`.
- O ledger funcional atual é `credit_ledger` em JSON local, não uma tabela transacional.

### Tabelas Obrigatórias para Produção

| Tabela | Finalidade | Prioridade |
| --- | --- | --- |
| `actors` | Identidade dos agentes/clientes que compram, vendem ou recebem créditos. | P0 |
| `actor_wallets` | Saldo, limite, total gasto/ganho por ator. | P0 |
| `global_transactions` | Registro canônico de cobrança: valor, status, provider, external reference, paid_at. | P0 |
| `payments` ou `payment_attempts` | Tentativas provider-level: Mercado Pago payment id, QR code, payload, status bruto. | P0 |
| `financial_ledger` ou `credit_ledger` | Ledger imutável de créditos/débitos com idempotency key. | P0 |
| `payment_webhook_events` | Eventos webhook raw/normalizados, assinatura, idempotency key, processed_at. | P0 |
| `pending_pix_followups` | Recuperação de PIX pendente e retentativas por canal. | P1 |
| `revenue_events` | Eventos de receita para dashboard/analytics. | P1 |
| `commission_settlements` | Split platform/produtor/consumidor por task. | P1 |
| `subscriptions` | Plano ativo por agente, datas, status, payment id. | P1 |
| `subscription_events` | Histórico de ativações/cancelamentos/renovações. | P1 |
| `api_keys` | Chaves de acesso, status e uso para monetização API. | P1 |
| `marketplace_datasets` | Produtos/datasets monetizáveis. | P2 |
| `dataset_purchases` | Compras de datasets e sua receita. | P2 |
| `provider_reconciliations` | Conciliação Mercado Pago x ledger interno. | P2 |

## Supabase Dependencies

| Área | Variáveis/tabelas | Estado |
| --- | --- | --- |
| Web dashboard | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Obrigatórias para páginas financeiras atuais |
| Mobile dashboard | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client opcional, fica `null` sem envs |
| Runtime server | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Apenas detectadas/validadas; runtime financeiro ainda usa JSON local |
| Postgres/Drizzle | `DATABASE_URL` | Obrigatório para `@workspace/db`, mas schema financeiro vazio |

Tabelas Supabase já referenciadas pelo dashboard: `global_transactions`, `actors`, `api_keys`, `actor_wallets`, `revenue_events`, `marketplace_datasets`, `dataset_purchases` e `transactions` no Topbar realtime.

## Real Payment Readiness

**Classificação:** `NOT_READY_FOR_REAL_CHARGE`.

Motivos:

1. Não há SDK oficial Mercado Pago instalado.
2. Não há chamada real para criação de cobrança PIX no provider.
3. Não há retorno de QR code, copia-e-cola PIX, payment id real ou checkout URL real.
4. Webhook aceita payload sem secret configurado.
5. Webhook usa `JSON.stringify(req.body)` em vez de raw body original, o que pode invalidar validação de assinatura provider-real.
6. Persistência crítica está em JSON local, sem transação, lock, RLS/policies, índices ou idempotência persistente no banco.
7. Schema financeiro Drizzle/Supabase não existe no repositório.
8. Dashboard lê tabelas Supabase que não são declaradas no schema versionado.

## Production Blockers

1. **Implementar adapter Mercado Pago real** com SDK oficial ou HTTP assinado, usando access token server-side.
2. **Adicionar schema financeiro versionado** para transactions, payments, ledger, webhooks, wallets, subscriptions e settlements.
3. **Migrar persistência de `runtime-memory.json` para Supabase/Postgres** nas rotas financeiras críticas.
4. **Tornar `MERCADO_PAGO_WEBHOOK_SECRET` obrigatório em produção** e rejeitar webhook sem assinatura válida.
5. **Capturar raw body no endpoint webhook** antes de `express.json()` ou com middleware específico.
6. **Adicionar idempotência persistente** por provider payment id + action/type + external reference.
7. **Implementar reconciliação** Mercado Pago -> banco interno.
8. **Expor checkout PIX real** ao frontend com QR code/copia-e-cola e status polling/realtime.
9. **Garantir que tabelas Supabase usadas pelo dashboard existem** e possuem RLS/policies apropriadas.
10. **Remover dependência de dados financeiros simulados** para métricas de revenue readiness.

## Fastest Path to Revenue

### P0 — 1 fluxo real mínimo

1. Criar `payments/mercadoPagoPixAdapter` no backend com método `createPixCharge({ amount, actorId, plan, externalReference })`.
2. Instalar SDK oficial Mercado Pago ou implementar cliente HTTP mínimo com `MERCADO_PAGO_ACCESS_TOKEN` server-side.
3. Criar migrations/tabelas P0: `actors`, `actor_wallets`, `global_transactions`, `payment_attempts`, `financial_ledger`, `payment_webhook_events`.
4. Substituir `createPixPayment` para persistir transação `PENDING` no banco e chamar Mercado Pago real.
5. Retornar para o frontend: `transaction_id`, `provider_payment_id`, `qr_code`, `qr_code_base64` ou `ticket_url` conforme resposta provider.
6. Ajustar webhook para raw body + secret obrigatório + idempotência em `payment_webhook_events`.
7. Em `payment.approved`, atualizar `global_transactions.status = PAID`, inserir ledger credit e ativar subscription em transação DB.
8. Adicionar tela/botão mínimo no dashboard para comprar plano/credit pack via PIX.
9. Criar smoke test realista com adapter mockado e teste de webhook idempotente.

### P1 — Operação segura

1. Conciliar pagamentos Mercado Pago diariamente.
2. Criar painel de PIX pendente com follow-up real.
3. Implementar alertas para webhook inválido, pagamento aprovado sem ledger e ledger sem transação.
4. Fechar permissões/RLS e separar service role apenas no backend.

## Conclusão

O caminho mais curto para monetização real não é expandir automações; é substituir a criação local de PIX por uma cobrança Mercado Pago real e persistir o estado financeiro em banco transacional. O runtime já tem nomes de domínio úteis (`payments`, `credit_ledger`, `subscriptions`, `commission_settlements`), mas hoje eles operam como simulação local. A primeira versão monetizável deve focar em um único produto PIX, uma única tabela canônica de transações, webhook seguro e ledger persistente.
