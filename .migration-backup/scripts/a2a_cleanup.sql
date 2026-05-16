-- ═══════════════════════════════════════════════════════════════════════════
-- 🧹 A2A TEST DATA CLEANUP
-- Run this to reset test state before validation
-- ═══════════════════════════════════════════════════════════════════════════

-- Clean API usage logs for test actors
DELETE FROM api_usage_logs 
WHERE actor_id IN (
  SELECT id FROM actors 
  WHERE email ILIKE '%test%@gxeon.ai' 
  OR email ILIKE '%validation%@gxeon.ai'
);

-- Clean commissions for test actors
DELETE FROM commissions 
WHERE actor_id IN (
  SELECT id FROM actors 
  WHERE email ILIKE '%test%@gxeon.ai' 
  OR email ILIKE '%validation%@gxeon.ai'
);

-- Clean test transactions
DELETE FROM transactions 
WHERE actor_code IN (
  SELECT code FROM actors 
  WHERE email ILIKE '%test%@gxeon.ai' 
  OR email ILIKE '%validation%@gxeon.ai'
);

-- Clean actor wallets
DELETE FROM actor_wallets 
WHERE actor_id IN (
  SELECT id FROM actors 
  WHERE email ILIKE '%test%@gxeon.ai' 
  OR email ILIKE '%validation%@gxeon.ai'
);

-- Clean test actors
DELETE FROM actors 
WHERE email ILIKE '%test%@gxeon.ai' 
OR email ILIKE '%validation%@gxeon.ai';

-- Verify cleanup
SELECT 'Remaining test actors' as check_type, COUNT(*) as count 
FROM actors 
WHERE email ILIKE '%test%@gxeon.ai';

SELECT 'Remaining test transactions' as check_type, COUNT(*) as count 
FROM transactions 
WHERE external_reference LIKE 'REG-%';
