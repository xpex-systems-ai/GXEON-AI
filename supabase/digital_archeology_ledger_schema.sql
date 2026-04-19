-- ═══════════════════════════════════════════════════════════════════════════
-- 📜 DIGITAL ARCHEOLOGY LEDGER v1.0 — Registro de Lucros e Taxas para Auditoria
-- Sistema: GXEON PREDATOR v4.0.0
-- Propósito: Auditoria completa de ROI e fluxo de caixa
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela principal de ledger para auditoria de lucros
CREATE TABLE IF NOT EXISTS digital_archeology_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação da transação
    tx_hash TEXT UNIQUE NOT NULL,
    tx_type TEXT NOT NULL, -- 'dust_sweep', 'flash_loan', 'arbitrage', 'fee_collection'
    
    -- Endereços envolvidos
    source_address TEXT NOT NULL,      -- Pool/pool de origem
    destination_address TEXT NOT NULL, -- Carteira mestre do Comandante
    executor_address TEXT,             -- Endereço que executou a tx
    
    -- Dados econômicos (AUDITÁVEIS)
    gross_profit_eth DECIMAL(36,18),   -- Lucro bruto em ETH
    gross_profit_usd DECIMAL(18,6),    -- Lucro bruto em USD
    gas_cost_eth DECIMAL(36,18),       -- Custo de gás em ETH
    gas_cost_usd DECIMAL(18,6),       -- Custo de gás em USD
    net_profit_eth DECIMAL(36,18),     -- Lucro líquido em ETH
    net_profit_usd DECIMAL(18,6),      -- Lucro líquido em USD
    
    -- Fee protection buffer (15% conforme configuração)
    fee_buffer_percent DECIMAL(5,2) DEFAULT 15.00,
    fee_buffer_amount_eth DECIMAL(36,18),
    fee_buffer_amount_usd DECIMAL(18,6),
    
    -- Dados da oportunidade
    opportunity_id UUID REFERENCES gari_dust_opportunities(id),
    pair_address TEXT,
    dex_name TEXT,
    token0_address TEXT,
    token1_address TEXT,
    
    -- AI Oracle data
    ai_confidence_score DECIMAL(3,2),  -- Score Mammouth AI (0.00-1.00)
    ai_model_version TEXT,             -- Versão do modelo Mammouth
    ai_analysis_metadata JSONB,        -- Metadados da análise AI
    
    -- Status e timestamps
    status TEXT DEFAULT 'pending', -- pending, confirmed, failed, reverted
    block_number BIGINT,
    block_timestamp TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auditoria e integridade
    audit_trail JSONB DEFAULT '{}',    -- Rastro de auditoria
    integrity_hash TEXT,               -- Hash de integridade para validação
    grafana_logged BOOLEAN DEFAULT false -- Flag de envio para Grafana
);

