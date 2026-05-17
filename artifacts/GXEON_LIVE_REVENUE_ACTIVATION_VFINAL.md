# GXEON_LIVE_REVENUE_ACTIVATION_VFINAL

## summary
Estado atual: loop autônomo está funcional de ponta a ponta no runtime (Radar -> task -> consumo -> dedução -> comissão -> webhook -> dashboard).
Push final: webhook ficou mais rígido para `payment.approved`, follow-up pendente ganhou canais WhatsApp+Email com retry e adicionamos safeguard anti-abuso em transferências (rate limit por wallet).
Próximo passo crítico para PIX real em produção: configurar webhook oficial Mercado Pago com segredo real e payload real de `payment.approved`.

## full_loop
1. X-Radar gera sinais e tasks vendáveis.
2. Agente consumidor paga em créditos (credit gate).
3. Commission engine retém taxa da plataforma e liquida produtor.
4. Webhook Mercado Pago recebe evento:
   - `payment.approved` => ativa crédito instantâneo.
   - `pending` => entra em fila de follow-up com canais WhatsApp/Email + retry.
5. Revenue dashboard consolida GMV, receita, tarefas liquidadas e pendências PIX.

## code_changes
- `server/runtime/mercadoWebhookRuntime.cjs`
  - approved gating explícito (`status=APPROVED` ou `action=PAYMENT.APPROVED`)
  - follow-up com múltiplos canais (WhatsApp + Email)
  - retry processor com dispatch metadata
- `server/runtime/creditRuntime.cjs`
  - rate limit anti-abuso em transferências (janela de 60s)

## testing_commands
```bash
curl -X POST http://localhost:3000/api/v1/runtime/credits/wallet -H 'content-type: application/json' -d '{"agent_id":"platform_treasury","initial_balance":50000,"credit_limit":0}'
curl -X POST http://localhost:3000/api/v1/runtime/credits/wallet -H 'content-type: application/json' -d '{"agent_id":"buyer_live_vf","initial_balance":120,"credit_limit":200}'
curl -X POST http://localhost:3000/api/v1/runtime/tasks/generate-from-radar -H 'content-type: application/json' -d '{"count":2,"consumer_agent_id":"buyer_live_vf"}'
curl -X POST http://localhost:3000/api/v1/runtime/tasks/run-cycle -H 'content-type: application/json' -d '{"max_tasks":2}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_realistic_approved_1","action":"payment.approved","transaction_amount":200,"metadata":{"agent_id":"buyer_live_vf"}}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_realistic_pending_1","status":"pending","customer":{"email":"buyer@live.com","phone":"+5511999999999"}}'
curl -X POST http://localhost:3000/api/v1/runtime/pix/followups/process -H 'content-type: application/json' -d '{"limit":10}'
curl http://localhost:3000/api/v1/runtime/revenue-dashboard
```

## 14_day_revenue_plan
- D1-D3: webhook Mercado Pago real + secret em produção + validação de payload real.
- D4-D6: integração real de envio WhatsApp/Email para follow-up pendente.
- D7-D10: persistência transacional (Supabase/Postgres) para ledger e follow-ups.
- D11-D14: rollout comercial (Pro + pay-per-signal) e tracking KPI: approved/day, revenue/day, pending->approved.
