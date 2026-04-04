-- GXEON Payment Engine Migration
-- Adds payment tracking columns to rewards table

ALTER TABLE rewards ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
