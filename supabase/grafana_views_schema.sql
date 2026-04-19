-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 GRAFANA VIEWS v21.0 — Otimizado para Visualização Cyberpunk
-- GXEON Visual Command | Grafana OSS/Cloud Integration
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 1: Liquidity Radar Heatmap (Otimizada para Heatmap Panel)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_liquidity_heatmap AS
SELECT
    id,
    chain_id,
    pair_address,
    dex_name,
    token0_symbol,
    token1_symbol,
    liquidity_usd,
    volume_24h_usd,
    detected_at,
    status,
    alert_triggered,
    -- Buckets de tempo para Grafana Heatmap
    DATE_TRUNC('minute', detected_at) AS time_bucket,
    CASE
        WHEN liquidity_usd >= 100000 THEN 'high'
        WHEN liquidity_usd >= 50000 THEN 'medium'
        ELSE 'standard'
    END AS liquidity_tier
FROM radar_liquidity_pools
WHERE 
    detected_at > NOW() - INTERVAL '24 hours'
    AND liquidity_usd > 10000
ORDER BY detected_at DESC;

COMMENT ON VIEW grafana_liquidity_heatmap IS 'View otimizada para Grafana Heatmap de liquidez';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 2: Whale Telemetry Tracker (Logs Panel)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_whale_telemetry AS
SELECT
    id,
    chain_id,
    from_address,
    to_address,
    token_symbol,
    amount,
    amount_usd,
    flow_type,
    block_number,
    transaction_hash,
    detected_at,
    is_whale,
    smart_score,
    -- Campos formatados para Grafana Logs
    CASE 
        WHEN is_whale THEN 'CRITICAL'
        WHEN amount_usd > 20000 THEN 'WARNING'
        ELSE 'INFO'
    END AS severity,
    CONCAT(
        '💰 ', ROUND(amount, 2), ' ', token_symbol,
        ' ($', ROUND(amount_usd, 0), ') ',
        'from ', LEFT(from_address, 8), '...',
        ' to ', LEFT(to_address, 8), '...'
    ) AS log_message
FROM radar_smart_money_flows
WHERE 
    detected_at > NOW() - INTERVAL '24 hours'
    AND amount_usd > 50000
ORDER BY detected_at DESC;

COMMENT ON VIEW grafana_whale_telemetry IS 'View otimizada para Grafana Logs Panel de whale tracking';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 3: Oracle A2A Revenue (Time Series)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_oracle_revenue AS
SELECT
    DATE_TRUNC('hour', request_at) AS hour,
    COUNT(*) AS req_count,
    AVG(latency_ms) AS avg_latency_ms,
    SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
    endpoint,
    agent_id
FROM a2a_agent_activity
WHERE request_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', request_at), endpoint, agent_id
ORDER BY hour DESC;

COMMENT ON VIEW grafana_oracle_revenue IS 'View agregada para métricas de revenue e performance A2A';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 4: High Value Pools Monitor (>$100k alertas)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_high_value_pools AS
SELECT
    id,
    chain_id,
    pair_address,
    dex_name,
    token0_symbol,
    token1_symbol,
    liquidity_usd,
    volume_24h_usd,
    detected_at,
    status,
    alert_triggered,
    -- Score de atratividade para arbitragem
    (volume_24h_usd / NULLIF(liquidity_usd, 0)) * 100 AS volume_ratio,
    -- Categorização
    CASE
        WHEN liquidity_usd >= 500000 THEN 'mega_pool'
        WHEN liquidity_usd >= 100000 THEN 'high_value'
        WHEN liquidity_usd >= 50000 THEN 'medium_value'
        ELSE 'standard'
    END AS value_tier
FROM radar_liquidity_pools
WHERE 
    liquidity_usd >= 50000
    AND detected_at > NOW() - INTERVAL '7 days'
ORDER BY liquidity_usd DESC;

COMMENT ON VIEW grafana_high_value_pools IS 'Monitoramento de pools de alto valor para alertas';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 5: Agent Activity Summary (Dashboard Cards)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_agent_summary AS
SELECT
    tier,
    status,
    COUNT(*) AS total_agents,
    SUM(current_balance) AS total_balance,
    COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 hour') AS active_last_hour,
    COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '24 hours') AS active_last_24h,
    MAX(last_seen_at) AS latest_activity
FROM a2a_agents
GROUP BY tier, status;

COMMENT ON VIEW grafana_agent_summary IS 'Resumo de agentes para dashboard cards';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 6: Signal Revenue Real-time
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW grafana_signal_revenue_realtime AS
SELECT
    signal_type,
    DATE_TRUNC('hour', consumed_at) AS hour,
    COUNT(*) AS signals_sold,
    SUM(cost_usd) AS revenue_usd,
    AVG(cost_usd) AS avg_price_per_signal
FROM a2a_signals_consumed
WHERE consumed_at > NOW() - INTERVAL '24 hours'
GROUP BY signal_type, DATE_TRUNC('hour', consumed_at)
ORDER BY hour DESC;

COMMENT ON VIEW grafana_signal_revenue_realtime IS 'Revenue por tipo de sinal em tempo real';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES Otimizados para Grafana Queries
-- ═══════════════════════════════════════════════════════════════════════════

-- Índice para heatmap time ranges
CREATE INDEX IF NOT EXISTS idx_liquidity_detected_at 
ON radar_liquidity_pools(detected_at DESC) 
WHERE liquidity_usd > 10000;

-- Índice para whale telemetry
CREATE INDEX IF NOT EXISTS idx_whale_detected_at 
ON radar_smart_money_flows(detected_at DESC) 
WHERE amount_usd > 50000;

-- Índice para A2A activity
CREATE INDEX IF NOT EXISTS idx_a2a_request_at_endpoint 
ON a2a_agent_activity(request_at DESC, endpoint);

-- Índice para signals consumed
CREATE INDEX IF NOT EXISTS idx_signals_consumed_hour 
ON a2a_signals_consumed(consumed_at DESC, signal_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 GRAFANA VIEWS v21.0 PRONTAS
-- Cores: Primary #D4AF37 | Background #000000 | Accent #00FFFF
-- ═══════════════════════════════════════════════════════════════════════════
