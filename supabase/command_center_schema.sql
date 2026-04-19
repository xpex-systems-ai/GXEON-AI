-- ============================================================
-- 🌑 GXEON_COMMAND_CENTER v1.0.0
-- Schema: Cyberpunk Sovereign
-- Tables: radar_pools, agent_logs, user_config
-- Realtime: ENABLED
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 📊 Table: radar_pools
-- Live Liquidity Feed - Pools detectados pelo Radar
-- ============================================================
CREATE TABLE IF NOT EXISTS radar_pools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_id TEXT NOT NULL DEFAULT 'arbitrum',
    dex_name TEXT NOT NULL,
    pair_address TEXT NOT NULL UNIQUE,
    token0_address TEXT NOT NULL,
    token1_address TEXT NOT NULL,
    token0_symbol TEXT,
    token1_symbol TEXT,
    
    -- Liquidity Metrics
    liquidity_usd DECIMAL(20, 8),
    volume_24h DECIMAL(20, 8),
    price_usd DECIMAL(20, 12),
    price_change_24h DECIMAL(8, 4),
    
    -- Pool Status
    is_new BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_honeypot_risk BOOLEAN DEFAULT false,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Source Tracking
    detected_by TEXT DEFAULT 'radarShix',
    detection_timestamp TIMESTAMPTZ DEFAULT NOW(),
    last_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- Extension Data
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Sovereign Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_liquidity CHECK (liquidity_usd >= 0),
    CONSTRAINT valid_volume CHECK (volume_24h >= 0)
);

-- Indexes for radar_pools
CREATE INDEX IF NOT EXISTS idx_radar_pools_liquidity ON radar_pools(liquidity_usd DESC) WHERE liquidity_usd > 10000;
CREATE INDEX IF NOT EXISTS idx_radar_pools_dex ON radar_pools(dex_name);
CREATE INDEX IF EXISTS idx_radar_pools_new ON radar_pools(is_new, detection_timestamp DESC) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_radar_pools_verified ON radar_pools(is_verified, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_radar_pools_metadata ON radar_pools USING GIN(metadata);

-- ============================================================
-- 📝 Table: agent_logs
-- Agent Activity Logs with Neon styling
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_type TEXT NOT NULL, -- 'SmartMoneyMonitor', 'MempoolSniper', 'DexLiquidityFetcher', etc.
    agent_name TEXT NOT NULL,
    
    -- Log Level & Category
    log_level TEXT NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    category TEXT, -- 'LIQUIDITY', 'MEMPOOL', 'TRADE', 'SYSTEM', 'SECURITY'
    
    -- Message & Context
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    
    -- Performance Metrics
    execution_time_ms INTEGER,
    rpc_latency_ms INTEGER,
    
    -- Source Reference
    pool_id UUID REFERENCES radar_pools(id) ON DELETE SET NULL,
    tx_hash TEXT,
    block_number BIGINT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Sovereign Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT
);

-- Indexes for agent_logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(log_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_category ON agent_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_recent ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_context ON agent_logs USING GIN(context);

-- ============================================================
-- ⚙️ Table: user_config
-- Founder-only configuration with remote toggles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- User Profile
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('founder', 'admin', 'viewer')),
    display_name TEXT,
    avatar_url TEXT,
    
    -- Remote Toggles (Mempool Sniper, etc.)
    config JSONB DEFAULT '{
        "mempool_sniper_enabled": true,
        "smart_money_monitor_enabled": true,
        "dex_liquidity_fetcher_enabled": true,
        "notification_enabled": true,
        "auto_trade_enabled": false,
        "risk_level": "medium",
        "min_liquidity_threshold": 10000,
        "min_profit_threshold": 5
    }'::jsonb,
    
    -- UI Preferences
    ui_theme TEXT DEFAULT 'cyberpunk',
    ui_density TEXT DEFAULT 'compact',
    
    -- Security
    last_login TIMESTAMPTZ,
    ip_whitelist TEXT[],
    api_keys JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_config
