-- ═══════════════════════════════════════════════════════════════════════════
-- GRAFANA DASHBOARD QUERIES - ORÁCULO GX v1.0.22
-- SQL Otimizados para Painéis PNL e Monitoramento de Robótica
-- Theme: Black & Gold High-Tech (#D4AF37, #000000, #00FFFF)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 1: PNL REALTIME (Stat Panel + Time Series)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query A: Lucro Líquido Última Hora (Stat Panel)
SELECT 
    COALESCE(SUM(net_profit_usd), 0) as "Lucro Líquido (USD)",
    COUNT(*) FILTER (WHERE status = 'executed') as "Execuções",
    AVG(net_profit_usd) as "Média por Execução"
FROM keeper_rewards 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Query B: Histórico Horário (Time Series Graph)
SELECT 
    DATE_TRUNC('hour', created_at) as time,
    SUM(net_profit_usd) as "Lucro Líquido",
    SUM(gas_spent_usd) as "Custo Gas",
    COUNT(*) as "Transações"
FROM keeper_rewards 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 2: MONITORAMENTO DE ROBÓTICA (Agent Swarm Status)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query A: Status Atual dos Agentes (Table Panel)
SELECT 
    agent_name,
    CASE status 
        WHEN 'ONLINE' THEN '🟢 ONLINE'
        WHEN 'STANDBY' THEN '🟡 STANDBY'
        ELSE '🔴 OFFLINE'
    END as status,
    COALESCE(wallets_active, tasks_pending, opportunities_active, proposals_pending, 0) as "Itens Ativos",
    COALESCE(total_estimated_value, daily_rewards, daily_profit, daily_yield, 0) as "Valor Diário (USD)",
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_activity))/60) as "Minutos Inativo"
FROM grafana_agent_status;

-- Query B: Fleet Heartbeat (Stat Panel)
SELECT 
    status as "Status Frota",
    last_ping as "Último Ping",
    uptime_seconds / 3600 as "Uptime (horas)",
    total_opportunities_found as "Oportunidades",
    total_tasks_completed as "Tasks Completadas",
    total_profit_usd as "Lucro Total (USD)",
    CASE 
        WHEN emergency_stop THEN '🔴 EMERGENCY STOP'
        ELSE '🟢 NORMAL'
    END as "Modo Operação"
FROM fleet_heartbeat
WHERE id = 'fleet_v9';

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 3: DIVERGÊNCIAS DE LIQUIDEZ (Heatmap + Alertas)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query A: Oportunidades Ativas (Table with Gauge)
SELECT 
    pair as "Par",
    ROUND(divergence_percent::numeric, 4) as "Divergência %",
    ROUND(estimated_profit_usd::numeric, 2) as "Lucro Estimado (USD)",
    ROUND(net_profit_usd::numeric, 2) as "Lucro Líquido (USD)",
    CASE 
        WHEN divergence_percent > 0.5 THEN '🔴 CRITICAL'
        WHEN divergence_percent > 0.3 THEN '🟠 HIGH'
        WHEN divergence_percent > 0.15 THEN '🟡 MEDIUM'
        ELSE '🟢 LOW'
    END as "Nível Alerta",
    EXTRACT(EPOCH FROM (NOW() - created_at))::int as "Segundos atrás"
FROM liquidity_opportunities
WHERE status = 'detected'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY divergence_percent DESC
LIMIT 20;

-- Query B: Histórico de Divergências (Time Series)
SELECT 
    DATE_TRUNC('minute', created_at) as time,
    pair,
    AVG(divergence_percent) as avg_divergence,
    MAX(divergence_percent) as max_divergence,
    COUNT(*) as opportunity_count
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '6 hours'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 4: FINANCEIRO MASTER (Dashboard Principal)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query: Visão Consolidada 24h (Multiple Stat Panels)
WITH liquidity_stats AS (
    SELECT 
        COALESCE(SUM(actual_profit_usd), 0) as liquidity_profit_24h,
        COALESCE(SUM(gas_cost_estimate), 0) as liquidity_gas_24h
    FROM liquidity_opportunities
    WHERE created_at > NOW() - INTERVAL '24 hours'
    AND status = 'completed'
),
governance_stats AS (
    SELECT 
        COALESCE(SUM(yield_earned_usd), 0) as governance_yield_24h
    FROM governance_votes
    WHERE executed_at > NOW() - INTERVAL '24 hours'
),
task_stats AS (
    SELECT 
        COALESCE(SUM(reward_value), 0) as task_rewards_24h
    FROM task_executions
    WHERE executed_at > NOW() - INTERVAL '24 hours'
),
airdrop_stats AS (
    SELECT 
        COALESCE(SUM(estimated_value_usd), 0) as airdrop_estimated_total
    FROM airdrop_wallets
    WHERE status = 'active'
)
SELECT 
    NOW() as "Timestamp",
    liquidity_stats.liquidity_profit_24h + governance_stats.governance_yield_24h + task_stats.task_rewards_24h as "Receita Total 24h",
    liquidity_stats.liquidity_gas_24h as "Custos Gas 24h",
    (liquidity_stats.liquidity_profit_24h + governance_stats.governance_yield_24h + task_stats.task_rewards_24h) - liquidity_stats.liquidity_gas_24h as "Lucro Líquido 24h",
    airdrop_stats.airdrop_estimated_total as "Valor Estimado Carteira",
    CASE 
        WHEN liquidity_stats.liquidity_gas_24h > 0 THEN
            ROUND(((liquidity_stats.liquidity_profit_24h + governance_stats.governance_yield_24h + task_stats.task_rewards_24h) - liquidity_stats.liquidity_gas_24h) / liquidity_stats.liquidity_gas_24h * 100, 2)
        ELSE 0
    END as "ROI 24h %",
    '0x3955d559055DadB7067054cB6E6f974710345224' as "Treasury"
