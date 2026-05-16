-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON ALL-SEEING EYE — SCHEMA DE MÉTRICAS
-- Dashboard: Monetization Command Center v1.0
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FINOPS NEXUS — Métricas Financeiras
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_financial_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    real_time_balance DECIMAL(20, 8) DEFAULT 0,
    accumulated_pnl_24h DECIMAL(20, 8) DEFAULT 0,
    net_profit_24h DECIMAL(20, 8) DEFAULT 0,
    total_revenue_24h DECIMAL(20, 8) DEFAULT 0,
    total_gas_24h DECIMAL(20, 8) DEFAULT 0,
    transaction_volume_24h INTEGER DEFAULT 0,
    roi_24h_pct DECIMAL(10, 4) DEFAULT 0,
    predicted_profit_30d DECIMAL(20, 8) DEFAULT 0,
    stripe_revenue DECIMAL(20, 8) DEFAULT 0,
    paypal_revenue DECIMAL(20, 8) DEFAULT 0,
    web3_revenue DECIMAL(20, 8) DEFAULT 0,
    internal_wallet_revenue DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para queries rápidas
CREATE INDEX IF NOT EXISTS idx_grafana_financial_timestamp 
    ON grafana_financial_master(timestamp DESC);

-- Trigger para manter apenas últimas 24h
CREATE OR REPLACE FUNCTION cleanup_old_financial_metrics()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM grafana_financial_master 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_financial ON grafana_financial_master;
CREATE TRIGGER trg_cleanup_financial
    AFTER INSERT ON grafana_financial_master
    EXECUTE FUNCTION cleanup_old_financial_metrics();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SENTINEL HEALTH — Métricas de Infraestrutura
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    railway_uptime_pct DECIMAL(5, 2) DEFAULT 100.00,
    cpu_usage_pct DECIMAL(5, 2) DEFAULT 0.00,
    ram_usage_pct DECIMAL(5, 2) DEFAULT 0.00,
    disk_usage_pct DECIMAL(5, 2) DEFAULT 0.00,
    api_latency_ms INTEGER DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    server_status VARCHAR(20) DEFAULT 'ONLINE',
    last_restart_at TIMESTAMPTZ,
    error_rate_5m DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_health_timestamp 
    ON grafana_health_metrics(timestamp DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. AGENT EFFICIENCY — Performance dos Agentes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_agent_efficiency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    agent_name VARCHAR(100),
    operation_success_rate_pct DECIMAL(5, 2) DEFAULT 0.00,
    message_throughput_per_sec INTEGER DEFAULT 0,
    operations_completed_24h INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    error_count_24h INTEGER DEFAULT 0,
    active_agents_count INTEGER DEFAULT 0,
    total_agents_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_agent_timestamp 
    ON grafana_agent_efficiency(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_grafana_agent_name 
    ON grafana_agent_efficiency(agent_name);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. AI PROCESSING LOGS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    agent_name VARCHAR(100),
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT,
    context JSONB,
    operation_id VARCHAR(100),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_ai_logs_timestamp 
    ON grafana_ai_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_grafana_ai_logs_level 
    ON grafana_ai_logs(log_level);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CYBER SHIELD — Métricas de Segurança
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_security_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    blocked_intrusions_count INTEGER DEFAULT 0,
    failed_auth_attempts INTEGER DEFAULT 0,
    suspicious_ips_blocked INTEGER DEFAULT 0,
    contract_integrity_check BOOLEAN DEFAULT true,
    last_audit_at TIMESTAMPTZ,
    critical_alerts_count INTEGER DEFAULT 0,
    security_score DECIMAL(5, 2) DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_security_timestamp 
    ON grafana_security_metrics(timestamp DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CORNIX MONETIZATION — Vendas de Sinais
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_cornix_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(100),
    symbol VARCHAR(50),
    side VARCHAR(10),
    unlock_price_brl DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    pix_tx_id VARCHAR(100),
    sold_at TIMESTAMPTZ DEFAULT NOW(),
    buyer_region VARCHAR(100),
    buyer_country VARCHAR(10),
    conversion_source VARCHAR(50),
    refunded BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_cornix_sold_at 
    ON grafana_cornix_sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_grafana_cornix_status 
    ON grafana_cornix_sales(payment_status);

-- View para receita total
CREATE OR REPLACE VIEW grafana_cornix_revenue_summary AS
SELECT 
    DATE(sold_at) as sale_date,
    COUNT(*) as total_sales,
    COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_sales,
    SUM(CASE WHEN payment_status = 'PAID' THEN unlock_price_brl ELSE 0 END) as total_revenue_brl,
    AVG(unlock_price_brl) as avg_price_brl,
    buyer_country,
    payment_method
FROM grafana_cornix_sales
GROUP BY DATE(sold_at), buyer_country, payment_method
ORDER BY sale_date DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ALERT CONFIGURATION TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(200),
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    metric_value DECIMAL(20, 8),
    threshold_value DECIMAL(20, 8),
    message TEXT,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_alerts_triggered 
    ON grafana_alert_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_grafana_alerts_ack 
    ON grafana_alert_history(acknowledged) 
    WHERE acknowledged = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS PARA MÉTRICAS EM TEMPO REAL
-- ═══════════════════════════════════════════════════════════════════════════

-- Função para inserir métricas financeiras
CREATE OR REPLACE FUNCTION insert_financial_metrics(
    p_balance DECIMAL,
    p_pnl DECIMAL,
    p_gas DECIMAL,
    p_volume INTEGER,
    p_roi DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO grafana_financial_master (
        real_time_balance,
        accumulated_pnl_24h,
        total_gas_24h,
        transaction_volume_24h,
        roi_24h_pct
    ) VALUES (
        p_balance,
        p_pnl,
        p_gas,
        p_volume,
        p_roi
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Função para inserir health metrics
CREATE OR REPLACE FUNCTION insert_health_metrics(
    p_cpu DECIMAL,
    p_ram DECIMAL,
    p_latency INTEGER,
    p_uptime DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO grafana_health_metrics (
        cpu_usage_pct,
        ram_usage_pct,
        api_latency_ms,
        railway_uptime_pct
    ) VALUES (
        p_cpu,
        p_ram,
        p_latency,
        p_uptime
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Função para log de AI
CREATE OR REPLACE FUNCTION insert_ai_log(
    p_agent VARCHAR,
    p_level VARCHAR,
    p_message TEXT,
    p_context JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO grafana_ai_logs (
        agent_name,
        log_level,
        message,
        context
    ) VALUES (
        p_agent,
        p_level,
        p_message,
        p_context
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar venda Cornix
CREATE OR REPLACE FUNCTION insert_cornix_sale(
    p_signal_id VARCHAR,
    p_symbol VARCHAR,
    p_side VARCHAR,
    p_price DECIMAL,
    p_status VARCHAR,
    p_method VARCHAR,
    p_region VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO grafana_cornix_sales (
        signal_id,
        symbol,
        side,
        unlock_price_brl,
        payment_status,
        payment_method,
        buyer_region
    ) VALUES (
        p_signal_id,
        p_symbol,
        p_side,
        p_price,
        p_status,
        p_method,
        p_region
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (Desabilitado para Grafana)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE grafana_financial_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_health_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_agent_efficiency DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_ai_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_security_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_cornix_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE grafana_alert_history DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- ENABLE REALTIME (para live updates)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE grafana_financial_master;
ALTER PUBLICATION supabase_realtime ADD TABLE grafana_cornix_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE grafana_alert_history;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE grafana_financial_master IS 'Métricas financeiras para FinOps Nexus dashboard';
COMMENT ON TABLE grafana_health_metrics IS 'Métricas de saúde da infraestrutura Railway';
COMMENT ON TABLE grafana_agent_efficiency IS 'Performance e throughput dos agentes AI';
COMMENT ON TABLE grafana_ai_logs IS 'Logs de processamento dos agentes';
COMMENT ON TABLE grafana_security_metrics IS 'Métricas de segurança e intrusões bloqueadas';
COMMENT ON TABLE grafana_cornix_sales IS 'Vendas de sinais premium Cornix';
COMMENT ON TABLE grafana_alert_history IS 'Histórico de alertas do sistema';