CREATE INDEX IF NOT EXISTS idx_user_config_user ON user_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_config_role ON user_config(role);

-- ============================================================
-- 🔒 Row Level Security (RLS)
-- Founder-only access for sensitive operations
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE radar_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Radar Pools: Public read, authenticated write
CREATE POLICY "radar_pools_public_read" ON radar_pools
    FOR SELECT USING (true);
    
CREATE POLICY "radar_pools_auth_insert" ON radar_pools
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "radar_pools_founder_update" ON radar_pools
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_config 
            WHERE user_id = auth.uid() 
            AND role IN ('founder', 'admin')
        )
    );

-- Agent Logs: Founder/Admin full access, users their own
CREATE POLICY "agent_logs_founder_all" ON agent_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_config 
            WHERE user_id = auth.uid() 
            AND role IN ('founder', 'admin')
        )
    );

CREATE POLICY "agent_logs_user_own" ON agent_logs
    FOR SELECT USING (user_id = auth.uid());

-- User Config: Founder sees all, users see own
CREATE POLICY "user_config_founder_all" ON user_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_config uc 
            WHERE uc.user_id = auth.uid() 
            AND uc.role = 'founder'
        )
    );

CREATE POLICY "user_config_own" ON user_config
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- ⚡ Realtime Subscriptions
-- Enable live updates for Dashboard
-- ============================================================

-- Add tables to realtime publication
BEGIN;
    -- Remove if exists, then add
    DELETE FROM realtime.publication_tables 
    WHERE publication = 'supabase_realtime' 
    AND table_name IN ('radar_pools', 'agent_logs', 'user_config');
    
    -- Add tables to realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE radar_pools;
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE user_config;
COMMIT;

-- ============================================================
-- 🎯 Functions & Triggers
-- ============================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to user_config
DROP TRIGGER IF EXISTS update_user_config_updated_at ON user_config;
CREATE TRIGGER update_user_config_updated_at
    BEFORE UPDATE ON user_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to mark pool as not new after 24h
CREATE OR REPLACE FUNCTION mark_pool_as_old()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE radar_pools 
    SET is_new = false 
    WHERE detection_timestamp < NOW() - INTERVAL '24 hours' 
    AND is_new = true;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- ============================================================
-- 📊 Views for Dashboard
-- ============================================================

-- High confidence pools view
CREATE OR REPLACE VIEW high_confidence_pools AS
SELECT 
    id,
    dex_name,
    token0_symbol,
    token1_symbol,
    liquidity_usd,
    volume_24h,
    confidence_score,
    is_verified,
    detection_timestamp,
    (liquidity_usd * volume_24h / NULLIF(confidence_score, 0)) as opportunity_score
FROM radar_pools
WHERE confidence_score >= 70
AND is_honeypot_risk = false
ORDER BY opportunity_score DESC;

-- Agent health view
CREATE OR REPLACE VIEW agent_health AS
SELECT 
    agent_name,
    agent_type,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE log_level = 'ERROR') as error_count,
    COUNT(*) FILTER (WHERE log_level = 'CRITICAL') as critical_count,
    AVG(execution_time_ms) as avg_execution_time,
    MAX(created_at) as last_activity
FROM agent_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name, agent_type;

-- ============================================================
-- 🌑 GXEON Sovereign Comments
-- ============================================================

COMMENT ON TABLE radar_pools IS '🌑 GXEON: Live liquidity pools detected by Radar';
COMMENT ON TABLE agent_logs IS '⚡ GXEON: Agent activity logs with cyberpunk styling';
COMMENT ON TABLE user_config IS '🛡️ GXEON: Founder-only configuration with remote toggles';

-- ============================================================
-- ✅ Schema Ready
-- ============================================================

SELECT 'GXEON_COMMAND_CENTER schema deployed successfully' as status;
