-- GXEON Reward Engine Migration
-- Adds reward tracking tables and columns

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
