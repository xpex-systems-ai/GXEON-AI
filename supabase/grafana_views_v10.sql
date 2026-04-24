-- ═══════════════════════════════════════════════════════════════════════════
-- GRAFANA_ENDPOINT_MAPPING - Views para Dashboard Frontier
-- Dados em tempo real para a Ferrari Financeira
-- 
-- Autorizado por: Comandante Júnior Sena
-- Data: 2026-04-20
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. REALTIME_PROFIT_GROSS_VS_NET
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_profit_realtime AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    
    -- Lucro Bruto (todas as oportunidades)
    COUNT(*) FILTER (WHERE status = 'detected') as opportunities_detected,
    SUM(estimated_profit_usd) FILTER (WHERE status = 'detected') as gross_profit_potential,
    
    -- Lucro Líquido Realizado
    SUM(actual_profit_usd) FILTER (WHERE status = 'completed') as net_profit_realized,
    SUM(gas_cost_estimate) FILTER (WHERE status = 'completed') as total_gas_costs,
    
    -- Diferença
    COALESCE(SUM(actual_profit_usd) FILTER (WHERE status = 'completed'), 0) - 
    COALESCE(SUM(gas_cost_estimate) FILTER (WHERE status = 'completed'), 0) as profit_minus_gas,
    
    -- Taxa de sucesso
    COUNT(*) FILTER (WHERE status = 'completed')::float / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0) * 100 as success_rate_pct

FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;

-- View acumulada (últimos 30 dias)
CREATE OR REPLACE VIEW grafana_profit_accumulated AS
SELECT 
    DATE(created_at) as date,
    SUM(estimated_profit_usd) as daily_gross_potential,
    SUM(actual_profit_usd) FILTER (WHERE status = 'completed') as daily_net_realized,
    SUM(gas_cost_estimate) FILTER (WHERE status = 'completed') as daily_gas_costs,
    SUM(actual_profit_usd) FILTER (WHERE status = 'completed') - 
    SUM(gas_cost_estimate) FILTER (WHERE status = 'completed') as daily_profit_after_gas,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TAX_PROVISION_PROGRESSIVE_CALC
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_tax_provision AS
WITH daily_profits AS (
    SELECT 
        DATE(executed_at) as date,
        SUM(yield_earned_usd) as governance_yield,
        0 as task_rewards, -- Será populado de outras tabelas
        0 as arbitrage_profit
    FROM governance_votes
    WHERE executed_at > NOW() - INTERVAL '365 days'
    GROUP BY 1
),
tax_calc AS (
    SELECT 
        date,
        governance_yield + task_rewards + arbitrage_profit as gross_income,
        
        -- Alíquotas progressivas simplificadas (Brasil)
        CASE 
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 100 THEN 0
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 500 THEN 7.5
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 1000 THEN 15
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 5000 THEN 22.5
            ELSE 27.5
        END as tax_rate_pct,
        
        -- Provisão de imposto
        (governance_yield + task_rewards + arbitrage_profit) * 
        CASE 
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 100 THEN 0
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 500 THEN 0.075
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 1000 THEN 0.15
            WHEN (governance_yield + task_rewards + arbitrage_profit) < 5000 THEN 0.225
            ELSE 0.275
        END as tax_provision_usd
    FROM daily_profits
)
SELECT 
    date,
    gross_income,
    tax_rate_pct,
    tax_provision_usd,
    gross_income - tax_provision_usd as net_after_tax,
    SUM(tax_provision_usd) OVER (ORDER BY date) as accumulated_tax_provision
