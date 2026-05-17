# GXEON_AUTONOMOUS_REVENUE_MACHINE_V3_MONETIZATION

## executive_summary
A máquina de revenue agora fecha o ciclo end-to-end: sinal do Radar vira task vendável, task é executada, crédito é deduzido, comissão é retida e PIX aprovado ativa saldo automaticamente.
A prioridade de receita real está no gate financeiro rígido: sem crédito, sem entrega premium.
Com scheduler autônomo de geração de tasks, o sistema mantém oferta comercial 24/7 sem operação manual constante.
O webhook já ativa crédito em `payment.approved` e fila follow-up foi adicionada para PIX pendente (email/WhatsApp).
O próximo gargalo para “PIX cair de verdade” em escala é autenticação/rate-limit forte + persistência transacional (fora de memória local).

## revenue_loops
1. **Signal-to-Task-to-Cash**: X-Radar gera sinal -> task vendável é criada -> agente consome -> crédito deduzido -> comissão plataforma capturada.
2. **Execution + Refund Safety**: scheduler liquida execução automaticamente e, se task falhar, executa refund do net ao consumidor.
3. **PIX Recovery Loop**: evento `pending` entra em fila de follow-up (WhatsApp/Email) -> conversão para `approved` -> webhook ativa crédito instantâneo.
4. **Reinvest Loop**: receita de comissão alimenta treasury wallet para subsidiar expansão da frota de agentes.

## monetization_models
- **Pay-per-Signal**: 12 créditos por sinal premium (range recomendado 8–25).
- **Execution Fee A2A**: take-rate 12–20% (default 15% em tasks, 18% em sinal premium).
- **Subscription BASIC**: R$297/mês, 200 sinais, 12% execution fee.
- **Subscription PRO**: R$997/mês, 1.200 sinais, 10% execution fee.
- **Subscription ENTERPRISE**: R$4.900+/mês, 10.000 sinais, 8% execution fee.

## critical_implementations
- `autonomousRevenueScheduler.generateSellableTasksFromRadar`: transforma sinais em tasks comerciais automaticamente.
- `autonomousRevenueScheduler.runSchedulerCycle`: auto-settlement + refund on failure.
- `mercadoWebhookRuntime.processWebhook`: topup instantâneo em `approved` + fila follow-up para `pending`.
- `subscriptionRuntime`: catálogo/tier e ativação de assinatura.
- Endpoints novos para monetização imediata: generate-from-radar, subscription catalog/subscribe.

## 14_day_action_plan
### Dias 1-3
- Configurar webhook real Mercado Pago em produção com assinatura HMAC e validar payload `payment.approved` real.
- Configurar `platform_treasury` com saldo operacional e limites.

### Dias 4-6
- Ativar follow-up pendente (integração real WhatsApp/Email provider) com SLA de 5 min.
- Aplicar rate limit por wallet em endpoints financeiros e de sinal premium.

### Dias 7-10
- Persistir ledger/task/subscriptions em Supabase/Postgres com idempotência por `payment_id` e `task_id`.
- Implementar conciliação diária Mercado Pago x ledger interno.

### Dias 11-14
- Lançar oferta comercial com 1 tier subscription + pay-per-signal.
- Medir KPI crítico: approved PIX/day, revenue/day, conversion pending->approved, chargeback/fraud ratio.

## risks_and_safeguards
- **Risco**: endpoints sensíveis sem proteção -> **Safeguard**: service auth + tenant scopes + rate limiting.
- **Risco**: estado financeiro em memória -> **Safeguard**: persistência ACID + unique constraints.
- **Risco**: abuso de auto-topup/follow-up -> **Safeguard**: antifraude por burst e reputação de wallet.
- **Risco**: dupla liquidação em concorrência -> **Safeguard**: lock/idempotência por task/payment.
