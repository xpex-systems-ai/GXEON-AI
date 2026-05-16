-- Plugin System Schema
-- Tables and functions for tier-based plugin management

-- Table: Agent Plugins (Marketplace)
CREATE TABLE IF NOT EXISTS agent_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT DEFAULT 'general',
    required_tier TEXT NOT NULL DEFAULT 'basic', -- free, basic, pro, enterprise
    execution_cost NUMERIC DEFAULT 0.002, -- Cost per execution in USD
    file_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: Plugin Access Logs
CREATE TABLE IF NOT EXISTS plugin_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plugin_name TEXT NOT NULL,
    action TEXT NOT NULL, -- loaded, denied, error
    billing_tx_id UUID REFERENCES billing_transactions(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: Plugin Execution Logs
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plugin_name TEXT NOT NULL,
    status TEXT NOT NULL, -- success, failed
    billing_tx_id UUID REFERENCES billing_transactions(id),
    result_summary TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plugins_name ON agent_plugins(name);
CREATE INDEX IF NOT EXISTS idx_plugins_tier ON agent_plugins(required_tier);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_user ON plugin_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_plugin ON plugin_execution_logs(plugin_name);
CREATE INDEX IF NOT EXISTS idx_plugin_access_user ON plugin_access_logs(user_id);

-- Function: Get user plugin statistics
CREATE OR REPLACE FUNCTION get_user_plugin_stats(p_user_id UUID, p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_executions', COUNT(*),
        'successful_executions', COUNT(*) FILTER (WHERE status = 'success'),
        'failed_executions', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_cost', COALESCE(SUM(bt.amount) FILTER (WHERE status = 'success'), 0),
        'unique_plugins', COUNT(DISTINCT plugin_name),
        'most_used_plugin', (
            SELECT plugin_name 
            FROM plugin_execution_logs 
            WHERE user_id = p_user_id 
                AND executed_at > NOW() - (p_days || ' days')::INTERVAL
            GROUP BY plugin_name 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        )
    )
    INTO v_result
    FROM plugin_execution_logs pel
    LEFT JOIN billing_transactions bt ON pel.billing_tx_id = bt.id
    WHERE pel.user_id = p_user_id
        AND pel.executed_at > NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get plugin usage stats (admin)
CREATE OR REPLACE FUNCTION get_plugin_stats(p_plugin_name TEXT, p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'plugin_name', p_plugin_name,
        'total_executions', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'revenue', COALESCE(SUM(bt.amount) FILTER (WHERE status = 'success'), 0),
        'success_rate', CASE WHEN COUNT(*) > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*))
            ELSE 0 
        END
    )
    INTO v_result
    FROM plugin_execution_logs pel
    LEFT JOIN billing_transactions bt ON pel.billing_tx_id = bt.id
    WHERE pel.plugin_name = p_plugin_name
        AND pel.executed_at > NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add tier column to users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'tier') THEN
        ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'rate_limit_override') THEN
        ALTER TABLE users ADD COLUMN rate_limit_override BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert sample plugins
INSERT INTO agent_plugins (name, description, category, required_tier, execution_cost, file_path, is_active)
VALUES 
    ('aleti_marketing', 'Automated marketing outreach with personalized messaging', 'marketing', 'pro', 0.005, 'aleti_marketing.js', true),
    ('twitter_analyzer', 'Analyze Twitter profiles for engagement metrics', 'analytics', 'basic', 0.002, 'twitter_analyzer.js', true),
    ('web_scraper', 'Advanced web scraping with JavaScript execution', 'data', 'basic', 0.003, 'web_scraper.js', true),
    ('smart_contract_deployer', 'Deploy and verify smart contracts on-chain', 'blockchain', 'enterprise', 0.015, 'smart_contract_deployer.js', true),
    ('report_generator', 'Generate comprehensive PDF reports from data', 'productivity', 'basic', 0.002, 'report_generator.js', true)
ON CONFLICT (name) DO NOTHING;
