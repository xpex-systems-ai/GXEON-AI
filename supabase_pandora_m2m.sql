-- 🌑 PANDORA PROTOCOL — M2M Infrastructure Setup
-- Machine-to-Machine Monetization Tables & Functions
-- GXEON v2.2 — Zero Human Input Required

-- =====================================================
-- 🎯 M2M AGENT TIER SYSTEM
-- =====================================================

-- Add tier column to users table
ALTER TABLE gxeon_users 
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'pro',
ADD COLUMN IF NOT EXISTS daily_calls_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_call_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'autonomous', -- 'human', 'autonomous', 'hybrid'
ADD COLUMN IF NOT EXISTS m2m_enabled BOOLEAN DEFAULT true;

-- Create index for M2M queries
CREATE INDEX IF NOT EXISTS idx_gxeon_users_m2m 
ON gxeon_users(tier, daily_calls_count, m2m_enabled) 
WHERE m2m_enabled = true;

-- =====================================================
-- 📊 M2M ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS m2m_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    credits_deducted DECIMAL(10,4) NOT NULL,
    remaining_balance DECIMAL(10,4),
    source VARCHAR(100) NOT NULL,
    request_time_ms INTEGER,
    response_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_m2m_analytics_agent 
ON m2m_analytics(agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_m2m_analytics_time 
ON m2m_analytics(timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- =====================================================
-- 📝 M2M REQUEST LOG (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS m2m_request_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(255) NOT NULL,
    route VARCHAR(255) NOT NULL,
    cost DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100) DEFAULT 'sovereign_api',
    ip_hash VARCHAR(255), -- Hashed for privacy
    user_agent_hash VARCHAR(255),
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_m2m_log_time 
ON m2m_request_log(timestamp DESC);

-- =====================================================
-- 💰 FLASH LOAN TAX TRACKING (0.01%)
-- =====================================================

CREATE TABLE IF NOT EXISTS flash_loan_tax (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    executor_agent_id VARCHAR(255) NOT NULL,
    loan_amount_usd DECIMAL(20,2) NOT NULL,
    tax_amount_usd DECIMAL(20,4) NOT NULL, -- 0.01% of loan
    tax_rate_bps INTEGER DEFAULT 1, -- 1 basis point = 0.01%
    protocol VARCHAR(50) NOT NULL, -- 'Aave', 'Balancer', etc
    profit_generated_usd DECIMAL(20,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled BOOLEAN DEFAULT false,
    settlement_tx_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_loan_tax_agent 
ON flash_loan_tax(executor_agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_flash_loan_tax_pending 
ON flash_loan_tax(settled, timestamp) 
WHERE settled = false;

-- =====================================================
-- 🤖 AGENT SUBSCRIPTION TIERS (Free, Pro, Whale)
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL REFERENCES gxeon_users(id),
    tier VARCHAR(20) NOT NULL, -- 'free', 'pro', 'whale'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    monthly_price_usd DECIMAL(10,2),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    payment_tx_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_subscriptions_active 
ON agent_subscriptions(agent_id) 
WHERE status = 'active';

-- =====================================================
-- ⚡ FUNCTION: Reset Daily Call Counts (Runs at midnight)
-- =====================================================

CREATE OR REPLACE FUNCTION reset_daily_m2m_limits()
RETURNS void AS $$
BEGIN
    UPDATE gxeon_users 
    SET daily_calls_count = 0,
        last_call_reset = NOW()
    WHERE tier = 'free' 
      AND last_call_reset < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 💸 FUNCTION: Apply Flash Loan Tax
-- =====================================================

CREATE OR REPLACE FUNCTION apply_flash_loan_tax(
    p_executor_agent_id VARCHAR,
    p_loan_amount_usd DECIMAL,
    p_protocol VARCHAR,
    p_tx_hash VARCHAR
)
RETURNS TABLE(tax_amount DECIMAL, success BOOLEAN) AS $$
DECLARE
    tax_bps INTEGER := 1; -- 0.01%
    calculated_tax DECIMAL;
BEGIN
    calculated_tax := (p_loan_amount_usd * tax_bps) / 10000;
    
    INSERT INTO flash_loan_tax (
        tx_hash,
        executor_agent_id,
        loan_amount_usd,
        tax_amount_usd,
        tax_rate_bps,
        protocol,
        timestamp
    ) VALUES (
        p_tx_hash,
        p_executor_agent_id,
        p_loan_amount_usd,
        calculated_tax,
        tax_bps,
        p_protocol,
        NOW()
    )
    ON CONFLICT (tx_hash) DO NOTHING;
    
    RETURN QUERY SELECT calculated_tax, true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 📈 FUNCTION: Get M2M Revenue Report
-- =====================================================

CREATE OR REPLACE FUNCTION get_m2m_revenue_report(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    total_api_calls BIGINT,
    total_credits_deducted DECIMAL,
    total_flash_loan_tax DECIMAL,
    total_subscription_revenue DECIMAL,
    active_agents BIGINT,
    avg_response_time_ms DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_api_calls,
        COALESCE(SUM(credits_deducted), 0)::DECIMAL as total_credits_deducted,
        COALESCE((
            SELECT SUM(tax_amount_usd) 
            FROM flash_loan_tax 
            WHERE timestamp > NOW() - (p_hours || ' hours')::INTERVAL
              AND settled = true
        ), 0)::DECIMAL as total_flash_loan_tax,
        COALESCE((
            SELECT SUM(monthly_price_usd) / 30 / 24 * p_hours
            FROM agent_subscriptions 
            WHERE status = 'active'
        ), 0)::DECIMAL as total_subscription_revenue,
        COUNT(DISTINCT agent_id)::BIGINT as active_agents,
        COALESCE(AVG(request_time_ms), 0)::DECIMAL as avg_response_time_ms
    FROM m2m_analytics
    WHERE timestamp > NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 🎫 FUNCTION: Upgrade Agent Tier
-- =====================================================

CREATE OR REPLACE FUNCTION upgrade_agent_tier(
    p_api_key VARCHAR,
    p_new_tier VARCHAR,
    p_payment_tx_hash VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_current_tier VARCHAR;
    v_tier_prices DECIMAL[] := ARRAY[0, 50, 500]; -- free, pro, whale
BEGIN
    -- Get user
    SELECT id, tier INTO v_user_id, v_current_tier
    FROM gxeon_users
    WHERE api_key = p_api_key;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update tier
    UPDATE gxeon_users 
    SET tier = p_new_tier,
        daily_calls_count = 0,
        last_call_reset = NOW()
    WHERE id = v_user_id;
    
    -- Record subscription
    INSERT INTO agent_subscriptions (
        agent_id,
        tier,
        monthly_price_usd,
        expires_at,
        payment_tx_hash
    ) VALUES (
        v_user_id::TEXT,
        p_new_tier,
        CASE p_new_tier
            WHEN 'free' THEN 0
            WHEN 'pro' THEN 50
            WHEN 'whale' THEN 500
            ELSE 0
        END,
        NOW() + INTERVAL '30 days',
        p_payment_tx_hash
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 🔒 Enable RLS on M2M tables
-- =====================================================

ALTER TABLE m2m_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE m2m_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_loan_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role can access all
CREATE POLICY m2m_service_policy ON m2m_analytics FOR ALL TO service_role USING (true);
CREATE POLICY m2m_log_service_policy ON m2m_request_log FOR ALL TO service_role USING (true);
CREATE POLICY flash_loan_service_policy ON flash_loan_tax FOR ALL TO service_role USING (true);
CREATE POLICY subscription_service_policy ON agent_subscriptions FOR ALL TO service_role USING (true);

-- =====================================================
-- 🚀 GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON m2m_analytics TO anon, authenticated, service_role;
GRANT ALL ON m2m_request_log TO anon, authenticated, service_role;
GRANT ALL ON flash_loan_tax TO anon, authenticated, service_role;
GRANT ALL ON agent_subscriptions TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_m2m_limits() TO service_role;
GRANT EXECUTE ON FUNCTION apply_flash_loan_tax(VARCHAR, DECIMAL, VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION get_m2m_revenue_report(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION upgrade_agent_tier(VARCHAR, VARCHAR, VARCHAR) TO service_role;

-- =====================================================
-- ✅ PANDORA PROTOCOL ACTIVATION COMPLETE
-- =====================================================

SELECT '🌑 PANDORA PROTOCOL v2.2 — M2M Infrastructure Active' as status;
