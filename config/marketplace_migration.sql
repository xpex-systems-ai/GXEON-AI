-- GXEON Marketplace Migration
-- Creates marketplace for external tasks

CREATE TABLE IF NOT EXISTS task_marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  reward NUMERIC,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS marketplace_id UUID;
