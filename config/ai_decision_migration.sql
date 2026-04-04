-- GXEON AI Decision Engine Migration
-- Adds priority scoring for AI-driven task selection

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_score NUMERIC;
