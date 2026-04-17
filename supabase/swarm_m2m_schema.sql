--
-- 🐝 GXEON SWARM M2M v3.0 - Database Schema
-- Tabelas para tracking do sistema de enxame autônomo
--

-- Tabela de alvos descobertos pelo scouter
CREATE TABLE IF NOT EXISTS swarm_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'arbiscan_contract', 'github_repo', 'rapidapi_competitor'
    
    -- Identificadores
    address VARCHAR(42), -- Para contratos blockchain
    name VARCHAR(255), -- Para repos/APIs
    chain VARCHAR(50), -- 'arbitrum', 'ethereum', etc
    
    -- Dados específicos
    url TEXT,
    owner JSONB,
    endpoint JSONB, -- Array de {type, value} para contato
    description TEXT,
    language VARCHAR(50),
    
    -- Scoring
    score INTEGER DEFAULT 0,
    tx_count INTEGER,
    avg_gas_price BIGINT,
    last_activity TIMESTAMP,
    stars INTEGER,
    
    -- Status workflow
    status VARCHAR(50) DEFAULT 'pending_infiltration', -- pending_infiltration, contacted, converted, failed, ignored
    discovery_method VARCHAR(100),
    
    -- Tracking
    discovered_at TIMESTAMP DEFAULT NOW(),
    last_contact_at TIMESTAMP,
    contact_result JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_swarm_targets_status ON swarm_targets(status);
CREATE INDEX IF NOT EXISTS idx_swarm_targets_score ON swarm_targets(score DESC);
CREATE INDEX IF NOT EXISTS idx_swarm_targets_type ON swarm_targets(type);
CREATE INDEX IF NOT EXISTS idx_swarm_targets_discovered ON swarm_targets(discovered_at DESC);

-- Tabela de logs M2M
CREATE TABLE IF NOT EXISTS swarm_m2m_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES swarm_targets(id),
    target_type VARCHAR(50),
    payload_hash VARCHAR(64),
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, responded
    offer_type VARCHAR(100),
    channel VARCHAR(50), -- 'm2m_api', 'github_issue', 'email'
    response_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_m2m_logs_target ON swarm_m2m_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_m2m_logs_sent ON swarm_m2m_logs(sent_at DESC);

-- Tabela de ciclos de execução
CREATE TABLE IF NOT EXISTS swarm_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id VARCHAR(16) UNIQUE,
    execution_number INTEGER,
    scan_results JSONB,
    outreach_results JSONB,
    roi_metrics JSONB,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swarm_cycles_created ON swarm_cycles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swarm_cycles_number ON swarm_cycles(execution_number);

-- Tabela de conversões RapidAPI
CREATE TABLE IF NOT EXISTS rapidapi_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    source VARCHAR(100), -- 'swarm_m2m', 'organic', 'referral'
    tracking_code VARCHAR(32),
    plan_type VARCHAR(50),
    revenue DECIMAL(10,2),
    tracked BOOLEAN DEFAULT false,
    swarm_cycle INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapidapi_conv_tracked ON rapidapi_conversions(tracked);
CREATE INDEX IF NOT EXISTS idx_rapidapi_conv_source ON rapidapi_conversions(source);
CREATE INDEX IF NOT EXISTS idx_rapidapi_conv_tracking ON rapidapi_conversions(tracking_code);

-- Tabela de erros do swarm
CREATE TABLE IF NOT EXISTS swarm_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id VARCHAR(16),
    error_message TEXT,
    stack TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swarm_errors_time ON swarm_errors(timestamp DESC);

-- View agregada de performance
CREATE OR REPLACE VIEW swarm_performance AS
SELECT 
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as cycles,
    SUM((roi_metrics->>'conversions')::INTEGER) as total_conversions,
    SUM((roi_metrics->>'totalRevenue')::DECIMAL) as total_revenue,
    AVG((roi_metrics->>'roi')::DECIMAL) as avg_roi,
    AVG((scan_results->>'leadsFound')::INTEGER) as avg_leads_per_cycle
FROM swarm_cycles
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_swarm_targets_updated_at ON swarm_targets;
CREATE TRIGGER update_swarm_targets_updated_at
    BEFORE UPDATE ON swarm_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular ROI em tempo real
CREATE OR REPLACE FUNCTION get_swarm_roi(
    start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
    total_outreach INTEGER,
    total_conversions INTEGER,
    total_revenue DECIMAL,
    avg_cac DECIMAL,
    roi_multiple DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM((outreach_results->>'attempted')::INTEGER), 0)::INTEGER as total_outreach,
        COALESCE(SUM((roi_metrics->>'conversions')::INTEGER), 0)::INTEGER as total_conversions,
        COALESCE(SUM((roi_metrics->>'totalRevenue')::DECIMAL), 0) as total_revenue,
        COALESCE(AVG((roi_metrics->>'cac')::DECIMAL), 0) as avg_cac,
        COALESCE(AVG((roi_metrics->>'roi')::DECIMAL), 0) as roi_multiple
    FROM swarm_cycles
    WHERE created_at >= start_date;
END;
$$ LANGUAGE plpgsql;

-- Comentários de documentação
COMMENT ON TABLE swarm_targets IS 'Alvos descobertos pelo agente scouter no ecossistema blockchain e GitHub';
COMMENT ON TABLE swarm_cycles IS 'Registro de cada ciclo de execução do swarm M2M';
COMMENT ON TABLE rapidapi_conversions IS 'Conversões rastreadas da RapidAPI vindas do swarm';
COMMENT ON VIEW swarm_performance IS 'Visão agregada de performance diária do swarm';
