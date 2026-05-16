-- ═══════════════════════════════════════════════════════════════════════════
-- OBSERVABILITY SCHEMA - Event Tracking & Monitoring
-- ═══════════════════════════════════════════════════════════════════════════

-- Events table for real-time logging
CREATE TABLE IF NOT EXISTS observability_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  payload JSONB DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_observability_events_type (event_type),
  INDEX idx_observability_events_created (created_at DESC),
  INDEX idx_observability_events_severity (severity)
);

-- Signal lifecycle tracking
CREATE TABLE IF NOT EXISTS signal_lifecycle_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES unified_signals(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_lifecycle_signal (signal_id),
  INDEX idx_lifecycle_stage (stage),
  INDEX idx_lifecycle_tracked (tracked_at DESC)
);

-- Aggregated metrics
CREATE TABLE IF NOT EXISTS observability_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  period TEXT NOT NULL,
  metrics JSONB NOT NULL,
  
  INDEX idx_metrics_timestamp (timestamp DESC),
  INDEX idx_metrics_period (period)
);

-- API request logs
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  user_id TEXT,
  api_key TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_api_endpoint (endpoint),
  INDEX idx_api_created (created_at DESC),
  INDEX idx_api_status (status_code)
);

-- Revenue tracking detailed
CREATE TABLE IF NOT EXISTS revenue_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_type TEXT NOT NULL, -- subscription, pay_per_signal, b2b, revshare
  amount_brl DECIMAL(10,2) NOT NULL,
  user_id TEXT,
  provider_id UUID,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  
  INDEX idx_revenue_type (revenue_type),
  INDEX idx_revenue_status (status),
  INDEX idx_revenue_created (created_at DESC),
  INDEX idx_revenue_user (user_id)
);

-- Enable RLS
ALTER TABLE observability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_lifecycle_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_tracking ENABLE ROW LEVEL SECURITY;

-- Policies (admin only for observability)
CREATE POLICY "Admin full access on observability_events"
  ON observability_events FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on lifecycle tracking"
  ON signal_lifecycle_tracking FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on metrics"
  ON observability_metrics FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on api logs"
  ON api_request_logs FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access on revenue tracking"
  ON revenue_tracking FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Functions for aggregations

