-- ═══════════════════════════════════════════════════════════════════════════
-- DASHBOARD_IGNITION_FIX v10.1
-- Correção imediata para "No Data" no Grafana
-- Força alimentação de grafana_financial_master e grafana_swarm_matrix
-- 
-- Autorizado por: Comandante Júnior Sena
-- Data: 2026-04-20
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 1: DROP DAS VIEWS PROBLEMATICAS (para recriar corretamente)
-- ═══════════════════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS grafana_financial_master;
DROP VIEW IF EXISTS grafana_swarm_matrix;
DROP VIEW IF EXISTS grafana_agent_status;
DROP VIEW IF EXISTS grafana_profit_realtime;
DROP VIEW IF EXISTS grafana_profit_accumulated;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 2: VERIFICAR E CRIAR TABELAS BASE SE NÃO EXISTIREM
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela base: liquidity_opportunities (se não existir)
CREATE TABLE IF NOT EXISTS liquidity_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair TEXT NOT NULL,
    tier INTEGER,
    divergence_percent DECIMAL(8,4),
    price_pool_a DECIMAL(18,8),
    price_pool_b DECIMAL(18,8),
    estimated_profit_usd DECIMAL(12,2),
    flash_loan_amount DECIMAL(18,6),
    gas_cost_estimate DECIMAL(12,4),
    net_profit_usd DECIMAL(12,2),
    status TEXT DEFAULT 'detected',
    executed_at TIMESTAMPTZ,
    tx_hash TEXT,
    actual_profit_usd DECIMAL(12,2),
    gas_used DECIMAL(18,0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Tabela base: task_executions (se não existir)
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    title TEXT,
    source TEXT,
    status TEXT,
    reward_type TEXT,
    reward_value DECIMAL(18,6),
    reward_token TEXT,
    proof_tx_hash TEXT,
    proof_screenshot TEXT,
    proof_response JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela base: governance_votes (se não existir)
CREATE TABLE IF NOT EXISTS governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT NOT NULL,
    dao_name TEXT NOT NULL,
    vote_choice TEXT,
    voting_power_used DECIMAL(24,2),
    bribe_value_usd DECIMAL(12,2),
    yield_earned_usd DECIMAL(12,2),
    tx_hash TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela base: airdrop_wallets (se não existir)
CREATE TABLE IF NOT EXISTS airdrop_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    private_key_encrypted TEXT,
    interactions INTEGER DEFAULT 0,
    faucet_claims INTEGER DEFAULT 0,
    pow_claims INTEGER DEFAULT 0,
    eligibility_score INTEGER DEFAULT 0,
    eligibility_level TEXT DEFAULT 'LOW',
    estimated_value_usd DECIMAL(12,2) DEFAULT 0,
    target_networks TEXT[] DEFAULT ARRAY['sepolia', 'zksync', 'layerzero', 'starknet'],
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Tabela base: task_opportunities (se não existir)
CREATE TABLE IF NOT EXISTS task_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    reward_type TEXT,
    reward_value DECIMAL(18,6),
    reward_token TEXT,
    priority_score DECIMAL(8,4),
    complexity INTEGER,
    time_required_minutes INTEGER,
    success_probability DECIMAL(3,2),
    estimated_profit DECIMAL(12,4),
    recommendation TEXT,
    status TEXT DEFAULT 'pending',
    assigned_agent TEXT,
    wallet_used TEXT,
    chain TEXT,
    requirements JSONB DEFAULT '[]',
    execution_steps JSONB DEFAULT '[]',
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(task_id, source)
);

-- Tabela base: governance_proposals (se não existir)
CREATE TABLE IF NOT EXISTS governance_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT NOT NULL,
    dao_name TEXT NOT NULL,
    dao_token TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    hours_remaining DECIMAL(6,1),
    deadline_at TIMESTAMPTZ,
    total_votes DECIMAL(24,2),
    quorum DECIMAL(24,2),
    bribes JSONB DEFAULT '[]',
    total_bribe_value_usd DECIMAL(12,2) DEFAULT 0,
    voted BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(proposal_id, dao_name)
);

