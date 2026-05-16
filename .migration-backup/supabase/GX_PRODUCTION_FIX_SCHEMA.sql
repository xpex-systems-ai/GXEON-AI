-- ═══════════════════════════════════════════════════════════════════════════
-- GX PRODUCTION FIX SCHEMA v2.0
-- Fixes all critical issues from audit
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. API KEYS TABLE — Connected to Database
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    key_value TEXT UNIQUE NOT NULL,
    tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
    actor_code TEXT REFERENCES actors(actor_code),
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'expired', 'revoked')),
    rate_limit INTEGER DEFAULT 100,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    activated_at TIMESTAMP,
    last_used_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

COMMENT ON TABLE api_keys IS 'API keys for marketplace access — validated against database';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. MARKETPLACE DATASETS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketplace_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    data_source TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    row_count INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample datasets
INSERT INTO marketplace_datasets (name, description, category, price, data_source, status)
VALUES 
    ('Crypto Whale Transactions', 'Real-time large transactions across major chains', 'blockchain', 49.90, 'on-chain', 'active'),
    ('DEX Liquidity Pools', 'New pool creation and liquidity changes', 'defi', 29.90, 'dexscreener', 'active'),
    ('Social Sentiment Feed', 'Twitter/X sentiment analysis for crypto', 'social', 19.90, 'twitter', 'active'),
    ('Mempool Alerts', 'Pending transactions on Ethereum', 'mempool', 39.90, 'alchemy', 'active')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE marketplace_datasets IS 'Available datasets in the marketplace';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. DATASET PURCHASES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dataset_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    dataset_id UUID REFERENCES marketplace_datasets(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BRL',
    actor_code TEXT REFERENCES actors(actor_code),
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'access_granted', 'expired')),
    payment_method TEXT,
    tx_id TEXT,
    access_url TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_dataset_purchases_user ON dataset_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_purchases_status ON dataset_purchases(status);

COMMENT ON TABLE dataset_purchases IS 'Purchase records for marketplace datasets';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. REVENUE EVENTS TABLE — Revenue Tracking Layer
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BRL',
    actor_code TEXT REFERENCES actors(actor_code),
    user_id UUID,
    api_key_id UUID REFERENCES api_keys(id),
    product_type TEXT,
    product_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for revenue analytics
CREATE INDEX IF NOT EXISTS idx_revenue_events_actor ON revenue_events(actor_code);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_revenue_events_created ON revenue_events(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user ON revenue_events(user_id);

COMMENT ON TABLE revenue_events IS 'Revenue tracking layer — all billable events logged here';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. UPDATE TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to marketplace_datasets
DROP TRIGGER IF EXISTS update_marketplace_datasets_updated_at ON marketplace_datasets;
CREATE TRIGGER update_marketplace_datasets_updated_at
    BEFORE UPDATE ON marketplace_datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VERIFY SETUP
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'API KEYS TABLE' as check_item, 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') 
    THEN '✅ CREATED' ELSE '❌ MISSING' END as status;

SELECT 'MARKETPLACE DATASETS TABLE' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_datasets') 
    THEN '✅ CREATED' ELSE '❌ MISSING' END as status;

SELECT 'DATASET PURCHASES TABLE' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dataset_purchases') 
    THEN '✅ CREATED' ELSE '❌ MISSING' END as status;

SELECT 'REVENUE EVENTS TABLE' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_events') 
    THEN '✅ CREATED' ELSE '❌ MISSING' END as status;

-- Count datasets
SELECT 'DATASETS COUNT' as check_item, COUNT(*) as value FROM marketplace_datasets;

-- Show sample data
SELECT 'MARKETPLACE READY' as status, COUNT(*) as datasets_available 
FROM marketplace_datasets WHERE status = 'active';
