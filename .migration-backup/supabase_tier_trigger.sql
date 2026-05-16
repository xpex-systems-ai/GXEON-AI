-- 🌑 GXEON SOVEREIGN — Tier Purchase Trigger & Revenue Bridge
-- Financial Flow: PRO/ENT tier purchase → Convert to stablecoin in Vault

-- ============================================
-- 1. TIER PURCHASES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gxeon_tier_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES gxeon_users(id),
    tier_name TEXT NOT NULL CHECK (tier_name IN ('free', 'pro', 'enterprise')),
    price_usd DECIMAL(10, 2) NOT NULL,
    credits_received INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'crypto', -- crypto, stripe, etc
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    vault_conversion_status TEXT DEFAULT 'pending' CHECK (vault_conversion_status IN ('pending', 'converted', 'failed')),
    vault_tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gxeon_tier_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own purchases
CREATE POLICY "Users view own tier purchases" 
    ON gxeon_tier_purchases 
    FOR SELECT 
    USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- ============================================
-- 2. TIER PURCHASE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION purchase_tier(
    p_user_id UUID,
    p_tier_name TEXT,
    p_payment_method TEXT DEFAULT 'crypto'
)
RETURNS JSONB AS $$
DECLARE
    v_tier RECORD;
    v_purchase_id UUID;
BEGIN
    -- Define tier configurations
    SELECT * INTO v_tier FROM (VALUES
        ('free', 0, 100),
        ('pro', 29.99, 1000),
        ('enterprise', 199.99, 10000)
    ) AS t(name, price, credits)
    WHERE name = p_tier_name;
    
    IF v_tier IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
    END IF;
    
    -- Insert purchase record
    INSERT INTO gxeon_tier_purchases (
        user_id, tier_name, price_usd, credits_received, payment_method, status
    ) VALUES (
        p_user_id, p_tier_name, v_tier.price, v_tier.credits, p_payment_method, 'pending'
    ) RETURNING id INTO v_purchase_id;
    
    -- Add credits to user
    UPDATE gxeon_users 
    SET credits = credits + v_tier.credits 
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'tier', p_tier_name,
        'credits_added', v_tier.credits,
        'amount_usd', v_tier.price,
        'status', 'pending_vault_conversion'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. TRIGGER: AUTO-CONVERT TIER REVENUE TO VAULT
-- ============================================

CREATE OR REPLACE FUNCTION trigger_vault_conversion()
RETURNS TRIGGER AS $$
DECLARE
    v_vault_balance NUMERIC;
    v_gas_cost_estimate NUMERIC := 0.50; -- Estimated gas in USD
BEGIN
    -- Only process completed purchases with pending vault conversion
    IF NEW.status = 'completed' AND NEW.vault_conversion_status = 'pending' THEN
        -- Check if amount is worth converting (gas optimization)
        IF NEW.price_usd > (v_gas_cost_estimate * 5) THEN
            -- Mark for conversion (actual conversion happens off-chain via keeper)
            UPDATE gxeon_tier_purchases 
            SET vault_conversion_status = 'converted',
                vault_tx_hash = 'pending_' || NEW.id::TEXT,
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Log the conversion trigger
            INSERT INTO gxeon_system_logs (level, module, message, metadata)
            VALUES (
                'info',
                'VAULT_BRIDGE',
                'Tier purchase ready for vault conversion',
                jsonb_build_object(
                    'purchase_id', NEW.id,
                    'amount_usd', NEW.price_usd,
                    'tier', NEW.tier_name,
                    'triggered_at', NOW()
                )
            );
        ELSE
            -- Below gas threshold - accumulate for batch conversion
            UPDATE gxeon_tier_purchases 
            SET vault_conversion_status = 'pending',
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS tier_purchase_vault_trigger ON gxeon_tier_purchases;

-- Create trigger
CREATE TRIGGER tier_purchase_vault_trigger
    AFTER UPDATE OF status ON gxeon_tier_purchases
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_vault_conversion();

-- ============================================
-- 4. VIEW: PENDING VAULT CONVERSIONS
-- ============================================

CREATE OR REPLACE VIEW v_pending_vault_conversions AS
SELECT 
    id,
    user_id,
    tier_name,
    price_usd,
    credits_received,
    created_at,
    SUM(price_usd) OVER (ORDER BY created_at) as accumulated_usd
FROM gxeon_tier_purchases
WHERE vault_conversion_status = 'pending'
  AND status = 'completed'
  AND price_usd > 0;

-- ============================================
-- 5. FUNCTION: GET CONVERSION BATCH
-- ============================================

CREATE OR REPLACE FUNCTION get_vault_conversion_batch(min_amount_usd NUMERIC DEFAULT 25.00)
RETURNS JSONB AS $$
DECLARE
    v_batch_total NUMERIC;
    v_batch_count INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(price_usd), 0),
        COUNT(*)
    INTO v_batch_total, v_batch_count
    FROM gxeon_tier_purchases
    WHERE vault_conversion_status = 'pending'
      AND status = 'completed'
      AND price_usd > 0;
    
    IF v_batch_total >= min_amount_usd THEN
        RETURN jsonb_build_object(
            'ready', true,
            'total_usd', v_batch_total,
            'purchase_count', v_batch_count,
            'purchases', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', id,
                    'tier', tier_name,
                    'amount', price_usd
                ))
                FROM gxeon_tier_purchases
                WHERE vault_conversion_status = 'pending'
                  AND status = 'completed'
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'ready', false,
            'total_usd', v_batch_total,
            'purchase_count', v_batch_count,
            'threshold', min_amount_usd,
            'remaining', min_amount_usd - v_batch_total
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON gxeon_tier_purchases TO authenticated;
GRANT SELECT ON v_pending_vault_conversions TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_tier TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_conversion_batch TO service_role;

-- ============================================
-- 7. SYSTEM LOG TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS gxeon_system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    module TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_module ON gxeon_system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON gxeon_system_logs(created_at DESC);

-- Enable RLS on logs
ALTER TABLE gxeon_system_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can see all logs
CREATE POLICY "Service role full access" 
    ON gxeon_system_logs 
    FOR ALL 
    USING (auth.role() = 'service_role');

-- ============================================
-- ✅ FINANCIAL FLOW ACTIVATED
-- ============================================
-- PRO/ENT tier purchase → Credits added → Vault conversion trigger
-- Manual claim enabled: Commander clicks "CLAIM PROFIT" on Dashboard
-- Auto-distribute: FALSE (commander controls when to claim)
-- Gas optimization: Only converts when batch > 5x gas cost
-- ============================================

COMMENT ON TABLE gxeon_tier_purchases IS 'Tier purchases with vault bridge for revenue conversion';
COMMENT ON FUNCTION trigger_vault_conversion IS 'Converts tier revenue to vault when gas-optimized';
