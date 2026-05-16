-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 RADAR LIQUIDITY v1 — Schema para monitoramento DEX na Arbitrum
-- Abandona Twitter API 402 → Foco em novos pools e movimentação smart money
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Pares de liquidez detectados na Arbitrum
CREATE TABLE IF NOT EXISTS radar_liquidity_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id INTEGER NOT NULL DEFAULT 42161, -- Arbitrum Mainnet
    pair_address TEXT NOT NULL UNIQUE,
    token0_address TEXT NOT NULL,
    token1_address TEXT NOT NULL,
    token0_symbol TEXT,
    token1_symbol TEXT,
    dex_name TEXT NOT NULL, -- uniswap_v3, sushiswap, camelot, etc.
    
    -- Métricas de liquidez
    liquidity_usd DECIMAL(18,2),
    liquidity_depth DECIMAL(18,6), -- Profundidade da liquidez (score 0-1)
    volume_24h_usd DECIMAL(18,2),
    price_impact_1k DECIMAL(8,4), -- Impacto de preço para $1k trade
    price_impact_10k DECIMAL(8,4), -- Impacto de preço para $10k trade
    
    -- Detecção
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    block_number BIGINT,
    transaction_hash TEXT,
    
    -- Status
    status TEXT DEFAULT 'new', -- new, monitoring, high_alert, archived
    alert_triggered BOOLEAN DEFAULT FALSE,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_detected 
    ON radar_liquidity_pools(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_pair 
    ON radar_liquidity_pools(pair_address);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_status 
    ON radar_liquidity_pools(status);
CREATE INDEX IF NOT EXISTS idx_liquidity_pools_liquidity 
    ON radar_liquidity_pools(liquidity_usd DESC) 
    WHERE liquidity_usd > 10000; -- Apenas pools > $10k

COMMENT ON TABLE radar_liquidity_pools IS 'Pools de liquidez detectados na Arbitrum pelo Radar DEX';

-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Movimentações Smart Money (transfers > 5 ETH)
CREATE TABLE IF NOT EXISTS radar_smart_money_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id INTEGER NOT NULL DEFAULT 42161,
    
    -- Transfer info
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    token_address TEXT, -- NULL para ETH nativo
    token_symbol TEXT,
    amount DECIMAL(24,8),
    amount_usd DECIMAL(18,2),
    
    -- Classificação smart money
    flow_type TEXT, -- whale_movement, dex_deposit, bridge_in, bridge_out, contract_interaction
    smart_score DECIMAL(3,2), -- Score de "smartness" baseado em histórico
    
    -- Contexto
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Análise
    related_pool_id UUID REFERENCES radar_liquidity_pools(id),
    is_whale BOOLEAN DEFAULT FALSE, -- > $100k
    is_new_wallet BOOLEAN DEFAULT FALSE, -- Primeira transação em 30 dias
    is_pending BOOLEAN DEFAULT FALSE, -- Mempool sniper: pre-confirmação
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análise rápida
CREATE INDEX IF NOT EXISTS idx_smart_money_detected 
    ON radar_smart_money_flows(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_money_from 
    ON radar_smart_money_flows(from_address);
CREATE INDEX IF NOT EXISTS idx_smart_money_to 
    ON radar_smart_money_flows(to_address);
CREATE INDEX IF NOT EXISTS idx_smart_money_block 
    ON radar_smart_money_flows(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_smart_money_amount 
    ON radar_smart_money_flows(amount_usd DESC) 
    WHERE amount_usd > 5000;

COMMENT ON TABLE radar_smart_money_flows IS 'Movimentações de smart money (>5 ETH) detectadas via Alchemy';

-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Telemetria de scan por bloco (agora a cada 1s)
CREATE TABLE IF NOT EXISTS radar_liquidity_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ,
    
    -- Métricas do scan
    new_pools_detected INTEGER DEFAULT 0,
    high_liquidity_alerts INTEGER DEFAULT 0, -- > $10k
    smart_money_events INTEGER DEFAULT 0,
    total_pools_tracked INTEGER DEFAULT 0,
    
    -- Performance
    scan_duration_ms INTEGER,
    api_calls_made INTEGER DEFAULT 0,
    websocket_events INTEGER DEFAULT 0,
    
    -- Estado
    error TEXT,
    is_synced BOOLEAN DEFAULT TRUE, -- Se conseguiu sync com bloco
    
    -- Timestamps
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidity_telemetry_block 
    ON radar_liquidity_telemetry(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_liquidity_telemetry_scanned 
    ON radar_liquidity_telemetry(scanned_at DESC);

COMMENT ON TABLE radar_liquidity_telemetry IS 'Telemetria de cada ciclo de scan (1s / bloco Arbitrum)';

-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Heartbeat do radar de liquidez
CREATE TABLE IF NOT EXISTS radar_liquidity_heartbeat (
    id TEXT PRIMARY KEY DEFAULT 'liquidity_radar_v1',
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    uptime_seconds INTEGER DEFAULT 0,
    block_count INTEGER DEFAULT 0,
    total_pools_detected INTEGER DEFAULT 0,
    total_smart_money_events INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'scanning', -- scanning, idle, error, stopped
    last_block_number BIGINT,
    last_error TEXT,
    
    -- Config
    scan_interval_ms INTEGER DEFAULT 1000,
    min_liquidity_threshold DECIMAL(18,2) DEFAULT 10000,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE radar_liquidity_heartbeat IS 'Status em tempo real do Radar de Liquidez';

-- ═══════════════════════════════════════════════════════════════════════════
-- Políticas RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE radar_liquidity_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_smart_money_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_liquidity_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_liquidity_heartbeat ENABLE ROW LEVEL SECURITY;

-- Políticas de inserção para o serviço
DROP POLICY IF EXISTS "Service can insert pools" ON radar_liquidity_pools;
CREATE POLICY "Service can insert pools" 
    ON radar_liquidity_pools FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert smart money" ON radar_smart_money_flows;
CREATE POLICY "Service can insert smart money" 
    ON radar_smart_money_flows FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert telemetry" ON radar_liquidity_telemetry;
CREATE POLICY "Service can insert telemetry" 
    ON radar_liquidity_telemetry FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Service can upsert heartbeat" ON radar_liquidity_heartbeat;
CREATE POLICY "Service can upsert heartbeat" 
    ON radar_liquidity_heartbeat FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas de leitura pública
DROP POLICY IF EXISTS "Public can read pools" ON radar_liquidity_pools;
CREATE POLICY "Public can read pools" 
    ON radar_liquidity_pools FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read smart money" ON radar_smart_money_flows;
CREATE POLICY "Public can read smart money" 
    ON radar_smart_money_flows FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read telemetry" ON radar_liquidity_telemetry;
CREATE POLICY "Public can read telemetry" 
    ON radar_liquidity_telemetry FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read heartbeat" ON radar_liquidity_heartbeat;
CREATE POLICY "Public can read heartbeat" 
    ON radar_liquidity_heartbeat FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Views úteis para dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Pools de alta liquidez (>$10k) nas últimas 24h
CREATE OR REPLACE VIEW radar_high_liquidity_24h AS
SELECT 
    COUNT(*) as total_pools,
    COUNT(*) FILTER (WHERE alert_triggered = true) as alerted_pools,
    AVG(liquidity_usd) as avg_liquidity,
    MAX(liquidity_usd) as max_liquidity,
    AVG(price_impact_1k) as avg_price_impact,
    MAX(detected_at) as last_detection
FROM radar_liquidity_pools
WHERE detected_at > NOW() - INTERVAL '24 hours'
AND liquidity_usd >= 10000;

-- View: Smart money ativo nas últimas 6h
CREATE OR REPLACE VIEW radar_smart_money_summary AS
SELECT 
    flow_type,
    COUNT(*) as event_count,
    SUM(amount_usd) as total_volume_usd,
    AVG(smart_score) as avg_smart_score,
    COUNT(DISTINCT from_address) as unique_senders,
    COUNT(DISTINCT to_address) as unique_receivers
FROM radar_smart_money_flows
WHERE detected_at > NOW() - INTERVAL '6 hours'
GROUP BY flow_type
ORDER BY total_volume_usd DESC;

-- View: Alertas ativos (pools > $10k ou smart money > $50k)
CREATE OR REPLACE VIEW radar_active_alerts AS
SELECT 
    'high_liquidity' as alert_type,
    pair_address as target,
    liquidity_usd as value_usd,
    dex_name as source,
    detected_at,
    status
FROM radar_liquidity_pools
WHERE liquidity_usd >= 10000 
AND detected_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'smart_money' as alert_type,
    transaction_hash as target,
    amount_usd as value_usd,
    flow_type as source,
    detected_at,
    CASE WHEN is_whale THEN 'whale' ELSE 'normal' END as status
FROM radar_smart_money_flows
WHERE amount_usd >= 50000
AND detected_at > NOW() - INTERVAL '1 hour'

ORDER BY detected_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- Dados iniciais
-- ═══════════════════════════════════════════════════════════════════════════

-- Inicializa heartbeat
INSERT INTO radar_liquidity_heartbeat (id, status, scan_interval_ms, min_liquidity_threshold) 
VALUES ('liquidity_radar_v1', 'idle', 1000, 10000)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 RADAR LIQUIDITY v1 PRONTO — Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════