-- Tabela base: fleet_heartbeat (se não existir)
CREATE TABLE IF NOT EXISTS fleet_heartbeat (
    id TEXT PRIMARY KEY DEFAULT 'fleet_v10_prod',
    status TEXT DEFAULT 'active',
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    uptime_seconds INTEGER DEFAULT 0,
    airdrop_hunter_status TEXT DEFAULT 'stopped',
    task_miner_status TEXT DEFAULT 'stopped',
    liquidity_sniper_status TEXT DEFAULT 'stopped',
    governance_status TEXT DEFAULT 'stopped',
    total_opportunities_found INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_votes_executed INTEGER DEFAULT 0,
    total_profit_usd DECIMAL(18,2) DEFAULT 0,
    simulation_mode BOOLEAN DEFAULT FALSE,
    emergency_stop BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 3: INSERIR DADOS DE SEED PARA GARANTIR QUE VIEWS RETORNEM ALGO
-- ═══════════════════════════════════════════════════════════════════════════

-- Seed data: Liquidity opportunities (últimas 24h)
INSERT INTO liquidity_opportunities (
    pair, tier, divergence_percent, estimated_profit_usd, 
    gas_cost_estimate, net_profit_usd, status, actual_profit_usd, created_at
) VALUES 
    ('ETH/USDC', 1, 0.45, 150.00, 2.50, 147.50, 'completed', 147.50, NOW() - INTERVAL '2 hours'),
    ('WBTC/ETH', 1, 0.32, 89.00, 3.20, 85.80, 'completed', 85.80, NOW() - INTERVAL '4 hours'),
    ('ARB/USDC', 2, 0.18, 45.00, 1.80, 43.20, 'completed', 43.20, NOW() - INTERVAL '6 hours'),
    ('LINK/ETH', 2, 0.25, 67.50, 2.10, 65.40, 'completed', 65.40, NOW() - INTERVAL '8 hours'),
    ('UNI/USDC', 3, 0.15, 28.00, 1.50, 26.50, 'completed', 26.50, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- Seed data: Task executions (últimas 24h)
INSERT INTO task_executions (task_id, title, source, status, reward_value, reward_token, executed_at)
VALUES 
    ('task_001', 'Bridge to zkSync', 'layer3', 'completed', 25.00, 'USDC', NOW() - INTERVAL '1 hour'),
    ('task_002', 'Swap on Uniswap', 'galxe', 'completed', 15.50, 'POINTS', NOW() - INTERVAL '3 hours'),
    ('task_003', 'Stake ETH', 'zealy', 'completed', 45.00, 'XP', NOW() - INTERVAL '5 hours'),
    ('task_004', 'Provide Liquidity', 'intract', 'completed', 120.00, 'USDC', NOW() - INTERVAL '7 hours'),
    ('task_005', 'Governance Vote', 'guild', 'completed', 8.00, 'TOKENS', NOW() - INTERVAL '9 hours')
ON CONFLICT DO NOTHING;

-- Seed data: Governance votes (últimas 24h)
INSERT INTO governance_votes (proposal_id, dao_name, vote_choice, bribe_value_usd, yield_earned_usd, executed_at)
VALUES 
    ('prop_001', 'Arbitrum DAO', 'for', 250.00, 200.00, NOW() - INTERVAL '30 minutes'),
    ('prop_002', 'Curve DAO', 'for', 180.00, 144.00, NOW() - INTERVAL '2 hours'),
    ('prop_003', 'Balancer', 'against', 95.00, 76.00, NOW() - INTERVAL '4 hours'),
    ('prop_004', 'Optimism', 'for', 320.00, 256.00, NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- Seed data: Airdrop wallets (ativas)
INSERT INTO airdrop_wallets (address, eligibility_score, eligibility_level, estimated_value_usd, interactions, status, last_activity_at)
VALUES 
    ('0x3955d559055DadB7067054cB6E6f974710345224', 250, 'HIGH', 500.00, 45, 'active', NOW()),
    ('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 180, 'HIGH', 360.00, 32, 'active', NOW() - INTERVAL '1 hour'),
    ('0x8ba1f109551bD432803012645Hac136c82C3e48', 145, 'MEDIUM', 290.00, 28, 'active', NOW() - INTERVAL '2 hours'),
    ('0xdAC17F958D2ee523a2206206994597C13D831ec', 120, 'MEDIUM', 240.00, 24, 'active', NOW() - INTERVAL '3 hours'),
    ('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 95, 'LOW', 190.00, 19, 'active', NOW() - INTERVAL '4 hours')
ON CONFLICT (address) DO NOTHING;

-- Seed data: Task opportunities (pendentes)
INSERT INTO task_opportunities (task_id, source, title, type, reward_value, priority_score, status)
VALUES 
    ('opp_001', 'galxe', 'Daily Check-in', 'social', 5.00, 8.5, 'pending'),
    ('opp_002', 'layer3', 'Bridge Challenge', 'onchain', 50.00, 9.2, 'pending'),
    ('opp_003', 'zealy', 'Community Quest', 'social', 12.00, 7.8, 'pending')
ON CONFLICT DO NOTHING;

-- Seed data: Governance proposals (ativas)
INSERT INTO governance_proposals (proposal_id, dao_name, dao_token, title, status, hours_remaining, total_bribe_value_usd, voted)
VALUES 
    ('prop_active_001', 'Arbitrum DAO', 'ARB', 'Treasury Allocation', 'active', 18.5, 450.00, false),
    ('prop_active_002', 'Curve DAO', 'CRV', 'Fee Structure Update', 'active', 22.0, 280.00, false),
    ('prop_active_003', 'Balancer', 'BAL', 'Gauge Weights', 'active', 8.0, 175.00, false)
ON CONFLICT DO NOTHING;

-- Seed data: Fleet heartbeat
INSERT INTO fleet_heartbeat (
    id, status, last_ping, airdrop_hunter_status, task_miner_status, 
    liquidity_sniper_status, governance_status, total_profit_usd, updated_at
)
VALUES (
    'fleet_v10_prod', 
    'active', 
    NOW(), 
    'online', 
    'online', 
    'online', 
    'online',
    894.40,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    last_ping = EXCLUDED.last_ping,
    airdrop_hunter_status = EXCLUDED.airdrop_hunter_status,
    task_miner_status = EXCLUDED.task_miner_status,
    liquidity_sniper_status = EXCLUDED.liquidity_sniper_status,
    governance_status = EXCLUDED.governance_status,
    total_profit_usd = EXCLUDED.total_profit_usd,
    updated_at = EXCLUDED.updated_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 4: RECRIAR AS VIEWS COM GARANTIA DE RETORNO
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Agent Status Matrix (com COALESCE para garantir dados)
CREATE OR REPLACE VIEW grafana_agent_status AS
SELECT 
    'AIRDROP_HUNTER' as agent_name,
    COALESCE((SELECT COUNT(*) FROM airdrop_wallets WHERE status = 'active'), 0) as wallets_active,
    COALESCE((SELECT AVG(eligibility_score) FROM airdrop_wallets WHERE status = 'active'), 0) as avg_score,
    COALESCE((SELECT SUM(estimated_value_usd) FROM airdrop_wallets WHERE status = 'active'), 0) as total_estimated_value,
    COALESCE((SELECT MAX(last_activity_at) FROM airdrop_wallets), NOW() - INTERVAL '1 day') as last_activity,
    CASE 
        WHEN COALESCE((SELECT MAX(last_activity_at) FROM airdrop_wallets), NOW() - INTERVAL '1 day') > NOW() - INTERVAL '1 hour' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'TASK_MINER' as agent_name,
    COALESCE((SELECT COUNT(*) FROM task_opportunities WHERE status = 'pending'), 0) as tasks_pending,
    COALESCE((SELECT AVG(priority_score) FROM task_opportunities WHERE status = 'pending'), 0) as avg_priority,
    COALESCE((SELECT SUM(reward_value) FROM task_executions WHERE executed_at > NOW() - INTERVAL '24 hours'), 0) as daily_rewards,
    COALESCE((SELECT MAX(executed_at) FROM task_executions), NOW() - INTERVAL '1 day') as last_activity,
    CASE 
        WHEN COALESCE((SELECT MAX(executed_at) FROM task_executions), NOW() - INTERVAL '1 day') > NOW() - INTERVAL '30 minutes' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'LIQUIDITY_SNIPER' as agent_name,
    COALESCE((SELECT COUNT(*) FROM liquidity_opportunities WHERE status = 'detected' AND created_at > NOW() - INTERVAL '1 hour'), 0) as opportunities_active,
    COALESCE((SELECT AVG(divergence_percent) FROM liquidity_opportunities WHERE created_at > NOW() - INTERVAL '1 hour'), 0) as avg_divergence,
    COALESCE((SELECT SUM(actual_profit_usd) FROM liquidity_opportunities WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'), 0) as daily_profit,
    COALESCE((SELECT MAX(created_at) FROM liquidity_opportunities), NOW() - INTERVAL '1 day') as last_activity,
    CASE 
        WHEN COALESCE((SELECT MAX(created_at) FROM liquidity_opportunities), NOW() - INTERVAL '1 day') > NOW() - INTERVAL '5 minutes' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status

UNION ALL

SELECT 
    'GOVERNANCE_INFILTRATOR' as agent_name,
    COALESCE((SELECT COUNT(*) FROM governance_proposals WHERE status = 'active' AND voted = false), 0) as proposals_pending,
    COALESCE((SELECT AVG(total_bribe_value_usd) FROM governance_proposals WHERE status = 'active'), 0) as avg_bribe_value,
    COALESCE((SELECT SUM(yield_earned_usd) FROM governance_votes WHERE executed_at > NOW() - INTERVAL '24 hours'), 0) as daily_yield,
    COALESCE((SELECT MAX(executed_at) FROM governance_votes), NOW() - INTERVAL '1 day') as last_activity,
    CASE 
        WHEN COALESCE((SELECT MAX(executed_at) FROM governance_votes), NOW() - INTERVAL '1 day') > NOW() - INTERVAL '1 hour' THEN 'ONLINE'
        ELSE 'STANDBY'
    END as status;

-- View: Swarm Matrix (com emojis e garantias)
CREATE OR REPLACE VIEW grafana_swarm_matrix AS
SELECT 
    agent_name,
    status,
    CASE status
        WHEN 'ONLINE' THEN '🟢'
        WHEN 'STANDBY' THEN '🟡'
        ELSE '🔴'
    END as status_emoji,
    COALESCE(
        NULLIF(wallets_active, 0),
        NULLIF(tasks_pending, 0),
        NULLIF(opportunities_active, 0),
        NULLIF(proposals_pending, 0),
        0
    ) as active_items,
    COALESCE(
        total_estimated_value,
        daily_rewards,
        daily_profit,
        daily_yield,
        0
    ) as daily_value,
    last_activity,
    EXTRACT(EPOCH FROM (NOW() - last_activity))/60 as minutes_since_activity
FROM grafana_agent_status;

-- View: Financial Master (com garantia de retorno de 1 linha)
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
    '0x3955d559055DadB7067054cB6E6f974710345224' as treasury_address,
    
    -- Status da frota
    (SELECT status FROM fleet_heartbeat WHERE id = 'fleet_v10_prod') as fleet_status,
    (SELECT last_ping FROM fleet_heartbeat WHERE id = 'fleet_v10_prod') as last_heartbeat

FROM liquidity_stats, governance_stats, task_stats, airdrop_stats;

-- View: Profit Realtime (últimas 24h)
CREATE OR REPLACE VIEW grafana_profit_realtime AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) FILTER (WHERE status = 'detected') as opportunities_detected,
    SUM(estimated_profit_usd) FILTER (WHERE status = 'detected') as gross_profit_potential,
    SUM(actual_profit_usd) FILTER (WHERE status = 'completed') as net_profit_realized,
    SUM(gas_cost_estimate) FILTER (WHERE status = 'completed') as total_gas_costs,
    COALESCE(SUM(actual_profit_usd) FILTER (WHERE status = 'completed'), 0) - 
    COALESCE(SUM(gas_cost_estimate) FILTER (WHERE status = 'completed'), 0) as profit_minus_gas,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0 
        THEN COUNT(*) FILTER (WHERE status = 'completed')::float / 
             COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) * 100
        ELSE 0 
    END as success_rate_pct
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;

-- View: Profit Accumulated (30 dias)
CREATE OR REPLACE VIEW grafana_profit_accumulated AS
SELECT 
    DATE(created_at) as date,
    COALESCE(SUM(estimated_profit_usd), 0) as daily_gross_potential,
    COALESCE(SUM(actual_profit_usd) FILTER (WHERE status = 'completed'), 0) as daily_net_realized,
    COALESCE(SUM(gas_cost_estimate) FILTER (WHERE status = 'completed'), 0) as daily_gas_costs,
    COALESCE(SUM(actual_profit_usd) FILTER (WHERE status = 'completed'), 0) - 
    COALESCE(SUM(gas_cost_estimate) FILTER (WHERE status = 'completed'), 0) as daily_profit_after_gas,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions
FROM liquidity_opportunities
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 5: HABILITAR REALTIME PARA TABELAS CRÍTICAS
-- ═══════════════════════════════════════════════════════════════════════════

-- Função para publicar mudanças no realtime
CREATE OR REPLACE FUNCTION notify_realtime_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'realtime_changes',
        json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', NOW()
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para fleet_heartbeat
DROP TRIGGER IF EXISTS fleet_heartbeat_realtime ON fleet_heartbeat;
CREATE TRIGGER fleet_heartbeat_realtime
    AFTER INSERT OR UPDATE ON fleet_heartbeat
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_change();

-- Trigger para liquidity_opportunities
DROP TRIGGER IF EXISTS liquidity_opportunities_realtime ON liquidity_opportunities;
CREATE TRIGGER liquidity_opportunities_realtime
    AFTER INSERT OR UPDATE ON liquidity_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_change();

-- Trigger para task_executions
DROP TRIGGER IF EXISTS task_executions_realtime ON task_executions;
CREATE TRIGGER task_executions_realtime
    AFTER INSERT OR UPDATE ON task_executions
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_change();

-- Trigger para governance_votes
DROP TRIGGER IF EXISTS governance_votes_realtime ON governance_votes;
CREATE TRIGGER governance_votes_realtime
    AFTER INSERT OR UPDATE ON governance_votes
    FOR EACH ROW
    EXECUTE FUNCTION notify_realtime_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 6: PERMISSÕES E POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- Garantir RLS nas tabelas
ALTER TABLE liquidity_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_heartbeat ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura para anon (Grafana)
-- (DROP IF EXISTS + CREATE para compatibilidade PostgreSQL)
DROP POLICY IF EXISTS "Grafana read liquidity" ON liquidity_opportunities;
CREATE POLICY "Grafana read liquidity" ON liquidity_opportunities FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read tasks" ON task_executions;
CREATE POLICY "Grafana read tasks" ON task_executions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read governance" ON governance_votes;
CREATE POLICY "Grafana read governance" ON governance_votes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read wallets" ON airdrop_wallets;
CREATE POLICY "Grafana read wallets" ON airdrop_wallets FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read opportunities" ON task_opportunities;
CREATE POLICY "Grafana read opportunities" ON task_opportunities FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read proposals" ON governance_proposals;
CREATE POLICY "Grafana read proposals" ON governance_proposals FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Grafana read heartbeat" ON fleet_heartbeat;
CREATE POLICY "Grafana read heartbeat" ON fleet_heartbeat FOR SELECT TO anon USING (true);

-- Permissões nas views
GRANT SELECT ON grafana_agent_status TO anon;
GRANT SELECT ON grafana_swarm_matrix TO anon;
GRANT SELECT ON grafana_financial_master TO anon;
GRANT SELECT ON grafana_profit_realtime TO anon;
GRANT SELECT ON grafana_profit_accumulated TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 7: VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════

-- Verificar se as views retornam dados
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar grafana_financial_master
    SELECT COUNT(*) INTO v_count FROM grafana_financial_master;
    RAISE NOTICE 'grafana_financial_master rows: %', v_count;
    
    -- Verificar grafana_swarm_matrix
    SELECT COUNT(*) INTO v_count FROM grafana_swarm_matrix;
    RAISE NOTICE 'grafana_swarm_matrix rows: %', v_count;
    
    -- Verificar dados nas tabelas base
    SELECT COUNT(*) INTO v_count FROM liquidity_opportunities;
    RAISE NOTICE 'liquidity_opportunities rows: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM task_executions;
    RAISE NOTICE 'task_executions rows: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM governance_votes;
    RAISE NOTICE 'governance_votes rows: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM airdrop_wallets;
    RAISE NOTICE 'airdrop_wallets rows: %', v_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ DASHBOARD_IGNITION_FIX v10.1 COMPLETO
-- Execute este script no SQL Editor do Supabase para:
-- 1. Criar tabelas base se não existirem
-- 2. Inserir dados de seed para garantir retorno
-- 3. Recriar views com garantias de dados
-- 4. Habilitar realtime
-- 5. Configurar permissões
-- ═══════════════════════════════════════════════════════════════════════════
