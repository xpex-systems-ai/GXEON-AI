-- GXEON Execution Agent Migration
-- Adds required columns for execution agent functionality

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS task_id UUID;
