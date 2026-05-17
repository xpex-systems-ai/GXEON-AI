# GXEON_AUTONOMOUS_REVENUE_MACHINE_PHASE_2

## revenue_loops
1. **Radar-to-Revenue Loop**: Radar sinaliza oportunidade -> task entra na fila A2A -> scheduler executa settlement em créditos -> comissão da plataforma é retida automaticamente -> produtor recebe net.
2. **Low-Credit Recovery Loop**: agente com saldo crítico dispara `auto-topup` -> PIX é criado -> webhook aprovado ativa créditos instantaneamente -> task pulling continua sem intervenção humana.
3. **Execution Fee Loop**: consumidor paga por execução unitária (crédito por task) -> comissão 12-20% -> plataforma cresce com volume de tasks.
4. **Reinvest Loop**: parte do platform revenue alimenta treasury wallet para financiar novos agentes/workers com maior ROI.

## technical_implementation
- Novo módulo `server/runtime/autonomousRevenueScheduler.cjs`:
  - fila de tasks (`enqueueTask`)
  - ciclo autônomo (`runSchedulerCycle`) com auto-deduct + commission settlement
  - auto topup PIX (`autoTopupViaPix`)
  - visão runtime (`getAutonomousRevenueRuntime`)
- Melhoria do `server/runtime/mercadoWebhookRuntime.cjs`:
  - quando webhook aprovado chegar com valor, crédito é ativado na wallet do agente automaticamente
- Novos endpoints em `artifacts/api-server/src/routes/runtime.ts`:
  - `GET /api/v1/runtime/autonomous-revenue`
  - `POST /api/v1/runtime/tasks/enqueue`
  - `POST /api/v1/runtime/tasks/run-cycle`
  - `POST /api/v1/runtime/credits/auto-topup`

## 14_day_plan
### Dias 1-3
- Publicar fluxo A2A em staging e validar métricas básicas (settled_count, blocked_count, platform_revenue).
- Configurar wallet `platform_treasury` com funding inicial para topup controlado.

### Dias 4-6
- Adicionar rate limiting por agente e por endpoint financeiro.
- Implementar flag de fraude simples: bloqueio temporário em bursts de topup e transfers suspeitos.

### Dias 7-10
- Persistir ledger/settlements/task queue em Supabase com constraints idempotentes.
- Criar jobs de reconciliação webhook vs ledger interno.

### Dias 11-14
- Dashboard de receita real: GMV 24h, take-rate real, topups aprovados, fail ratio e margem líquida.
- Ativar ofertas comerciais: pay-per-signal + execution fee + subscription.

## monetization_models
- **Pay-per-signal**: R$ 3k–20k/mês (rápido para canais premium)
- **Execution Fee (A2A)**: R$ 10k–60k/mês (escala com volume de task)
- **Subscription Pro Agents**: R$ 20k–90k/mês (MRR previsível)
- **A2A Commission (12–20%)**: R$ 15k–120k/mês (efeito de rede)
- **Performance Fee**: R$ 8k–70k/mês (alto potencial, mais variância)

## risks
- Dependência de memória local para ledger -> migrar para persistência transacional.
- Endpoints financeiros públicos -> exigir autenticação de serviço e limites por tenant.
- Topup automático pode ser explorado sem antifraude -> incluir detecção de anomalia e travas.
- Escalonamento horizontal pode gerar dupla execução -> lock distribuído por task_id.
