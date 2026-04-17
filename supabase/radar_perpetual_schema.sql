-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 RADAR PERPÉTUO — Schema para telemetria de caça contínua
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Oportunidades detectadas (cada lead encontrado)
CREATE TABLE IF NOT EXISTS radar_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'twitter',
    handle TEXT NOT NULL,
    tweet_id TEXT,
    text TEXT,
    followers INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    relevance_score DECIMAL(3,2),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, processed, converted, ignored
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_radar_opportunities_detected 
    ON radar_opportunities(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_opportunities_handle 
    ON radar_opportunities(handle);
CREATE INDEX IF NOT EXISTS idx_radar_opportunities_status 
    ON radar_opportunities(status);

-- Comentário
COMMENT ON TABLE radar_opportunities IS 'Leads/oportunidades detectadas pelo Radar Perpétuo';

-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Telemetria de cada ciclo de scan
CREATE TABLE IF NOT EXISTS radar_scan_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_count INTEGER DEFAULT 0,
    opportunities_found INTEGER DEFAULT 0,
    total_opportunities INTEGER DEFAULT 0,
    scan_duration_ms INTEGER,
    error TEXT,
    uptime_seconds INTEGER DEFAULT 0,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para análise temporal
CREATE INDEX IF NOT EXISTS idx_radar_scan_telemetry_scanned 
    ON radar_scan_telemetry(scanned_at DESC);

COMMENT ON TABLE radar_scan_telemetry IS 'Métricas de cada ciclo de scan do Radar';

-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Heartbeat do radar (último ping)
CREATE TABLE IF NOT EXISTS radar_heartbeat (
    id TEXT PRIMARY KEY DEFAULT 'perpetual_radar',
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    uptime_seconds INTEGER DEFAULT 0,
    block_count INTEGER DEFAULT 0,
    opportunities_total INTEGER DEFAULT 0,
    status TEXT DEFAULT 'hunting', -- hunting, idle, error, stopped
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE radar_heartbeat IS 'Status em tempo real do Radar Perpétuo';

-- ═══════════════════════════════════════════════════════════════════════════
-- Políticas RLS (opcional — ativar se necessário)
-- ═══════════════════════════════════════════════════════════════════════════

-- Permitir inserções anônimas do serviço (ajustar conforme necessidade)
ALTER TABLE radar_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_scan_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_heartbeat ENABLE ROW LEVEL SECURITY;

-- Política: Serviço pode inserir
CREATE POLICY IF NOT EXISTS "Service can insert opportunities" 
    ON radar_opportunities FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service can insert telemetry" 
    ON radar_scan_telemetry FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service can upsert heartbeat" 
    ON radar_heartbeat FOR ALL TO anon USING (true) WITH CHECK (true);

-- Política: Leitura pública para dashboard
CREATE POLICY IF NOT EXISTS "Public can read opportunities" 
    ON radar_opportunities FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Public can read telemetry" 
    ON radar_scan_telemetry FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Public can read heartbeat" 
    ON radar_heartbeat FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Views úteis para dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Oportunidades das últimas 24h
CREATE OR REPLACE VIEW radar_opportunities_24h AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE verified = true) as verified_count,
    AVG(relevance_score) as avg_score,
    MAX(detected_at) as last_detection
FROM radar_opportunities
WHERE detected_at > NOW() - INTERVAL '24 hours';

-- View: Estatísticas de scan
CREATE OR REPLACE VIEW radar_scan_stats AS
SELECT 
    COUNT(*) as total_scans,
    SUM(opportunities_found) as total_opportunities,
    AVG(scan_duration_ms) as avg_duration_ms,
    MAX(scanned_at) as last_scan
FROM radar_scan_telemetry
WHERE scanned_at > NOW() - INTERVAL '24 hours';

-- ═══════════════════════════════════════════════════════════════════════════
-- Dados iniciais
-- ═══════════════════════════════════════════════════════════════════════════

-- Inicializa heartbeat
INSERT INTO radar_heartbeat (id, status) 
VALUES ('perpetual_radar', 'idle')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 RADAR PERPÉTUO PRONTO — Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════
