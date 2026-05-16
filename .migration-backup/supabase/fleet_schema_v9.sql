-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON GENERAL FLEET DEPLOYMENT v9.0
-- Schema SQL para Frota de Agentes Autônomos Monetizáveis
-- 
-- Autorizado por: Comandante Júnior Sena
-- Data: 2026-04-20
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 1: Airdrop Wallets (AIRDROP_HUNTER_ELITE)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS airdrop_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    private_key_encrypted TEXT, -- AES-256 encrypted
    
    -- Métricas de atividade
    interactions INTEGER DEFAULT 0,
    faucet_claims INTEGER DEFAULT 0,
    pow_claims INTEGER DEFAULT 0,
    
    -- Eligibility Score
    eligibility_score INTEGER DEFAULT 0,
    eligibility_level TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
    estimated_value_usd DECIMAL(12,2) DEFAULT 0,
    
    -- Target Networks
    target_networks TEXT[] DEFAULT ARRAY['sepolia', 'zksync', 'layerzero', 'starknet'],
    
    -- Status
    status TEXT DEFAULT 'active', -- active, suspended, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadados
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_airdrop_wallets_score ON airdrop_wallets(eligibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_airdrop_wallets_status ON airdrop_wallets(status);

COMMENT ON TABLE airdrop_wallets IS 'Wallets gerenciadas pelo Airdrop Hunter Elite para farming de airdrops';

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 2: Airdrop Eligibility Reports
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS airdrop_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Métricas agregadas
    total_wallets INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    total_faucet_claims INTEGER DEFAULT 0,
    
    -- Score distribution
    high_eligibility_count INTEGER DEFAULT 0,
    medium_eligibility_count INTEGER DEFAULT 0,
    low_eligibility_count INTEGER DEFAULT 0,
    
    -- Valor estimado
    estimated_total_value_usd DECIMAL(18,2) DEFAULT 0,
    
    -- Detalhes por wallet
    wallet_details JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airdrop_eligibility_date ON airdrop_eligibility(report_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 3: Task Opportunities (TASK_MINER_AGGREGATOR)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    source TEXT NOT NULL, -- galxe, zealy, layer3, intract, guild
    
    -- Identificação
    title TEXT NOT NULL,
    description TEXT,
    type TEXT, -- onchain, social, quiz, mixed
    
    -- Reward
    reward_type TEXT, -- points, tokens, NFT, XP
    reward_value DECIMAL(18,6),
    reward_token TEXT,
    
    -- Priority Scoring
    priority_score DECIMAL(8,4),
    complexity INTEGER, -- 1-10
    time_required_minutes INTEGER,
    success_probability DECIMAL(3,2),
    estimated_profit DECIMAL(12,4),
    recommendation TEXT, -- EXECUTE_NOW, QUEUE, LOW_PRIORITY
    
    -- Execution
    status TEXT DEFAULT 'pending', -- pending, queued, executing, completed, failed
    assigned_agent TEXT,
    wallet_used TEXT,
    
    -- Metadata
    chain TEXT,
    requirements JSONB DEFAULT '[]',
    execution_steps JSONB DEFAULT '[]',
    
    -- Timestamps
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    UNIQUE(task_id, source)
);

CREATE INDEX IF NOT EXISTS idx_task_opportunities_priority ON task_opportunities(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_task_opportunities_status ON task_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_task_opportunities_source ON task_opportunities(source);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 4: Task Executions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    
    -- Execução
    title TEXT,
    source TEXT,
    status TEXT, -- completed, failed
    
    -- Reward
    reward_type TEXT,
    reward_value DECIMAL(18,6),
    reward_token TEXT,
    
    -- Prova
    proof_tx_hash TEXT,
    proof_screenshot TEXT,
    proof_response JSONB,
    
    -- Erro (se falhou)
    error_message TEXT,
    
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_executions_date ON task_executions(executed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 5: Liquidity Opportunities (LIQUIDITY_SNIPER_V2)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS liquidity_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    pair TEXT NOT NULL,
    tier INTEGER, -- 1, 2, 3
    
    -- Divergência
    divergence_percent DECIMAL(8,4),
    price_pool_a DECIMAL(18,8),
    price_pool_b DECIMAL(18,8),
    
    -- Profit
    estimated_profit_usd DECIMAL(12,2),
    flash_loan_amount DECIMAL(18,6),
    gas_cost_estimate DECIMAL(12,4),
    net_profit_usd DECIMAL(12,2),
    
    -- Status
    status TEXT DEFAULT 'detected', -- detected, simulating, executing, completed, expired
    
    -- Execução (se executada)
    executed_at TIMESTAMPTZ,
    tx_hash TEXT,
    actual_profit_usd DECIMAL(12,2),
    gas_used DECIMAL(18,0),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_liquidity_opp_status ON liquidity_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_liquidity_opp_profit ON liquidity_opportunities(estimated_profit_usd DESC);
CREATE INDEX IF NOT EXISTS idx_liquidity_opp_created ON liquidity_opportunities(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 6: Smart Money Flows
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS smart_money_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transfer
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    token_address TEXT,
    token_symbol TEXT,
    amount DECIMAL(24,8),
    amount_usd DECIMAL(18,2),
    
    -- Classificação
    flow_type TEXT, -- whale_movement, dex_deposit, bridge_in, bridge_out
    smart_score DECIMAL(3,2),
    is_whale BOOLEAN DEFAULT FALSE,
    is_new_wallet BOOLEAN DEFAULT FALSE,
    
    -- Contexto
    block_number BIGINT,
    transaction_hash TEXT NOT NULL,
    
    -- Relacionamento
    related_pool_id UUID REFERENCES liquidity_opportunities(id),
    
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_money_detected ON smart_money_flows(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_money_amount ON smart_money_flows(amount_usd DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 7: Governance Proposals (GOVERNANCE_INFILTRATOR)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS governance_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT NOT NULL,
    
    -- DAO
    dao_name TEXT NOT NULL,
    dao_token TEXT NOT NULL,
    
    -- Proposta
    title TEXT NOT NULL,
    description TEXT,
    status TEXT, -- active, closed, executed
    
    -- Tempo
    hours_remaining DECIMAL(6,1),
    deadline_at TIMESTAMPTZ,
    
    -- Votos
    total_votes DECIMAL(24,2),
    quorum DECIMAL(24,2),
    
    -- Bribes
    bribes JSONB DEFAULT '[]',
    total_bribe_value_usd DECIMAL(12,2) DEFAULT 0,
    
    -- Status de voto
    voted BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMPTZ,
    vote_choice TEXT, -- for, against, abstain
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(proposal_id, dao_name)
);

CREATE INDEX IF NOT EXISTS idx_governance_dao ON governance_proposals(dao_name);
CREATE INDEX IF NOT EXISTS idx_governance_bribe ON governance_proposals(total_bribe_value_usd DESC);
CREATE INDEX IF NOT EXISTS idx_governance_status ON governance_proposals(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 8: Governance Votes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id TEXT NOT NULL,
    dao_name TEXT NOT NULL,
    
    -- Voto
    vote_choice TEXT,
    voting_power_used DECIMAL(24,2),
    
    -- Yield
    bribe_value_usd DECIMAL(12,2),
    yield_earned_usd DECIMAL(12,2),
    
    -- Proof
    tx_hash TEXT,
    
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_votes_date ON governance_votes(executed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA 9: Fleet Heartbeat
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fleet_heartbeat (
    id TEXT PRIMARY KEY DEFAULT 'fleet_v9',
    
    -- Status geral
    status TEXT DEFAULT 'active', -- active, paused, error
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    uptime_seconds INTEGER DEFAULT 0,
    
    -- Agentes
    airdrop_hunter_status TEXT DEFAULT 'stopped',
    task_miner_status TEXT DEFAULT 'stopped',
    liquidity_sniper_status TEXT DEFAULT 'stopped',
    governance_status TEXT DEFAULT 'stopped',
    
    -- Métricas agregadas
    total_opportunities_found INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_votes_executed INTEGER DEFAULT 0,
    total_profit_usd DECIMAL(18,2) DEFAULT 0,
    
    -- Config
    simulation_mode BOOLEAN DEFAULT FALSE,
    emergency_stop BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inicializa heartbeat
INSERT INTO fleet_heartbeat (id, status) 
VALUES ('fleet_v9', 'active')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE airdrop_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_money_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_heartbeat ENABLE ROW LEVEL SECURITY;

-- Políticas de serviço
CREATE POLICY "Service can manage fleet" ON airdrop_wallets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON airdrop_eligibility FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON task_opportunities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON task_executions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON liquidity_opportunities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON smart_money_flows FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON governance_proposals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON governance_votes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage fleet" ON fleet_heartbeat FOR ALL TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS PARA DASHBOARD
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Performance diária da frota
CREATE OR REPLACE VIEW fleet_daily_performance AS
SELECT 
    DATE_TRUNC('day', created_at) as day,
    COUNT(DISTINCT CASE WHEN source = 'galxe' THEN task_id END) as galxe_tasks,
    COUNT(DISTINCT CASE WHEN source = 'zealy' THEN task_id END) as zealy_tasks,
    COUNT(DISTINCT CASE WHEN source = 'layer3' THEN task_id END) as layer3_tasks,
    SUM(reward_value) FILTER (WHERE status = 'completed') as total_rewards,
    AVG(priority_score) as avg_priority_score
FROM task_opportunities
GROUP BY 1
ORDER BY 1 DESC;

-- View: Top oportunidades de liquidez
CREATE OR REPLACE VIEW top_liquidity_opportunities AS
SELECT 
    pair,
    divergence_percent,
    estimated_profit_usd,
    net_profit_usd,
    status,
    created_at
FROM liquidity_opportunities
WHERE status = 'detected'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY estimated_profit_usd DESC
LIMIT 10;

-- View: Yield de governança acumulado
CREATE OR REPLACE VIEW governance_yield_summary AS
SELECT 
    dao_name,
    COUNT(*) as votes_executed,
    SUM(bribe_value_usd) as total_bribe_value,
    SUM(yield_earned_usd) as total_yield_earned,
    AVG(yield_earned_usd) as avg_yield_per_vote
FROM governance_votes
GROUP BY dao_name
ORDER BY total_yield_earned DESC;

-- View: Eligibility score distribution
CREATE OR REPLACE VIEW airdrop_eligibility_distribution AS
SELECT 
    eligibility_level,
    COUNT(*) as wallet_count,
    AVG(eligibility_score) as avg_score,
    SUM(estimated_value_usd) as total_estimated_value
FROM airdrop_wallets
WHERE status = 'active'
GROUP BY eligibility_level
ORDER BY avg_score DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÕES TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

-- Função: Atualizar heartbeat automaticamente
CREATE OR REPLACE FUNCTION update_fleet_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO fleet_heartbeat (id, last_ping, updated_at)
    VALUES ('fleet_v9', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        last_ping = NOW(),
        updated_at = NOW(),
        uptime_seconds = fleet_heartbeat.uptime_seconds + 60;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Atualizar heartbeat a cada inserção em task_opportunities
DROP TRIGGER IF EXISTS fleet_heartbeat_trigger ON task_opportunities;
CREATE TRIGGER fleet_heartbeat_trigger
    AFTER INSERT ON task_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_heartbeat();

-- ═══════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS DE EXEMPLO
-- ═══════════════════════════════════════════════════════════════════════════

-- Exemplo de wallets iniciais
INSERT INTO airdrop_wallets (address, eligibility_score, eligibility_level, estimated_value_usd)
VALUES 
    ('0x1234...5678', 175, 'HIGH', 87.50),
    ('0x5678...9012', 120, 'MEDIUM', 60.00),
    ('0x9012...3456', 85, 'LOW', 42.50)
ON CONFLICT (address) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🚀 FLEET SCHEMA v9.0 PRONTO
-- Execute no SQL Editor do Supabase para ativar persistência completa
-- ═══════════════════════════════════════════════════════════════════════════
