-- ============================================================================
-- SQL: Create keeper_rewards table for Keeper/Bounty profit model
-- Execute in Supabase SQL Editor to prepare for automated profit logging
-- ============================================================================

-- Create the keeper_rewards table
CREATE TABLE IF NOT EXISTS public.keeper_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id TEXT NOT NULL,
    protocol TEXT NOT NULL,
    amount NUMERIC(78, 18) NOT NULL DEFAULT 0,
    token_symbol TEXT NOT NULL DEFAULT 'ETH',
    gas_spent NUMERIC(78, 18) NOT NULL DEFAULT 0,
    net_profit NUMERIC(78, 18) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_task_id ON public.keeper_rewards(task_id);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_protocol ON public.keeper_rewards(protocol);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_status ON public.keeper_rewards(status);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_executed_at ON public.keeper_rewards(executed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.keeper_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service_role to insert (backend agent)
CREATE POLICY IF NOT EXISTS "Allow service_role insert on keeper_rewards"
    ON public.keeper_rewards
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Allow service_role to update (backend agent)
CREATE POLICY IF NOT EXISTS "Allow service_role update on keeper_rewards"
    ON public.keeper_rewards
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to read their own records
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow anon users to read (for public dashboards)
CREATE POLICY IF NOT EXISTS "Allow anon users to read keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO anon
    USING (true);

-- Enable Realtime for keeper_rewards table
BEGIN;
  -- Add table to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.keeper_rewards;
COMMIT;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_keeper_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to table
DROP TRIGGER IF EXISTS update_keeper_rewards_updated_at ON public.keeper_rewards;
CREATE TRIGGER update_keeper_rewards_updated_at
    BEFORE UPDATE ON public.keeper_rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_keeper_rewards_updated_at();

-- Comment on table for documentation
COMMENT ON TABLE public.keeper_rewards IS 'Records of automated keeper/bounty profits from MEV and liquidation tasks';

-- Grant permissions to service_role (bypass RLS for backend agent)
GRANT ALL ON public.keeper_rewards TO service_role;
GRANT USAGE ON SEQUENCE public.keeper_rewards_id_seq TO service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION: Check if table was created successfully
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