FROM tax_calc
ORDER BY date DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. AGENT_SWARM_STATUS_MATRIX
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_agent_status AS
SELECT 
    'AIRDROP_HUNTER' as agent_name,
    (SELECT COUNT(*) FROM airdrop_wallets WHERE status = 'active') as wallets_active,
    (SELECT AVG(eligibility_score) FROM airdrop_wallets WHERE status = 'active') as avg_score,
    (SELECT SUM(estimated_value_usd) FROM airdrop_wallets WHERE status = 'active') as total_estimated_value,
    (SELECT MAX(last_activity_at) FROM airdrop_wallets) as last_activity,
    CASE 
        WHEN (SELECT MAX(last_activity_at) FROM airdrop_wallets) > NOW() - INTERVAL '1 hour' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'TASK_MINER' as agent_name,
    (SELECT COUNT(*) FROM task_opportunities WHERE status = 'pending') as tasks_pending,
    (SELECT AVG(priority_score) FROM task_opportunities WHERE status = 'pending') as avg_priority,
    (SELECT SUM(reward_value) FROM task_executions WHERE executed_at > NOW() - INTERVAL '24 hours') as daily_rewards,
    (SELECT MAX(executed_at) FROM task_executions) as last_activity,
    CASE 
        WHEN (SELECT MAX(executed_at) FROM task_executions) > NOW() - INTERVAL '30 minutes' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'LIQUIDITY_SNIPER' as agent_name,
    (SELECT COUNT(*) FROM liquidity_opportunities WHERE status = 'detected' AND created_at > NOW() - INTERVAL '1 hour') as opportunities_active,
    (SELECT AVG(divergence_percent) FROM liquidity_opportunities WHERE created_at > NOW() - INTERVAL '1 hour') as avg_divergence,
    (SELECT SUM(actual_profit_usd) FROM liquidity_opportunities WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') as daily_profit,
    (SELECT MAX(created_at) FROM liquidity_opportunities) as last_activity,
    CASE 
        WHEN (SELECT MAX(created_at) FROM liquidity_opportunities) > NOW() - INTERVAL '5 minutes' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'GOVERNANCE_INFILTRATOR' as agent_name,
    (SELECT COUNT(*) FROM governance_proposals WHERE status = 'active' AND voted = false) as proposals_pending,
    (SELECT AVG(total_bribe_value_usd) FROM governance_proposals WHERE status = 'active') as avg_bribe_value,
    (SELECT SUM(yield_earned_usd) FROM governance_votes WHERE executed_at > NOW() - INTERVAL '24 hours') as daily_yield,
    (SELECT MAX(executed_at) FROM governance_votes) as last_activity,
    CASE 
        WHEN (SELECT MAX(executed_at) FROM governance_votes) > NOW() - INTERVAL '1 hour' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status;

-- View detalhada do swarm
CREATE OR REPLACE VIEW grafana_swarm_matrix AS
SELECT 
    agent_name,
    status,
    CASE status
        WHEN 'ONLINE' THEN '🟢'
        WHEN 'STANDBY' THEN '🟡'
        ELSE '🔴'
    END as status_emoji,
    COALESCE(wallets_active, tasks_pending, opportunities_active, proposals_pending, 0) as active_items,
    COALESCE(total_estimated_value, daily_rewards, daily_profit, daily_yield, 0) as daily_value,
    last_activity,
    EXTRACT(EPOCH FROM (NOW() - last_activity))/60 as minutes_since_activity
FROM grafana_agent_status;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LIQUIDITY_SNIPER_DIVERGENCE_DATA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_liquidity_divergence AS
SELECT 
    pair,
    tier,
    divergence_percent,
    estimated_profit_usd,
    net_profit_usd,
    status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago,
    CASE 
        WHEN divergence_percent > 0.5 THEN '🔴 CRITICAL'
        WHEN divergence_percent > 0.3 THEN '🟠 HIGH'
        WHEN divergence_percent > 0.15 THEN '🟡 MEDIUM'
        ELSE '🟢 LOW'
    END as alert_level
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '1 hour'
AND status = 'detected'
ORDER BY divergence_percent DESC;

-- Histórico de divergências
CREATE OR REPLACE VIEW grafana_divergence_history AS
SELECT 
    DATE_TRUNC('minute', created_at) as minute,
    pair,
    AVG(divergence_percent) as avg_divergence,
    MAX(divergence_percent) as max_divergence,
    COUNT(*) as opportunity_count
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '6 hours'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. AIRDROP_ELIGIBILITY_SCORES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_airdrop_scores AS
SELECT 
    address,
    eligibility_score,
    eligibility_level,
    estimated_value_usd,
    interactions,
    faucet_claims,
    pow_claims,
    last_activity_at,
    target_networks,
    CASE eligibility_level
        WHEN 'HIGH' THEN '🟢'
        WHEN 'MEDIUM' THEN '🟡'
        ELSE '🔴'
    END as level_emoji,
    status
FROM airdrop_wallets
WHERE status = 'active'
ORDER BY eligibility_score DESC;

-- Distribuição de scores
CREATE OR REPLACE VIEW grafana_score_distribution AS
SELECT 
    eligibility_level,
    COUNT(*) as wallet_count,
    MIN(eligibility_score) as min_score,
    MAX(eligibility_score) as max_score,
    AVG(eligibility_score) as avg_score,
    SUM(estimated_value_usd) as total_estimated_value,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM airdrop_wallets
WHERE status = 'active'
GROUP BY eligibility_level
ORDER BY avg_score DESC;

-- Progresso temporal
CREATE OR REPLACE VIEW grafana_eligibility_progress AS
SELECT 
    DATE(last_activity_at) as date,
    COUNT(*) as active_wallets,
    AVG(eligibility_score) as avg_daily_score,
    SUM(estimated_value_usd) as daily_estimated_value,
    SUM(interactions) as total_interactions,
    SUM(faucet_claims) as total_faucet_claims
FROM airdrop_wallets
WHERE last_activity_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CONSOLIDATED FINANCIAL DASHBOARD (Master View)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_financial_master AS
WITH 
liquidity_stats AS (
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
    NOW() as timestamp,
    
    -- Receitas 24h
    liquidity_stats.liquidity_profit_24h + 
    governance_stats.governance_yield_24h + 
    task_stats.task_rewards_24h as total_revenue_24h,
    
    -- Custos 24h
    liquidity_stats.liquidity_gas_24h as total_gas_24h,
    
    -- Lucro Líquido 24h
    (liquidity_stats.liquidity_profit_24h + 
     governance_stats.governance_yield_24h + 
     task_stats.task_rewards_24h) - 
    liquidity_stats.liquidity_gas_24h as net_profit_24h,
    
    -- Valor em carteira (Airdrops estimados)
    airdrop_stats.airdrop_estimated_total as portfolio_value_estimated,
    
    -- ROI
    CASE 
        WHEN liquidity_stats.liquidity_gas_24h > 0 THEN
            ((liquidity_stats.liquidity_profit_24h + 
              governance_stats.governance_yield_24h + 
              task_stats.task_rewards_24h) - 
             liquidity_stats.liquidity_gas_24h) / 
            liquidity_stats.liquidity_gas_24h * 100
        ELSE 0
    END as roi_24h_pct,
    
    -- Treasury
    '0x3955d559055DadB7067054cB6E6f974710345224' as treasury_address

FROM liquidity_stats, governance_stats, task_stats, airdrop_stats;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ALERTAS E ANOMALIAS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_alerts AS
-- Alertas de alta divergência
SELECT 
    'HIGH_DIVERGENCE' as alert_type,
    pair as target,
    divergence_percent as value,
    created_at,
    '🔴 CRITICAL: Divergence > 50%' as message
FROM liquidity_opportunities
WHERE divergence_percent > 0.5
AND created_at > NOW() - INTERVAL '5 minutes'

UNION ALL

-- Alertas de agente offline
SELECT 
    'AGENT_OFFLINE' as alert_type,
    agent_name as target,
    minutes_since_activity as value,
    NOW() as created_at,
    '🟠 WARNING: Agent inactive for ' || ROUND(minutes_since_activity) || ' minutes' as message
FROM grafana_swarm_matrix
WHERE status = 'STANDBY'
AND minutes_since_activity > 30

UNION ALL

-- Alertas de alto valor de bribe
SELECT 
    'HIGH_BRIBE' as alert_type,
    dao_name as target,
    total_bribe_value_usd as value,
    created_at,
    '💰 OPPORTUNITY: Bribe > $1000 detected' as message
FROM governance_proposals
WHERE total_bribe_value_usd > 1000
AND voted = false

ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. MÉTRICAS DE PERFORMANCE DO SISTEMA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_system_health AS
SELECT 
    'Supabase Connection' as metric,
    CASE 
        WHEN (SELECT MAX(created_at) FROM liquidity_opportunities) > NOW() - INTERVAL '5 minutes' THEN 'HEALTHY'
        ELSE 'WARNING'
    END as status,
    (SELECT COUNT(*) FROM liquidity_opportunities WHERE created_at > NOW() - INTERVAL '1 hour') as ops_last_hour

UNION ALL

SELECT 
    'Agent Activity' as metric,
    CASE 
        WHEN (SELECT COUNT(*) FROM grafana_agent_status WHERE status = 'ONLINE') >= 2 THEN 'HEALTHY'
        ELSE 'WARNING'
    END as status,
    (SELECT COUNT(*) FROM grafana_agent_status WHERE status = 'ONLINE') as ops_last_hour

UNION ALL

SELECT 
    'Profit Generation' as metric,
    CASE 
        WHEN (SELECT net_profit_24h FROM grafana_financial_master) > 0 THEN 'HEALTHY'
        ELSE 'WARNING'
    END as status,
    (SELECT net_profit_24h FROM grafana_financial_master)::int as ops_last_hour;

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS PARA GRAFANA (Read-only access)
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT ON grafana_profit_realtime TO anon;
GRANT SELECT ON grafana_profit_accumulated TO anon;
GRANT SELECT ON grafana_tax_provision TO anon;
GRANT SELECT ON grafana_agent_status TO anon;
GRANT SELECT ON grafana_swarm_matrix TO anon;
GRANT SELECT ON grafana_liquidity_divergence TO anon;
GRANT SELECT ON grafana_divergence_history TO anon;
GRANT SELECT ON grafana_airdrop_scores TO anon;
GRANT SELECT ON grafana_score_distribution TO anon;
GRANT SELECT ON grafana_eligibility_progress TO anon;
GRANT SELECT ON grafana_financial_master TO anon;
GRANT SELECT ON grafana_alerts TO anon;
GRANT SELECT ON grafana_system_health TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 GRAFANA VIEWS v10 PRONTO
-- Execute no SQL Editor do Supabase para ativar as janelas de dados
-- ═══════════════════════════════════════════════════════════════════════════
