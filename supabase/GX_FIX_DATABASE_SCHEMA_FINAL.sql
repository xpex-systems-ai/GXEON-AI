-- ═══════════════════════════════════════════════════════════════════════════
-- GX FIX DATABASE SCHEMA FINAL
-- Align database schema with backend expectations for actor monetization
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: ALTER actors TABLE - Add Missing Columns
-- ═══════════════════════════════════════════════════════════════════════════

-- Add commission_rate column (default 10% = 0.1)
ALTER TABLE actors 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.1;

COMMENT ON COLUMN actors.commission_rate IS 'Commission percentage (e.g., 0.1 = 10%)';

-- Add status column (default 'ACTIVE')
ALTER TABLE actors 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

COMMENT ON COLUMN actors.status IS 'Actor status: active, inactive, suspended';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: ALTER actor_wallets TABLE - Add Missing Columns  
-- ═══════════════════════════════════════════════════════════════════════════

-- Add pending_balance column (default 0)
ALTER TABLE actor_wallets 
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0;

COMMENT ON COLUMN actor_wallets.pending_balance IS 'Pending commission not yet confirmed';

-- Add total_earned column (default 0) - cumulative lifetime earnings
ALTER TABLE actor_wallets 
ADD COLUMN IF NOT EXISTS total_earned NUMERIC DEFAULT 0;

COMMENT ON COLUMN actor_wallets.total_earned IS 'Total lifetime earnings (cumulative)';

-- Add updated_at timestamp (default NOW())
ALTER TABLE actor_wallets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN actor_wallets.updated_at IS 'Last wallet update timestamp';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Create Update Trigger for actor_wallets.updated_at
-- ═══════════════════════════════════════════════════════════════════════════

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_actor_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_actor_wallet_updated_at'
    ) THEN
        CREATE TRIGGER trg_actor_wallet_updated_at
        BEFORE UPDATE ON actor_wallets
        FOR EACH ROW
        EXECUTE FUNCTION update_actor_wallet_timestamp();
        
        RAISE NOTICE '✅ Created trigger: trg_actor_wallet_updated_at';
    ELSE
        RAISE NOTICE 'ℹ️  Trigger already exists: trg_actor_wallet_updated_at';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: VALIDATION - Check All Columns
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_all_ok BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 SCHEMA VALIDATION AFTER ALTERATIONS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    
    -- Check actors table columns
    RAISE NOTICE '';
    RAISE NOTICE '--- actors table ---';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'actors' 
        AND column_name = 'commission_rate'
    ) INTO v_column_exists;
    RAISE NOTICE 'commission_rate: %', CASE WHEN v_column_exists THEN '✅' ELSE '❌' END;
    v_all_ok := v_all_ok AND v_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'actors' 
        AND column_name = 'status'
    ) INTO v_column_exists;
    RAISE NOTICE 'status: %', CASE WHEN v_column_exists THEN '✅' ELSE '❌' END;
    v_all_ok := v_all_ok AND v_column_exists;
    
    -- Check actor_wallets table columns
    RAISE NOTICE '';
    RAISE NOTICE '--- actor_wallets table ---';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'actor_wallets' 
        AND column_name = 'pending_balance'
    ) INTO v_column_exists;
    RAISE NOTICE 'pending_balance: %', CASE WHEN v_column_exists THEN '✅' ELSE '❌' END;
    v_all_ok := v_all_ok AND v_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'actor_wallets' 
        AND column_name = 'total_earned'
    ) INTO v_column_exists;
    RAISE NOTICE 'total_earned: %', CASE WHEN v_column_exists THEN '✅' ELSE '❌' END;
    v_all_ok := v_all_ok AND v_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'actor_wallets' 
        AND column_name = 'updated_at'
    ) INTO v_column_exists;
    RAISE NOTICE 'updated_at: %', CASE WHEN v_column_exists THEN '✅' ELSE '❌' END;
    v_all_ok := v_all_ok AND v_column_exists;
    
    -- Final result
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    IF v_all_ok THEN
        RAISE NOTICE '✅ SCHEMA ALIGNED - All columns present';
        RAISE NOTICE '🚀 Ready for tracking: YES';
        RAISE NOTICE '💰 Ready for monetization: YES';
    ELSE
        RAISE NOTICE '❌ SCHEMA INCOMPLETE - Some columns missing';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: DISPLAY CURRENT SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════

-- Show actors table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'actors'
ORDER BY ordinal_position;

-- Show actor_wallets table schema  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'actor_wallets'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Test Data Integrity (Optional - run if tables have data)
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if any actors need commission_rate backfilled
-- UPDATE actors 
-- SET commission_rate = 0.1 
-- WHERE commission_rate IS NULL;

-- Check if any wallets need defaults
-- UPDATE actor_wallets 
-- SET pending_balance = 0, total_earned = 0 
-- WHERE pending_balance IS NULL OR total_earned IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'GX FIX DATABASE SCHEMA COMPLETE' as status, NOW() as executed_at;
