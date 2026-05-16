-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON HUMANITY SOVEREIGN v21 - Social Impact Schema
-- 
-- Sistema: GXEON_HUMANITY_SOVEREIGN_V21
-- Missão: Extrair valor dos mercados globais para financiar a dignidade humana
-- Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
-- 
-- Decreto: General Júnior Sena
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing objects
DROP TABLE IF EXISTS humanitarian_impact_log CASCADE;
DROP TABLE IF EXISTS wealth_distribution CASCADE;
DROP VIEW IF EXISTS v_humanitarian_dashboard CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: humanitarian_impact_log
-- Registra todo o impacto social gerado pelo sistema
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE humanitarian_impact_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id TEXT NOT NULL DEFAULT 'GXEON_HUMANITY_SOVEREIGN_V21',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Métricas Financeiras
    total_profit_generated NUMERIC(20, 8) NOT NULL DEFAULT 0,
    humanitarian_fund_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    operational_reserve_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    fleet_expansion_balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    
    -- Métricas de Impacto Social
    total_meals_funded INTEGER NOT NULL DEFAULT 0,
    total_shelter_days INTEGER NOT NULL DEFAULT 0,
    people_fed INTEGER NOT NULL DEFAULT 0,
    people_sheltered INTEGER NOT NULL DEFAULT 0,
    
    -- Detalhes por Agente
    sniper_alpha_ops INTEGER NOT NULL DEFAULT 0,
    hunter_legacy_claims INTEGER NOT NULL DEFAULT 0,
    miner_compassion_tasks INTEGER NOT NULL DEFAULT 0,
    
    -- Metadados
    cycles_completed INTEGER NOT NULL DEFAULT 0,
    runtime_seconds INTEGER NOT NULL DEFAULT 0,
    networks_active TEXT[] NOT NULL DEFAULT '{}',
    
    -- Custos de Referência
    avg_meal_cost_usd NUMERIC(10, 2) NOT NULL DEFAULT 2.50,
    avg_shelter_day_cost_usd NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    
    -- Auditoria
    treasury_address TEXT NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224'
);

-- Índices para performance
CREATE INDEX idx_humanitarian_timestamp ON humanitarian_impact_log(timestamp DESC);
CREATE INDEX idx_humanitarian_system ON humanitarian_impact_log(system_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: wealth_distribution
-- Rastreia a distribuição de riqueza em tempo real
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE wealth_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Fonte do Lucro
    source TEXT NOT NULL, -- 'WHALE_ARBITRAGE', 'AIRDROP', 'MICRO_TASK'
    network TEXT NOT NULL, -- 'ETHEREUM', 'ARBITRUM', 'BASE'
    agent TEXT NOT NULL, -- 'SNIPER_ALPHA', 'HUNTER_LEGACY', 'MINER_COMPASSION'
    
    -- Valores
    gross_profit_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
    
    -- Distribuição (70/20/10)
    humanitarian_allocation NUMERIC(20, 8) NOT NULL DEFAULT 0, -- 70%
    operational_allocation NUMERIC(20, 8) NOT NULL DEFAULT 0,  -- 20%
    expansion_allocation NUMERIC(20, 8) NOT NULL DEFAULT 0,   -- 10%
    
    -- Impacto Calculado
    meals_funded INTEGER NOT NULL DEFAULT 0,
    shelter_days INTEGER NOT NULL DEFAULT 0,
    
    -- Detalhes
    transaction_hash TEXT,
    description TEXT,
    
    -- Criptografia Soberana
    encrypted_payload TEXT
);

