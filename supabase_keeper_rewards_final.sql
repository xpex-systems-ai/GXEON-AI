-- ============================================================================
-- SQL: Create keeper_rewards table for Bounty/Keeper profit tracking
-- Execute in Supabase SQL Editor
-- ============================================================================

-- Create the keeper_rewards table
CREATE TABLE IF NOT EXISTS public.keeper_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    task_id TEXT,
    protocol TEXT,
    network TEXT,
    reward_amount NUMERIC,
    reward_token TEXT,
    gas_spent_usd NUMERIC,
    net_profit_usd NUMERIC,
    tx_hash TEXT,
    status TEXT DEFAULT 'detected'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_task_id ON public.keeper_rewards(task_id);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_network ON public.keeper_rewards(network);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_status ON public.keeper_rewards(status);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_created_at ON public.keeper_rewards(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.keeper_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service_role full access (backend agent)
CREATE POLICY IF NOT EXISTS "Allow service_role all on keeper_rewards"
    ON public.keeper_rewards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to read
CREATE POLICY IF NOT EXISTS "Allow authenticated read on keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow anon users to read (for public dashboards)
CREATE POLICY IF NOT EXISTS "Allow anon read on keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO anon
    USING (true);

-- ============================================================================
-- STEP 2: Enable Realtime for keeper_rewards
-- ============================================================================

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.keeper_rewards;

-- Verify realtime is enabled
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE tablename = 'keeper_rewards';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION: Check table structure
-- ============================================================================
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'keeper_rewards' 
AND table_schema = 'public'
ORDER BY ordinal_position;
