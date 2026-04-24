-- ═══════════════════════════════════════════════════════════════════════════════
-- GXEON LIGHTHOUSE SIGNAL PROVIDER v3.0 — Schema SQL
-- M2M Alpha Broadcast — Zero-Gas Architecture
-- 
-- Tabelas:
--   1. signal_consumption_logs — Registro de cada sinal consumido (billing)
--   2. signal_client_sessions — Sessões de clientes para analytics
--   3. signal_daily_stats — Agregações diárias para dashboard
--   4. signal_opportunities — Cache de oportunidades detectadas
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SIGNAL CONSUMPTION LOGS (Billing Granular)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS signal_consumption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificadores
    signal_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(128) NOT NULL,
    api_key VARCHAR(256),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
    
    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Dados do sinal consumido
    opportunity_type VARCHAR(50),
    chain VARCHAR(20),
    dex VARCHAR(50),
    pool_address VARCHAR(42),
    
    -- Métricas financeiras
    liquidity_usd DECIMAL(18, 2),
    estimated_profit_usd DECIMAL(18, 2),
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Billing
    price_per_signal_usd DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    charged_amount_usd DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    signal_value_usd DECIMAL(18, 2),
    
    -- Beneficiário imutável
    beneficiary VARCHAR(42) NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224',
    
    -- Metadados
    client_ip INET,
    user_agent TEXT,
    session_duration_seconds INTEGER,
    
    -- Indexes para queries performáticas
    CONSTRAINT idx_signal_id UNIQUE (signal_id, client_id, timestamp)
);

-- Indexes otimizados
CREATE INDEX idx_consumption_client_id ON signal_consumption_logs(client_id);
CREATE INDEX idx_consumption_timestamp ON signal_consumption_logs(timestamp DESC);
CREATE INDEX idx_consumption_tier ON signal_consumption_logs(tier);
CREATE INDEX idx_consumption_date ON signal_consumption_logs(DATE(timestamp));
CREATE INDEX idx_consumption_profit ON signal_consumption_logs(estimated_profit_usd DESC) WHERE estimated_profit_usd > 10;

