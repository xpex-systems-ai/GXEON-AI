-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON MEV-NEXUS v2.0 — Schema de Transmissões MEV-Share
-- Tabela: mev_transmissions — Persistência de bundles transmitidos
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilita UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela principal de transmissões MEV
CREATE TABLE IF NOT EXISTS mev_transmissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Identificação
    opportunity_id VARCHAR(64) NOT NULL,
    bundle_hash VARCHAR(66) NOT NULL UNIQUE,
    target_block BIGINT NOT NULL,
    
    -- Configuração MEV
    kickback_address VARCHAR(42) NOT NULL DEFAULT '0x3955d559055DadB7067054cB6E6f974710345224',
    kickback_percent INTEGER NOT NULL DEFAULT 40 CHECK (kickback_percent >= 0 AND kickback_percent <= 100),
    
    -- Métricas
    estimated_profit_usd DECIMAL(18, 8) DEFAULT 0,
    actual_kickback_usd DECIMAL(18, 8) DEFAULT 0,
    gas_used BIGINT,
    gas_price_gwei DECIMAL(18, 8),
    
    -- Status do bundle
    status VARCHAR(32) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'simulated', 'transmitted', 'included', 'reverted', 'expired')),
    
    -- Respostas do relay
    relay_response JSONB DEFAULT '{}',
    inclusion_block BIGINT,
    inclusion_tx_hash VARCHAR(66),
    
    -- Metadados
    source VARCHAR(32) DEFAULT 'GXEON-RADAR-SHIX',
    hints_used JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transmitted_at TIMESTAMP WITH TIME ZONE,
    included_at TIMESTAMP WITH TIME ZONE
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_mev_transmissions_status ON mev_transmissions(status);
CREATE INDEX IF NOT EXISTS idx_mev_transmissions_bundle_hash ON mev_transmissions(bundle_hash);
CREATE INDEX IF NOT EXISTS idx_mev_transmissions_target_block ON mev_transmissions(target_block);
CREATE INDEX IF NOT EXISTS idx_mev_transmissions_kickback_address ON mev_transmissions(kickback_address);
CREATE INDEX IF NOT EXISTS idx_mev_transmissions_created_at ON mev_transmissions(created_at DESC);

-- Índice composto para análise de performance
CREATE INDEX IF NOT EXISTS idx_mev_analysis 
    ON mev_transmissions(status, kickback_address, created_at) 
    WHERE status IN ('included', 'transmitted');

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mev_transmissions_updated_at ON mev_transmissions;
CREATE TRIGGER update_mev_transmissions_updated_at
    BEFORE UPDATE ON mev_transmissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View agregada para dashboard
CREATE OR REPLACE VIEW mev_performance_summary AS
SELECT 
    kickback_address,
    COUNT(*) as total_transmissions,
    COUNT(*) FILTER (WHERE status = 'included') as bundles_included,
    COUNT(*) FILTER (WHERE status = 'transmitted') as bundles_pending,
    SUM(estimated_profit_usd) as total_estimated_profit,
    SUM(actual_kickback_usd) as total_actual_kickback,
    AVG(estimated_profit_usd) FILTER (WHERE status = 'included') as avg_profit_per_bundle,
    MAX(created_at) as last_transmission_at
FROM mev_transmissions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY kickback_address;

-- Função para atualizar status quando bundle é incluído
CREATE OR REPLACE FUNCTION mark_bundle_included(
    p_bundle_hash VARCHAR(66),
    p_inclusion_block BIGINT,
    p_tx_hash VARCHAR(66),
    p_actual_kickback_usd DECIMAL(18, 8)
) RETURNS VOID AS $$
BEGIN
    UPDATE mev_transmissions 
    SET 
        status = 'included',
        inclusion_block = p_inclusion_block,
        inclusion_tx_hash = p_tx_hash,
        actual_kickback_usd = p_actual_kickback_usd,
        included_at = NOW(),
        updated_at = NOW()
    WHERE bundle_hash = p_bundle_hash;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE mev_transmissions IS 'Bundles transmitidos para MEV-Share Matchmaker';
COMMENT ON COLUMN mev_transmissions.bundle_hash IS 'Hash EIP-712 do bundle enviado ao relay';
COMMENT ON COLUMN mev_transmissions.kickback_address IS 'Endereço que recebe % do lucro (beneficiário)';
COMMENT ON COLUMN mev_transmissions.kickback_percent IS 'Porcentagem do lucro destinada ao searcher';

-- Permissões (ajustar conforme roles do projeto)
GRANT SELECT, INSERT, UPDATE ON mev_transmissions TO anon;
GRANT SELECT, INSERT, UPDATE ON mev_transmissions TO authenticated;
GRANT SELECT ON mev_performance_summary TO anon;
GRANT SELECT ON mev_performance_summary TO authenticated;
