# GXEON_MAKE_REAL_PIX_FALL_VFINAL

## summary
Estado atual: o loop autônomo está operacional (Radar -> task vendável -> consumo -> dedução -> comissão -> webhook -> dashboard).
Melhoria final aplicada: webhook `payment.approved` com notificação de ativação de crédito e deduplicação de pendentes para evitar ruído operacional.
O que falta para revenue real: webhook oficial Mercado Pago em produção + canais reais WhatsApp/Email + persistência transacional fora de memória local.
Meta de curto prazo: primeiros R$5k–15k em 14 dias com Pro + pay-per-signal + execution fee.

## webhook_improvement
Arquivo: `server/runtime/mercadoWebhookRuntime.cjs`
- Gating forte de evento aprovado: `status=APPROVED` ou `action=PAYMENT.APPROVED`.
- Auto top-up instantâneo para wallet do agente no approved.
- Fallback pending com fila de follow-up multicanal.
- Deduplicação de pendentes abertos para não criar múltiplas entradas do mesmo payment.
- Geração de `revenue_notifications` quando crédito é ativado.

## followup_system
Arquivo: `server/runtime/mercadoWebhookRuntime.cjs`
- `processPendingPixFollowups()` processa fila pendente por lote.
- Registra tentativas, agenda `next_retry_at`, move status para `RETRY_QUEUED` e depois `ESCALATED`.
- Mantém metadata de dispatch por canal (WhatsApp/Email) para auditoria operacional.

## testing_commands
```bash
curl -X POST http://localhost:3000/api/v1/runtime/credits/wallet -H 'content-type: application/json' -d '{"agent_id":"platform_treasury","initial_balance":50000,"credit_limit":0}'
curl -X POST http://localhost:3000/api/v1/runtime/credits/wallet -H 'content-type: application/json' -d '{"agent_id":"buyer_live_real","initial_balance":150,"credit_limit":250}'
curl -X POST http://localhost:3000/api/v1/runtime/tasks/generate-from-radar -H 'content-type: application/json' -d '{"count":3,"consumer_agent_id":"buyer_live_real"}'
curl -X POST http://localhost:3000/api/v1/runtime/tasks/run-cycle -H 'content-type: application/json' -d '{"max_tasks":3}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_final_approved_1","action":"payment.approved","transaction_amount":300,"metadata":{"agent_id":"buyer_live_real"}}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_final_pending_1","status":"pending","customer":{"email":"buyer@real.com","phone":"+5511999990000"}}'
curl -X POST http://localhost:3000/api/v1/runtime/pix/followups/process -H 'content-type: application/json' -d '{"limit":10}'
curl http://localhost:3000/api/v1/runtime/revenue-dashboard
```

## 14_day_revenue_plan
- D1-D2: apontar webhook real Mercado Pago + segredo HMAC + teste sandbox e produção.
- D3-D4: conectar provider real WhatsApp/Email para follow-up.
- D5-D7: ativar auth/rate-limit em endpoints financeiros e premium signals.
- D8-D10: persistir ledger/pending/notifications em Supabase/Postgres com idempotência.
- D11-D14: lançar oferta Pro + pay-per-signal e acompanhar KPI diário (approved PIX, GMV, revenue líquida).
