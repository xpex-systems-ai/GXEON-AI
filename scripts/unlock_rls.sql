-- ============================================================================
-- GXEON: UNLOCK PUBLIC READ ACCESS
-- Execute this in Supabase SQL Editor to allow Vercel to read data
-- ============================================================================

-- 1. Enable RLS on the table (if not already enabled)
ALTER TABLE public.keeper_rewards ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing anon policy if it exists (prevents conflicts)
DROP POLICY IF EXISTS "Allow anon read on keeper_rewards" ON public.keeper_rewards;

-- 3. Create new policy allowing public/anonymous SELECT access
-- This allows the Vercel frontend to read data without authentication
CREATE POLICY "Allow anon read on keeper_rewards" 
    ON public.keeper_rewards 
    FOR SELECT 
    TO anon 
    USING (true);

-- 4. Also ensure authenticated users can read (for future use)
DROP POLICY IF EXISTS "Allow authenticated read on keeper_rewards" ON public.keeper_rewards;

CREATE POLICY "Allow authenticated read on keeper_rewards" 
    ON public.keeper_rewards 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- 5. Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'keeper_rewards';

-- ============================================================================
-- INSTRUCTIONS FOR SENA:
-- 1. Copy ALL the text above (from line 1 to here)
-- 2. Go to https://supabase.com/dashboard/project/uzqabkixgbbqwcjfvnma
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New query"
-- 5. Paste the entire SQL code
-- 6. Click "RUN"
-- 7. Wait for the green checkmark ✅
-- 8. Refresh your Vercel dashboard - data should appear!
-- ============================================================================