-- Row Level Security (RLS) — Clientes veem apenas seus próprios consumos
ALTER TABLE signal_consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client view own consumption" ON signal_consumption_logs
    FOR SELECT USING (client_id = current_setting('app.current_client_id', true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SIGNAL CLIENT SESSIONS (Analytics & Billing)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS signal_client_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    client_id VARCHAR(128) NOT NULL,
    api_key VARCHAR(256),
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Consumo
    signals_consumed INTEGER NOT NULL DEFAULT 0,
    total_billed_usd DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
    
    -- Metadados
    client_ip INET,
    user_agent TEXT,
    
    -- Beneficiário
    beneficiary VARCHAR(42) NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224',
    
    -- Criado em
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_client_id ON signal_client_sessions(client_id);
CREATE INDEX idx_sessions_started_at ON signal_client_sessions(started_at DESC);
CREATE INDEX idx_sessions_tier ON signal_client_sessions(tier);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SIGNAL DAILY STATS (Dashboard Metrics)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS signal_daily_stats (
    date DATE PRIMARY KEY,
    
    -- Contagens por tier
    signals_free INTEGER NOT NULL DEFAULT 0,
    signals_basic INTEGER NOT NULL DEFAULT 0,
    signals_premium INTEGER NOT NULL DEFAULT 0,
    signals_enterprise INTEGER NOT NULL DEFAULT 0,
    
    -- Receita por tier
    revenue_basic DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    revenue_premium DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    revenue_enterprise DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    
    -- Agregados
    total_revenue_usd DECIMAL(12, 4) NOT NULL DEFAULT 0.00,
    potential_profit_broadcast DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    unique_clients INTEGER NOT NULL DEFAULT 0,
    
    -- Beneficiário
    beneficiary VARCHAR(42) NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_signal_daily_stats_updated_at ON signal_daily_stats;
CREATE TRIGGER update_signal_daily_stats_updated_at
    BEFORE UPDATE ON signal_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SIGNAL OPPORTUNITIES CACHE (Para deduplicação e histórico)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS signal_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    signal_id VARCHAR(64) NOT NULL UNIQUE,
    source VARCHAR(50) NOT NULL DEFAULT 'RADAR_SHIX',
    
    -- Dados da oportunidade
    opportunity_type VARCHAR(50),
    chain VARCHAR(20),
    dex VARCHAR(50),
    pool_address VARCHAR(42),
    token_a_symbol VARCHAR(20),
    token_b_symbol VARCHAR(20),
    
    -- Métricas
    liquidity_usd DECIMAL(18, 2),
    volume_24h DECIMAL(18, 2),
    estimated_profit_usd DECIMAL(18, 2),
    confidence_score DECIMAL(3, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'executed', 'stale')),
    priority VARCHAR(20) DEFAULT 'normal',
    ttl_seconds INTEGER DEFAULT 300,
    
    -- Beneficiário
    beneficiary VARCHAR(42) NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224',
    
    -- Timestamps
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_signal_id ON signal_opportunities(signal_id);
CREATE INDEX idx_opportunities_detected_at ON signal_opportunities(detected_at DESC);
CREATE INDEX idx_opportunities_status ON signal_opportunities(status);
CREATE INDEX idx_opportunities_profit ON signal_opportunities(estimated_profit_usd DESC);

-- Auto-cleanup de oportunidades expiradas (opcional, pode rodar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_opportunities()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM signal_opportunities 
    WHERE expires_at < NOW() OR (detected_at + INTERVAL '1 second' * ttl_seconds) < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. VIEWS PARA ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Resumo de billing por cliente
CREATE OR REPLACE VIEW v_client_billing_summary AS
SELECT 
    client_id,
    tier,
    COUNT(*) as total_signals,
    SUM(charged_amount_usd) as total_billed_usd,
    AVG(estimated_profit_usd) as avg_profit_per_signal,
    SUM(estimated_profit_usd) as total_potential_profit,
    MIN(timestamp) as first_consumption,
    MAX(timestamp) as last_consumption
FROM signal_consumption_logs
GROUP BY client_id, tier;

-- View: Sinais de alto valor (para dashboard de oportunidades)
CREATE OR REPLACE VIEW v_high_value_signals AS
SELECT 
    signal_id,
    opportunity_type,
    chain,
    dex,
    pool_address,
    liquidity_usd,
    estimated_profit_usd,
    confidence_score,
    detected_at
FROM signal_opportunities
WHERE estimated_profit_usd > 10 AND status = 'active'
ORDER BY estimated_profit_usd DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Função: Gerar relatório diário
CREATE OR REPLACE FUNCTION generate_daily_report(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'total_signals'::VARCHAR,
        (signals_free + signals_basic + signals_premium + signals_enterprise)::DECIMAL
    FROM signal_daily_stats WHERE date = target_date
    
    UNION ALL
    
    SELECT 'revenue_usd'::VARCHAR, total_revenue_usd
    FROM signal_daily_stats WHERE date = target_date
    
    UNION ALL
    
    SELECT 'potential_profit_usd'::VARCHAR, potential_profit_broadcast
    FROM signal_daily_stats WHERE date = target_date
    
    UNION ALL
    
    SELECT 'unique_clients'::VARCHAR, unique_clients::DECIMAL
    FROM signal_daily_stats WHERE date = target_date;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS DOCUMENTAIS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE signal_consumption_logs IS 'Registro granular de cada sinal consumido por clientes para billing M2M';
COMMENT ON TABLE signal_client_sessions IS 'Sessões de clientes conectados ao Signal Provider';
COMMENT ON TABLE signal_daily_stats IS 'Agregações diárias para dashboard Grafana';
COMMENT ON TABLE signal_opportunities IS 'Cache de oportunidades detectadas pelo radar';

COMMENT ON COLUMN signal_consumption_logs.beneficiary IS 'Endereço imutável do beneficiário: 0x3955d559055DadB7067054cB6E6f974710345224';

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUÇÕES DE DEPLOY
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- 1. Execute no Supabase SQL Editor:
--    
-- 2. Configure as políticas RLS conforme necessário
--
-- 3. Para cleanup automático, agende via pg_cron (se disponível):
--    SELECT cron.schedule('cleanup-opportunities', '0 * * * *', 'SELECT cleanup_expired_opportunities()');
--
-- 4. Beneficiário imutável configurado em todas as tabelas relevantes
--
-- ═══════════════════════════════════════════════════════════════════════════════