FROM liquidity_stats, governance_stats, task_stats, airdrop_stats;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 5: ALERTAS E ANOMALIAS (Alert List)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query: Alertas Ativos
SELECT 
    alert_type as "Tipo",
    target as "Alvo",
    ROUND(value::numeric, 4) as "Valor",
    message as "Mensagem",
    created_at as "Timestamp"
FROM grafana_alerts
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY 
    CASE alert_type 
        WHEN 'HIGH_DIVERGENCE' THEN 1
        WHEN 'AGENT_OFFLINE' THEN 2
        WHEN 'HIGH_BRIBE' THEN 3
        ELSE 4
    END,
    created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 6: TAX PROVISION (Bar Chart)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query: Provisão de Imposto Acumulada
SELECT 
    date as "Data",
    ROUND(gross_income::numeric, 2) as "Renda Bruta",
    tax_rate_pct as "Alíquota %",
    ROUND(tax_provision_usd::numeric, 2) as "Provisão Imposto",
    ROUND(net_after_tax::numeric, 2) as "Líquido após Imposto",
    ROUND(accumulated_tax_provision::numeric, 2) as "Provisão Acumulada"
FROM grafana_tax_provision
WHERE date > NOW() - INTERVAL '30 days'
ORDER BY date DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 7: AIRDROP MONITOR (Gauge + Table)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query A: Distribuição de Eligibility
SELECT 
    eligibility_level as "Nível",
    COUNT(*) as "Quantidade Wallets",
    ROUND(AVG(eligibility_score)::numeric, 0) as "Score Médio",
    ROUND(SUM(estimated_value_usd)::numeric, 2) as "Valor Total Estimado",
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as "Percentual %"
FROM airdrop_wallets
WHERE status = 'active'
GROUP BY eligibility_level
ORDER BY AVG(eligibility_score) DESC;

-- Query B: Top Wallets (Table)
SELECT 
    address as "Address",
    eligibility_score as "Score",
    eligibility_level as "Nível",
    ROUND(estimated_value_usd::numeric, 2) as "Valor Estimado",
    interactions as "Interações",
    last_activity_at as "Última Atividade"
FROM airdrop_wallets
WHERE status = 'active'
ORDER BY eligibility_score DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINEL 8: SYSTEM HEALTH (Row Panel)
-- ═══════════════════════════════════════════════════════════════════════════

-- Query: Métricas de Saúde do Sistema
SELECT 
    metric as "Métrica",
    status as "Status",
    ops_last_hour as "Operações Última Hora"
FROM grafana_system_health;

-- Query Adicional: Logs de Erro Recentes
SELECT 
    created_at as "Timestamp",
    level as "Nível",
    module as "Módulo",
    message as "Mensagem",
    priority as "Prioridade"
FROM audit_logs
WHERE level IN ('error', 'critical', 'warning')
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIGURAÇÃO GRAFANA DATASOURCE
-- ═══════════════════════════════════════════════════════════════════════════

/*
Adicionar ao Grafana como PostgreSQL Data Source:

Name: GXEON-Supabase-Oracle
Host: db.[PROJECT_REF].supabase.co
Port: 5432
Database: postgres
SSL Mode: require
User: postgres
Password: [SERVICE_ROLE_KEY ou ANON_KEY para read-only]

TimeZone: UTC
Min Time Interval: 1m
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSÕES PARA GRAFANA (Read-Only)
-- ═══════════════════════════════════════════════════════════════════════════

-- Executar no Supabase SQL Editor:
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 ORÁCULO GX DASHBOARD PRONTO
-- Execute estas queries no Grafana Query Editor para cada painel
-- ═══════════════════════════════════════════════════════════════════════════
