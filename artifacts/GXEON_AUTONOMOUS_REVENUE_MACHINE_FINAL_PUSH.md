# GXEON_AUTONOMOUS_REVENUE_MACHINE_FINAL_PUSH

## summary
Loop fechado implementado: Radar gera sinal/task vendável, agente consome, crédito é debitado, comissão da plataforma é liquidada, webhook PIX aprovado ativa saldo, e pendências de PIX entram em fila com retry automático.

## full_revenue_loop
```text
X-Radar Scan
  -> Generate Sellable Task/Signal
  -> Agent Consume (credit gate)
  -> Auto Credit Deduct
  -> Commission Settlement (platform take-rate)
  -> PIX Webhook Listener
      -> approved: instant credit top-up
      -> pending: enqueue follow-up + retry processor
  -> Revenue Dashboard Metrics
```

## critical_code
- `server/runtime/autonomousRevenueScheduler.cjs`
  - `generateSellableTasksFromRadar` e `runSchedulerCycle` com settlement/refund.
- `server/runtime/mercadoWebhookRuntime.cjs`
  - `processWebhook` para approved/pending
  - `processPendingPixFollowups` para fila + retry/escalation.
- `server/runtime/revenueDashboardRuntime.cjs`
  - métricas reais de revenue: platform revenue, GMV, signals delivered, pending followups.
- `artifacts/api-server/src/routes/runtime.ts`
  - endpoints finais de monetização/observabilidade.

## 14_day_plan
1. D1-D2: conectar webhook real Mercado Pago com segredo válido e validar evento approved real.
2. D3-D4: integrar envio real de follow-up (WhatsApp/Email provider) e retries.
3. D5-D7: aplicar auth/rate-limit em rotas financeiras e premium signals.
4. D8-D10: persistir ledger/followups/subscriptions em Supabase/Postgres com idempotência.
5. D11-D14: lançar oferta comercial (Pro + pay-per-signal) e monitorar approved PIX/day.

## testing_commands
```bash
curl -X POST http://localhost:3000/api/v1/runtime/tasks/generate-from-radar -H 'content-type: application/json' -d '{"count":3,"consumer_agent_id":"buyer_live"}'
curl -X POST http://localhost:3000/api/v1/runtime/tasks/run-cycle -H 'content-type: application/json' -d '{"max_tasks":3}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_ok_1","status":"approved","amount":150,"metadata":{"agent_id":"buyer_live"}}'
curl -X POST http://localhost:3000/api/v1/webhooks/mercado-pago -H 'content-type: application/json' -d '{"id":"pix_pending_1","status":"pending","customer":{"email":"buyer@x.com"}}'
curl -X POST http://localhost:3000/api/v1/runtime/pix/followups/process -H 'content-type: application/json' -d '{"limit":10}'
curl http://localhost:3000/api/v1/runtime/revenue-dashboard
```
