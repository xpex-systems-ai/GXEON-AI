-- Radar Shix Schema - Lead tracking and market saturation

-- Table: Radar Leads (deduplication tracking)
CREATE TABLE IF NOT EXISTS radar_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_handle TEXT NOT NULL,
    tweet_id TEXT,
    task_id UUID REFERENCES tasks(id),
    score NUMERIC,
    processed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_handle, tweet_id)
);

-- Table: Radar Scan Logs (metrics tracking)
CREATE TABLE IF NOT EXISTS radar_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords TEXT[] DEFAULT '{}',
    leads_found INTEGER DEFAULT 0,
    leads_injected INTEGER DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    scanned_at TIMESTAMP DEFAULT NOW()
);

-- Index for deduplication lookups
CREATE INDEX IF NOT EXISTS idx_radar_leads_handle ON radar_leads(user_handle);
CREATE INDEX IF NOT EXISTS idx_radar_leads_tweet ON radar_leads(tweet_id);
CREATE INDEX IF NOT EXISTS idx_radar_scan_logs_time ON radar_scan_logs(scanned_at);

-- Function: Get radar performance stats
CREATE OR REPLACE FUNCTION get_radar_stats(p_hours INT DEFAULT 24)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'scans_count', COUNT(*),
        'total_leads_found', SUM(leads_found),
        'total_leads_injected', SUM(leads_injected),
        'total_cost', SUM(total_cost),
        'avg_leads_per_scan', CASE WHEN COUNT(*) > 0 THEN AVG(leads_found) ELSE 0 END
    )
    INTO v_result
    FROM radar_scan_logs
    WHERE scanned_at > NOW() - (p_hours || ' hours')::INTERVAL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add radar tracking columns to tasks table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'source') THEN
        ALTER TABLE tasks ADD COLUMN source TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'cost') THEN
        ALTER TABLE tasks ADD COLUMN cost NUMERIC DEFAULT 0;
    END IF;
END $$;
