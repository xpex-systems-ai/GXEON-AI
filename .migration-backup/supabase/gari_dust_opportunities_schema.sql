-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 GARI BLOCKCHAIN v1.0 — Schema de Arqueologia Digital
-- Tabela: Oportunidades de taxas esquecidas e liquidez abandonada
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gari_dust_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação da posição
    pair_address TEXT NOT NULL,
    token0_address TEXT NOT NULL,
    token1_address TEXT NOT NULL,
    dex_name TEXT NOT NULL,
    chain_id INTEGER DEFAULT 42161, -- Arbitrum
    
    -- Análise econômica
    estimated_fees_usd DECIMAL(18,6),
    gas_cost_usd DECIMAL(18,6),
    profit_usd DECIMAL(18,6),
    confidence DECIMAL(3,2), -- 0.0 a 1.0
    
    -- Status do sweep
    status TEXT DEFAULT 'discovered', -- discovered, notified, claimed, expired, dismissed
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    notified_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    
    -- Rastreamento
    claimed_by TEXT, -- Endereço que coletou
    tx_hash TEXT,    -- Hash da transação de coleta
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_gari_status ON gari_dust_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_gari_profit ON gari_dust_opportunities(profit_usd DESC) WHERE status = 'discovered';
CREATE INDEX IF NOT EXISTS idx_gari_detected ON gari_dust_opportunities(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_gari_expires ON gari_dust_opportunities(expires_at) WHERE status = 'discovered';

COMMENT ON TABLE gari_dust_opportunities IS 'Oportunidades de taxas esquecidas identificadas pelo GARI DustSweeper';

-- ═══════════════════════════════════════════════════════════════════════════
-- View: Oportunidades ativas (para dashboard)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW gari_active_opportunities AS
SELECT
    id,
    pair_address,
    token0_address,
    token1_address,
    dex_name,
    profit_usd,
    confidence,
    status,
    detected_at,
    expires_at,
    -- Calcula tempo restante
    EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS minutes_remaining
FROM gari_dust_opportunities
WHERE status = 'discovered'
    AND expires_at > NOW()
ORDER BY profit_usd DESC;

COMMENT ON VIEW gari_active_opportunities IS 'Oportunidades de sweep disponíveis agora';

-- ═══════════════════════════════════════════════════════════════════════════
-- Function: Limpar oportunidades expiradas
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION gari_cleanup_expired()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE gari_dust_opportunities
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'discovered'
        AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 GARI v1.0 SCHEMA PRONTO
-- ═══════════════════════════════════════════════════════════════════════════