-- Get event counts by type
CREATE OR REPLACE FUNCTION get_event_counts(
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (event_type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oe.event_type,
    COUNT(*)::BIGINT as count
  FROM observability_events oe
  WHERE oe.created_at BETWEEN p_start_time AND p_end_time
  GROUP BY oe.event_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get revenue summary
CREATE OR REPLACE FUNCTION get_revenue_summary(
  p_period TEXT DEFAULT 'daily'
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  total_revenue DECIMAL,
  subscription_revenue DECIMAL,
  pps_revenue DECIMAL,
  b2b_revenue DECIMAL,
  confirmed_count BIGINT,
  pending_count BIGINT
) AS $$
DECLARE
  v_interval INTERVAL;
BEGIN
  v_interval := CASE p_period
    WHEN 'hourly' THEN INTERVAL '1 hour'
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'monthly' THEN INTERVAL '1 month'
    ELSE INTERVAL '1 day'
  END;
  
  RETURN QUERY
  SELECT 
    DATE_TRUNC(p_period, rt.created_at) as period_start,
    SUM(CASE WHEN rt.status = 'confirmed' THEN rt.amount_brl ELSE 0 END) as total_revenue,
    SUM(CASE WHEN rt.revenue_type = 'subscription' AND rt.status = 'confirmed' THEN rt.amount_brl ELSE 0 END) as subscription_revenue,
    SUM(CASE WHEN rt.revenue_type = 'pay_per_signal' AND rt.status = 'confirmed' THEN rt.amount_brl ELSE 0 END) as pps_revenue,
    SUM(CASE WHEN rt.revenue_type = 'b2b' AND rt.status = 'confirmed' THEN rt.amount_brl ELSE 0 END) as b2b_revenue,
    COUNT(*) FILTER (WHERE rt.status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE rt.status = 'pending') as pending_count
  FROM revenue_tracking rt
  WHERE rt.created_at >= NOW() - v_interval
  GROUP BY DATE_TRUNC(p_period, rt.created_at)
  ORDER BY period_start DESC;
END;
$$ LANGUAGE plpgsql;

-- Get system health score
CREATE OR REPLACE FUNCTION get_system_health_score()
RETURNS TABLE (
  metric TEXT,
  score INTEGER,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- API latency score
  RETURN QUERY
  SELECT 
    'api_latency'::TEXT as metric,
    CASE 
      WHEN AVG(ar.latency_ms) < 100 THEN 100
      WHEN AVG(ar.latency_ms) < 300 THEN 80
      WHEN AVG(ar.latency_ms) < 500 THEN 60
      ELSE 40
    END::INTEGER as score,
    CASE 
      WHEN AVG(ar.latency_ms) < 100 THEN 'excellent'
      WHEN AVG(ar.latency_ms) < 300 THEN 'good'
      WHEN AVG(ar.latency_ms) < 500 THEN 'fair'
      ELSE 'poor'
    END::TEXT as status,
    jsonb_build_object(
      'avg_latency_ms', ROUND(AVG(ar.latency_ms)::NUMERIC, 2),
      'p95_latency_ms', (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FROM api_request_logs WHERE created_at > NOW() - INTERVAL '1 hour')
    ) as details
  FROM api_request_logs ar
  WHERE ar.created_at > NOW() - INTERVAL '1 hour';
  
  -- Error rate score
  RETURN QUERY
  SELECT 
    'error_rate'::TEXT as metric,
    CASE 
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 1 THEN 100
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 5 THEN 80
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 10 THEN 60
      ELSE 40
    END::INTEGER as score,
    CASE 
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 1 THEN 'excellent'
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 5 THEN 'good'
      WHEN (COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100 < 10 THEN 'fair'
      ELSE 'poor'
    END::TEXT as status,
    jsonb_build_object(
      'error_rate_pct', ROUND((COUNT(*) FILTER (WHERE status_code >= 400))::FLOAT / NULLIF(COUNT(*), 0) * 100, 2),
      'total_requests', COUNT(*),
      'error_requests', COUNT(*) FILTER (WHERE status_code >= 400)
    ) as details
  FROM api_request_logs
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Signal flow score
  RETURN QUERY
  SELECT 
    'signal_flow'::TEXT as metric,
    CASE 
      WHEN COUNT(*) > 100 THEN 100
      WHEN COUNT(*) > 50 THEN 80
      WHEN COUNT(*) > 10 THEN 60
      ELSE 40
    END::INTEGER as score,
    CASE 
      WHEN COUNT(*) > 100 THEN 'excellent'
      WHEN COUNT(*) > 50 THEN 'good'
      WHEN COUNT(*) > 10 THEN 'fair'
      ELSE 'poor'
    END::TEXT as status,
    jsonb_build_object(
      'signals_last_hour', COUNT(*),
      'avg_confidence', ROUND(AVG((payload->>'confidence')::NUMERIC), 2)
    ) as details
  FROM observability_events
  WHERE event_type = 'SIGNAL_CREATED'
  AND created_at > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-cleanup of old events (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_observability_data()
RETURNS void AS $$
BEGIN
  DELETE FROM observability_events WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM signal_lifecycle_tracking WHERE tracked_at < NOW() - INTERVAL '30 days';
  DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM observability_metrics WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_observability_events_composite 
ON observability_events(event_type, created_at DESC) 
WHERE severity IN ('error', 'critical');

CREATE INDEX IF NOT EXISTS idx_revenue_tracking_composite 
ON revenue_tracking(revenue_type, status, created_at DESC);

-- Grant permissions
GRANT SELECT ON observability_events TO anon;
GRANT SELECT ON signal_lifecycle_tracking TO anon;
GRANT SELECT ON observability_metrics TO anon;
GRANT SELECT ON api_request_logs TO anon;
GRANT SELECT ON revenue_tracking TO anon;

COMMENT ON TABLE observability_events IS 'Real-time event logging for system observability';
COMMENT ON TABLE signal_lifecycle_tracking IS 'Track signal lifecycle stages';
COMMENT ON TABLE observability_metrics IS 'Aggregated metrics snapshots';
COMMENT ON TABLE api_request_logs IS 'API request logging for monitoring';
COMMENT ON TABLE revenue_tracking IS 'Detailed revenue tracking with status';
