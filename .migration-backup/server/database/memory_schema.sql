-- Memory Storage Schema
-- Table and functions for GXEON Connect SDK memory operations

-- Table: Memory Contexts (paid data storage)
CREATE TABLE IF NOT EXISTS memory_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    data JSONB,
    size_bytes INTEGER DEFAULT 0,
    stored_at TIMESTAMP DEFAULT NOW(),
    billing_tx_id UUID REFERENCES billing_transactions(id),
    UNIQUE(context_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_memory_contexts_id ON memory_contexts(context_id);
CREATE INDEX IF NOT EXISTS idx_memory_contexts_user ON memory_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_contexts_time ON memory_contexts(stored_at);

-- Function: Get total storage used by user
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total_mb NUMERIC;
BEGIN
    SELECT COALESCE(SUM(size_bytes) / (1024.0 * 1024.0), 0)
    INTO v_total_mb
    FROM memory_contexts
    WHERE user_id = p_user_id;
    
    RETURN v_total_mb;
END;
$$ LANGUAGE plpgsql;

-- Function: Get memory usage statistics
CREATE OR REPLACE FUNCTION get_memory_stats(p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_contexts', COUNT(*),
        'total_storage_mb', COALESCE(SUM(size_bytes) / (1024.0 * 1024.0), 0),
        'total_revenue', COALESCE(
            (SELECT SUM(amount) FROM billing_transactions 
             WHERE operation LIKE 'MEMORY_%' 
             AND created_at > NOW() - (p_days || ' days')::INTERVAL), 
            0
        ),
        'avg_context_size_kb', CASE WHEN COUNT(*) > 0 
            THEN COALESCE(AVG(size_bytes) / 1024.0, 0)
            ELSE 0 
        END
    )
    INTO v_result
    FROM memory_contexts
    WHERE stored_at > NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
