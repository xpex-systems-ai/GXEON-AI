-- Billing Telemetry SQL Functions
-- Add these to your Supabase schema

/**
 * Get global billing statistics
 * Used by: GET /api/billing/stats
 */
CREATE OR REPLACE FUNCTION get_billing_stats()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
        'refunded_count', COUNT(*) FILTER (WHERE status = 'refunded'),
        'reserved_count', COUNT(*) FILTER (WHERE status = 'reserved'),
        'revenue_24h', COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'), 0)
    )
    INTO v_result
    FROM billing_transactions;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Get user-specific billing statistics
 * Used by: GET /api/billing/user-stats
 */
CREATE OR REPLACE FUNCTION get_user_billing_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_balance NUMERIC;
BEGIN
    -- Get current balance
    SELECT balance_credits INTO v_balance
    FROM users WHERE id = p_user_id;
    
    SELECT jsonb_build_object(
        'current_balance', v_balance,
        'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
        'refunded_count', COUNT(*) FILTER (WHERE status = 'refunded'),
        'spent_24h', COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'), 0),
        'spent_total', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)
    )
    INTO v_result
    FROM billing_transactions
    WHERE user_id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Get hourly revenue breakdown
 * Used by: GET /api/billing/hourly
 */
CREATE OR REPLACE FUNCTION get_hourly_revenue(p_hours INT DEFAULT 24)
RETURNS TABLE (
    hour TIMESTAMP,
    revenue NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as transaction_count
    FROM billing_transactions
    WHERE status = 'completed'
        AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY DATE_TRUNC('hour', created_at)
    ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Get stuck transactions requiring manual review
 * Used by admin monitoring
 */
CREATE OR REPLACE FUNCTION get_stuck_transactions(p_minutes INT DEFAULT 60)
RETURNS TABLE (
    tx_id UUID,
    user_id UUID,
    amount NUMERIC,
    operation TEXT,
    created_at TIMESTAMP,
    minutes_stuck NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id as tx_id,
        bt.user_id,
        bt.amount,
        bt.operation,
        bt.created_at,
        EXTRACT(EPOCH FROM (NOW() - bt.created_at))/60 as minutes_stuck
    FROM billing_transactions bt
    WHERE bt.status = 'reserved'
        AND bt.created_at < NOW() - (p_minutes || ' minutes')::INTERVAL
    ORDER BY bt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Daily revenue report
 * Used for automated reporting
 */
CREATE OR REPLACE FUNCTION get_daily_revenue(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'date', p_date,
        'total_revenue', COALESCE(SUM(amount), 0),
        'transaction_count', COUNT(*),
        'refund_count', COUNT(*) FILTER (WHERE status = 'refunded'),
        'avg_transaction', CASE WHEN COUNT(*) > 0 THEN AVG(amount) ELSE 0 END
    )
    INTO v_result
    FROM billing_transactions
    WHERE DATE(created_at) = p_date
        AND status = 'completed';
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for telemetry queries
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON billing_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_status_created ON billing_transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_billing_user_status ON billing_transactions(user_id, status);