-- Índices otimizados para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_ledger_tx_hash ON digital_archeology_ledger(tx_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON digital_archeology_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON digital_archeology_ledger(tx_type);
CREATE INDEX IF NOT EXISTS idx_ledger_destination ON digital_archeology_ledger(destination_address);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON digital_archeology_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_block_timestamp ON digital_archeology_ledger(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_grafana ON digital_archeology_ledger(grafana_logged) WHERE grafana_logged = false;
CREATE INDEX IF NOT EXISTS idx_ledger_confidence ON digital_archeology_ledger(ai_confidence_score) WHERE ai_confidence_score < 0.85;

-- Comentários para documentação
COMMENT ON TABLE digital_archeology_ledger IS 'Registro auditável de todos os lucros e taxas do sistema GXEON';
COMMENT ON COLUMN digital_archeology_ledger.destination_address IS 'Carteira mestre do Comandante - destino final do lucro';
COMMENT ON COLUMN digital_archeology_ledger.fee_buffer_percent IS 'Proteção de 15% sobre o lucro conforme configuração monetização';
COMMENT ON COLUMN digital_archeology_ledger.ai_confidence_score IS 'Score mínimo 0.85 exigido pela Mammouth AI';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS PARA DASHBOARD DE ÚLTIMA GERAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Resumo de lucros para dashboard
CREATE OR REPLACE VIEW view_archeology_profit_summary AS
SELECT 
    COUNT(*) as total_transactions,
    SUM(gross_profit_usd) as total_gross_profit_usd,
    SUM(gas_cost_usd) as total_gas_spent_usd,
    SUM(net_profit_usd) as total_net_profit_usd,
    AVG(ai_confidence_score) as avg_ai_confidence,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE ai_confidence_score < 0.85) as low_confidence_count
FROM digital_archeology_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW view_archeology_profit_summary IS 'Resumo das últimas 24h para o Dashboard Black_Gold_Neon';

-- View: Métricas por tipo de transação
CREATE OR REPLACE VIEW view_archeology_by_type AS
SELECT 
    tx_type,
    COUNT(*) as count,
    SUM(net_profit_usd) as total_net_usd,
    AVG(net_profit_usd) as avg_net_usd,
    AVG(gas_cost_usd) as avg_gas_usd,
    AVG(ai_confidence_score) as avg_confidence
FROM digital_archeology_ledger
WHERE status = 'confirmed'
GROUP BY tx_type;

-- View: Transações rejeitadas por baixa confiança (para Grafana alerts)
CREATE OR REPLACE VIEW view_low_confidence_rejects AS
SELECT 
    id,
    tx_hash,
    ai_confidence_score,
    gross_profit_usd,
    created_at,
    'REJECTED_BY_AI' as rejection_reason
FROM digital_archeology_ledger
WHERE ai_confidence_score < 0.85
AND status = 'rejected'
ORDER BY created_at DESC;

COMMENT ON VIEW view_low_confidence_rejects IS 'Transações abortadas por confidence < 0.85 - Alertas Grafana';

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS PARA INTEGRIDADE
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Calcular integridade hash
CREATE OR REPLACE FUNCTION calculate_ledger_integrity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.integrity_hash := encode(
        digest(
            NEW.tx_hash || NEW.destination_address || COALESCE(NEW.net_profit_eth::TEXT, '0'),
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-calcular hash de integridade
CREATE TRIGGER trigger_ledger_integrity
    BEFORE INSERT OR UPDATE ON digital_archeology_ledger
    FOR EACH ROW
    EXECUTE FUNCTION calculate_ledger_integrity();

-- Function: Logar rejeição por baixa confiança
CREATE OR REPLACE FUNCTION log_low_confidence_rejection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ai_confidence_score < 0.85 THEN
        -- Inserir na tabela de logs para Grafana
        INSERT INTO grafana_alert_logs (
            alert_type,
            severity,
            message,
            metadata,
            created_at
        ) VALUES (
            'AI_CONFIDENCE_REJECTION',
            'WARNING',
            'Transação abortada: confidence ' || NEW.ai_confidence_score || ' < 0.85',
            jsonb_build_object(
                'tx_hash', NEW.tx_hash,
                'opportunity_id', NEW.opportunity_id,
                'confidence', NEW.ai_confidence_score,
                'potential_profit_usd', NEW.gross_profit_usd
            ),
            NOW()
        );
        
        NEW.status := 'rejected';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validar confiança antes de inserir
CREATE TRIGGER trigger_validate_confidence
    BEFORE INSERT ON digital_archeology_ledger
    FOR EACH ROW
    EXECUTE FUNCTION log_low_confidence_rejection();

-- Function: Obter estatísticas para dashboard
CREATE OR REPLACE FUNCTION get_archeology_dashboard_stats(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_profit_usd DECIMAL,
    success_rate DECIMAL,
    gas_spent_usd DECIMAL,
    avg_confidence DECIMAL,
    total_txs BIGINT,
    high_confidence_txs BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(net_profit_usd), 0)::DECIMAL as total_profit_usd,
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / COUNT(*))::DECIMAL 
            ELSE 0 
        END as success_rate,
        COALESCE(SUM(gas_cost_usd), 0)::DECIMAL as gas_spent_usd,
        COALESCE(AVG(ai_confidence_score), 0)::DECIMAL as avg_confidence,
        COUNT(*)::BIGINT as total_txs,
        COUNT(*) FILTER (WHERE ai_confidence_score >= 0.85)::BIGINT as high_confidence_txs
    FROM digital_archeology_ledger
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_archeology_dashboard_stats IS 'Retorna métricas para o Dashboard Black_Gold_Neon';

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA DE LOGS PARA GRAFANA (se não existir)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grafana_alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grafana_alerts_type ON grafana_alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_grafana_alerts_severity ON grafana_alert_logs(severity);
CREATE INDEX IF NOT EXISTS idx_grafana_alerts_created ON grafana_alert_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎨 DIGITAL ARCHEOLOGY LEDGER v1.0 PRONTO
-- ═══════════════════════════════════════════════════════════════════════════
