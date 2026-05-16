-- ═══════════════════════════════════════════════════════════════════════════
-- GX PRODUCTION READY CHECK — SQL Direct Validation
-- Run this in Supabase SQL Editor for accurate results
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Check Table Existence
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_count INTEGER;
    v_all_ok BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 GX PRODUCTION READY CHECK';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 1: Table Existence';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────────';
    
    -- Check actors
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'actors';
    IF v_count > 0 THEN
        RAISE NOTICE '✅ actors table exists';
    ELSE
        RAISE NOTICE '❌ actors table MISSING';
        v_all_ok := FALSE;
    END IF;
    
    -- Check actor_wallets
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'actor_wallets';
    IF v_count > 0 THEN
        RAISE NOTICE '✅ actor_wallets table exists';
    ELSE
        RAISE NOTICE '❌ actor_wallets table MISSING';
        v_all_ok := FALSE;
    END IF;
    
    -- Check actor_payouts
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'actor_payouts';
    IF v_count > 0 THEN
        RAISE NOTICE '✅ actor_payouts table exists';
    ELSE
        RAISE NOTICE '❌ actor_payouts table MISSING';
        v_all_ok := FALSE;
    END IF;
    
    -- Check global_transactions
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'global_transactions';
    IF v_count > 0 THEN
        RAISE NOTICE '✅ global_transactions table exists';
    ELSE
        RAISE NOTICE '❌ global_transactions table MISSING';
        v_all_ok := FALSE;
    END IF;
    
    -- Check pix_payments
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pix_payments';
    IF v_count > 0 THEN
        RAISE NOTICE '✅ pix_payments table exists';
    ELSE
        RAISE NOTICE '❌ pix_payments table MISSING';
        v_all_ok := FALSE;
    END IF;
    
    -- Store result for later
    IF v_all_ok THEN
        PERFORM set_config('app.tables_ok', 'true', true);
    ELSE
        PERFORM set_config('app.tables_ok', 'false', true);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Check Column Existence (only if tables exist)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 2: Column Verification';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────────';
    
    -- Check actors columns
    RAISE NOTICE 'actors table:';
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actors' AND column_name = 'commission_rate';
    RAISE NOTICE '  commission_rate: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actors' AND column_name = 'status';
    RAISE NOTICE '  status: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actors' AND column_name = 'actor_type';
    RAISE NOTICE '  actor_type: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
    
    -- Check actor_wallets columns
    RAISE NOTICE 'actor_wallets table:';
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actor_wallets' AND column_name = 'pending_balance';
    RAISE NOTICE '  pending_balance: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actor_wallets' AND column_name = 'total_earned';
    RAISE NOTICE '  total_earned: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'actor_wallets' AND column_name = 'updated_at';
    RAISE NOTICE '  updated_at: %', CASE WHEN v_count > 0 THEN '✅' ELSE '❌' END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Check GX_MAIN_ACTOR
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_actor RECORD;
    v_wallet RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 3: GX_MAIN_ACTOR Verification';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────────';
    
    SELECT * INTO v_actor FROM actors WHERE actor_code = 'GX_MAIN_ACTOR';
    
    IF FOUND THEN
        RAISE NOTICE '✅ GX_MAIN_ACTOR exists';
        RAISE NOTICE '  Name: %', v_actor.name;
        RAISE NOTICE '  Type: %', v_actor.actor_type;
        RAISE NOTICE '  Status: %', v_actor.status;
        RAISE NOTICE '  Commission: %', v_actor.commission_rate * 100 || '%';
        
        -- Check wallet
        SELECT * INTO v_wallet FROM actor_wallets WHERE actor_code = 'GX_MAIN_ACTOR';
        IF FOUND THEN
            RAISE NOTICE '✅ Wallet exists for GX_MAIN_ACTOR';
            RAISE NOTICE '  Balance: R$ %', v_wallet.balance;
            RAISE NOTICE '  Total Earned: R$ %', v_wallet.total_earned;
        ELSE
            RAISE NOTICE '⚠️  Wallet NOT found for GX_MAIN_ACTOR';
        END IF;
    ELSE
        RAISE NOTICE '❌ GX_MAIN_ACTOR not found - creating...';
        
        INSERT INTO actors (actor_code, actor_type, name, status, commission_rate)
        VALUES ('GX_MAIN_ACTOR', 'SYSTEM', 'GXEON Main System Actor', 'active', 0.10);
        
        INSERT INTO actor_wallets (actor_code, balance, pending_balance, total_earned)
        VALUES ('GX_MAIN_ACTOR', 0, 0, 0);
        
        RAISE NOTICE '✅ GX_MAIN_ACTOR created with wallet';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Check Data Integrity
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 4: Data Integrity Check';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────────';
    
    -- Count transactions without actor_code
    SELECT COUNT(*) INTO v_count FROM global_transactions WHERE actor_code IS NULL;
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️  % transactions without actor_code', v_count;
    ELSE
        RAISE NOTICE '✅ All transactions have actor_code';
    END IF;
    
    -- Count orphan actors
    SELECT COUNT(*) INTO v_count 
    FROM actors a
    WHERE NOT EXISTS (SELECT 1 FROM actor_wallets w WHERE w.actor_code = a.actor_code);
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️  % actors without wallets', v_count;
    ELSE
        RAISE NOTICE '✅ All actors have wallets';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Final Summary
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 PRODUCTION READINESS SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;

-- Show summary table
SELECT 
    'actors' as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'actors') as exists,
    (SELECT COUNT(*) FROM actors) as record_count
UNION ALL
SELECT 
    'actor_wallets',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'actor_wallets'),
    (SELECT COUNT(*) FROM actor_wallets)
UNION ALL
SELECT 
    'global_transactions',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_transactions'),
    (SELECT COUNT(*) FROM global_transactions)
UNION ALL
SELECT 
    'pix_payments',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pix_payments'),
    (SELECT COUNT(*) FROM pix_payments);

-- Show GX_MAIN_ACTOR status
SELECT 
    'GX_MAIN_ACTOR' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM actors WHERE actor_code = 'GX_MAIN_ACTOR') 
         THEN '✅ READY' 
         ELSE '❌ MISSING' 
    END as status;
