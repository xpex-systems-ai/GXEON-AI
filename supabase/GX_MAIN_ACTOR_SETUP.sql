-- ═══════════════════════════════════════════════════════════════════════════
-- GX MAIN ACTOR SETUP — Production Actor Configuration
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove constraint if exists (to allow any actor_type values)
ALTER TABLE actors DROP CONSTRAINT IF EXISTS actors_actor_type_check;

-- Create GX_MAIN_ACTOR if not exists
INSERT INTO actors (
    id,
    actor_code,
    actor_type,
    name,
    status,
    commission_rate,
    created_at
)
VALUES (
    gen_random_uuid(),
    'GX_MAIN_ACTOR',
    'SYSTEM',
    'GXEON Main System Actor',
    'active',
    0.10,  -- 10% commission
    NOW()
)
ON CONFLICT (actor_code) DO UPDATE SET
    status = 'active',
    commission_rate = 0.10;

-- Create wallet for GX_MAIN_ACTOR if not exists
INSERT INTO actor_wallets (
    id,
    actor_code,
    balance,
    pending_balance,
    total_earned,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'GX_MAIN_ACTOR',
    0,
    0,
    0,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM actor_wallets WHERE actor_code = 'GX_MAIN_ACTOR'
);

-- Verify setup
SELECT 'ACTOR CREATED/UPDATED' as check_item, actor_code, name, status, commission_rate
FROM actors WHERE actor_code = 'GX_MAIN_ACTOR';

SELECT 'WALLET STATUS' as check_item, actor_code, balance, total_earned
FROM actor_wallets WHERE actor_code = 'GX_MAIN_ACTOR';