CREATE INDEX idx_wealth_timestamp ON wealth_distribution(timestamp DESC);
CREATE INDEX idx_wealth_agent ON wealth_distribution(agent);
CREATE INDEX idx_wealth_network ON wealth_distribution(network);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW: v_humanitarian_dashboard
-- Dashboard unificado para Grafana
-- ═══════════════════════════════════════════════════════════════════════════
CREATE VIEW v_humanitarian_dashboard AS
SELECT 
    h.id,
    h.timestamp,
    h.system_id,
    
    -- Totais Financeiros
    h.total_profit_generated as total_profit_usd,
    h.humanitarian_fund_balance as humanitarian_fund_usd,
    h.operational_reserve_balance as operational_fund_usd,
    h.fleet_expansion_balance as expansion_fund_usd,
    
    -- Impacto Social Acumulado
    h.total_meals_funded,
    h.total_shelter_days,
    
    -- Impacto Calculado (média móvel 24h)
    ROUND(h.humanitarian_fund_balance / h.avg_meal_cost_usd, 0) as people_fed_equivalent,
    ROUND(h.humanitarian_fund_balance / h.avg_shelter_day_cost_usd, 0) as shelter_days_equivalent,
    
    -- Performance
    h.cycles_completed as ops_executed,
    h.runtime_seconds,
    
    -- Agentes
    h.sniper_alpha_ops,
    h.hunter_legacy_claims,
    h.miner_compassion_tasks,
    
    -- Métricas Derivadas
    CASE 
        WHEN h.runtime_seconds > 0 
        THEN ROUND((h.total_meals_funded::NUMERIC / h.runtime_seconds) * 3600, 2)
        ELSE 0 
    END as meals_per_hour,
    
    h.treasury_address
FROM humanitarian_impact_log h
ORDER BY h.timestamp DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS (Seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO humanitarian_impact_log (
    system_id,
    timestamp,
    total_profit_generated,
    humanitarian_fund_balance,
    operational_reserve_balance,
    fleet_expansion_balance,
    total_meals_funded,
    total_shelter_days,
    people_fed,
    people_sheltered,
    sniper_alpha_ops,
    hunter_legacy_claims,
    miner_compassion_tasks,
    cycles_completed,
    runtime_seconds,
    networks_active,
    avg_meal_cost_usd,
    avg_shelter_day_cost_usd,
    treasury_address
) VALUES (
    'GXEON_HUMANITY_SOVEREIGN_V21',
    NOW(),
    894.40,    -- total_profit_generated
    626.08,    -- humanitarian_fund_balance (70%)
    178.88,    -- operational_reserve_balance (20%)
    89.44,     -- fleet_expansion_balance (10%)
    250,       -- total_meals_funded (626.08 / 2.50)
    41,        -- total_shelter_days (626.08 / 15.00)
    250,       -- people_fed
    41,        -- people_sheltered
    12,        -- sniper_alpha_ops
    4,         -- hunter_legacy_claims
    27,        -- miner_compassion_tasks
    43,        -- cycles_completed
    1800,      -- runtime_seconds (30 min)
    ARRAY['ETHEREUM', 'ARBITRUM', 'BASE'],
    2.50,
    15.00,
    '0x3955d559055DadB7067054cB6E6f974710345224'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE humanitarian_impact_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_distribution ENABLE ROW LEVEL SECURITY;

-- Permitir leitura anônima (para dashboard Grafana)
CREATE POLICY humanitarian_select_anon ON humanitarian_impact_log
    FOR SELECT TO anon USING (true);

CREATE POLICY wealth_select_anon ON wealth_distribution
    FOR SELECT TO anon USING (true);

-- Permitir inserção via service role
CREATE POLICY humanitarian_insert_service ON humanitarian_impact_log
    FOR INSERT TO service_role USING (true);

CREATE POLICY wealth_insert_service ON wealth_distribution
    FOR INSERT TO service_role USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualização em tempo real
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_humanitarian_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('humanitarian_update', json_build_object(
        'table', TG_TABLE_NAME,
        'id', NEW.id,
        'timestamp', NEW.timestamp,
        'meals', NEW.total_meals_funded,
        'shelter', NEW.total_shelter_days
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER humanitarian_update_trigger
    AFTER INSERT ON humanitarian_impact_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_humanitarian_update();

-- ═══════════════════════════════════════════════════════════════════════════
-- CONCEDER PERMISSÕES
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT ON humanitarian_impact_log TO anon;
GRANT SELECT ON wealth_distribution TO anon;
GRANT SELECT ON v_humanitarian_dashboard TO anon;

GRANT ALL ON humanitarian_impact_log TO service_role;
GRANT ALL ON wealth_distribution TO service_role;
GRANT ALL ON v_humanitarian_dashboard TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'GXEON HUMANITY SOVEREIGN v21 - Schema instalado com sucesso!' as status;
SELECT * FROM v_humanitarian_dashboard LIMIT 1;
