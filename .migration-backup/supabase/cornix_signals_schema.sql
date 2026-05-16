-- ═══════════════════════════════════════════════════════════════════════════
-- CORNIX SIGNALS MONETIZATION SYSTEM v1.0
-- Schema for trading signals with PIX payment unlock
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela principal de sinais de trading
CREATE TABLE IF NOT EXISTS cornix_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(50) UNIQUE NOT NULL, -- Format: SIG_YYYYMMDD_NNN
    
    -- Cornix Format Fields
    symbol VARCHAR(50) NOT NULL, -- BTCUSDT, ETHUSDT, etc
    side VARCHAR(10) NOT NULL CHECK (side IN ('LONG', 'SHORT', 'BUY', 'SELL')),
    entry_price DECIMAL(18, 8) NOT NULL,
    entry_range_low DECIMAL(18, 8),
    entry_range_high DECIMAL(18, 8),
    
    -- Targets (até 5 alvos)
    target_1 DECIMAL(18, 8),
    target_2 DECIMAL(18, 8),
    target_3 DECIMAL(18, 8),
    target_4 DECIMAL(18, 8),
    target_5 DECIMAL(18, 8),
    
    -- Stop Loss
    stop_loss DECIMAL(18, 8) NOT NULL,
    
    -- Leverage & Margin
    leverage INT DEFAULT 1,
    margin_type VARCHAR(10) DEFAULT 'ISOLATED' CHECK (margin_type IN ('ISOLATED', 'CROSS')),
    
    -- Premium/Free Status
    is_premium BOOLEAN DEFAULT false,
    unlock_price_brl DECIMAL(10, 2) DEFAULT 29.90, -- Preço PIX para desbloquear
    
    -- Signal Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED', 'COMPLETED')),
    expires_at TIMESTAMPTZ,
    
    -- Performance Tracking
    result VARCHAR(10) CHECK (result IN ('WIN', 'LOSS', 'PENDING', 'CANCELLED')),
    profit_percent DECIMAL(10, 4),
    roi_percent DECIMAL(10, 4),
    max_drawdown DECIMAL(10, 4),
    filled_target INT, -- Qual alvo foi atingido (1-5)
    
    -- Metadata
    strategy VARCHAR(50), -- Nome da estratégia
    timeframe VARCHAR(10), -- 1m, 5m, 15m, 1h, 4h, 1d
    confidence_score DECIMAL(5, 2), -- 0-100 score de confiança
    risk_reward DECIMAL(5, 2), -- Ratio R:R
    
    -- Source & Generation
    source VARCHAR(50) DEFAULT 'AI_GENERATED', -- AI, MANUAL, WEBHOOK, COPY_TRADING
    generated_by_agent VARCHAR(100),
    webhook_source VARCHAR(200), -- URL do webhook externo se aplicável
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    filled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Tabela de acessos/pagamentos PIX para sinais premium
CREATE TABLE IF NOT EXISTS cornix_signal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES cornix_signals(id) ON DELETE CASCADE,
    user_id UUID, -- Sem REFERENCES para permitir usuários anônimos
    
    -- Payment Info
    payment_method VARCHAR(20) DEFAULT 'PIX' CHECK (payment_method IN ('PIX', 'CRYPTO', 'CREDITS')),
    payment_amount_brl DECIMAL(10, 2),
    payment_tx_id VARCHAR(100), -- ID da transação PIX/Blockchain
    
    -- Access Status
    access_granted BOOLEAN DEFAULT false,
    accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Acesso pode expirar (ex: 30 dias)
    
    -- Full signal data (encrypted or reference)
    full_signal_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de performance histórica para leaderboard
CREATE TABLE IF NOT EXISTS cornix_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Signal reference
    signal_id UUID REFERENCES cornix_signals(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    duration_minutes INT,
    
    entry_price_actual DECIMAL(18, 8),
    exit_price_actual DECIMAL(18, 8),
    
    profit_amount_usd DECIMAL(18, 4),
    profit_percent DECIMAL(10, 4),
    
    -- Hit Analysis
    targets_hit INT DEFAULT 0,
    stop_hit BOOLEAN DEFAULT false,
    max_profit_reached DECIMAL(10, 4), -- Max profit % reached during trade
    max_drawdown_reached DECIMAL(10, 4),
    
    -- Market Conditions
    market_volatility DECIMAL(10, 4),
    market_trend VARCHAR(10), -- BULLISH, BEARISH, SIDEWAYS
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_source VARCHAR(50), -- exchange API, manual, webhook
    
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de leaderboard (agregada por período)
CREATE TABLE IF NOT EXISTS cornix_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Period
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Entity (can be AI strategy, trader, or agent)
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('STRATEGY', 'TRADER', 'AGENT', 'SYSTEM')),
    entity_id VARCHAR(100) NOT NULL,
    entity_name VARCHAR(200),
    
    -- Stats
    total_signals INT DEFAULT 0,
    win_count INT DEFAULT 0,
    loss_count INT DEFAULT 0,
    win_rate DECIMAL(5, 2), -- 0-100
    
    avg_profit_win DECIMAL(10, 4),
    avg_loss DECIMAL(10, 4),
    
    total_profit_percent DECIMAL(10, 4),
    total_roi DECIMAL(10, 4),
    
    max_drawdown DECIMAL(10, 4),
    profit_factor DECIMAL(10, 4), -- Gross profit / Gross loss
    sharpe_ratio DECIMAL(10, 4),
    
    -- Ranking
    rank_position INT,
    rank_change INT DEFAULT 0,
    
    -- Verification
    verified_trades INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(period_type, period_start, entity_type, entity_id)
);

-- Tabela de webhook deliveries para Cornix
CREATE TABLE IF NOT EXISTS cornix_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    signal_id UUID REFERENCES cornix_signals(id) ON DELETE CASCADE,
    webhook_url VARCHAR(500) NOT NULL,
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING')),
    attempt_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Request/Response
    request_payload JSONB,
    response_status INT,
    response_body TEXT,
    error_message TEXT,
    
    -- Timestamps
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de webhook do usuário
CREATE TABLE IF NOT EXISTS cornix_user_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gxeon_users(id) ON DELETE CASCADE,
    
    webhook_name VARCHAR(100),
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(100), -- For HMAC signature
    
    -- Filters
    symbols VARCHAR(50)[], -- Which symbols to subscribe
    signal_types VARCHAR(20)[], -- LONG, SHORT, BOTH
    min_confidence DECIMAL(5, 2) DEFAULT 0, -- Minimum confidence score
    only_premium BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_delivery_at TIMESTAMPTZ,
    total_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, webhook_url)
);

-- Tabela de pagamentos PIX
CREATE TABLE IF NOT EXISTS pix_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference (user_id sem FK para permitir usuários anônimos)
    user_id UUID, -- Sem REFERENCES para anon users
    signal_id UUID REFERENCES cornix_signals(id) ON DELETE SET NULL,
    
    -- PIX Data
    pix_tx_id VARCHAR(100) UNIQUE NOT NULL,
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    
    -- Amount
    amount_brl DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
    
    -- Timestamps
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cornix_signals_status ON cornix_signals(status);
CREATE INDEX IF NOT EXISTS idx_cornix_signals_symbol ON cornix_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_cornix_signals_created ON cornix_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cornix_signals_premium ON cornix_signals(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_cornix_signals_result ON cornix_signals(result) WHERE result IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cornix_signal_access_user ON cornix_signal_access(user_id);
CREATE INDEX IF NOT EXISTS idx_cornix_signal_access_signal ON cornix_signal_access(signal_id);

CREATE INDEX IF NOT EXISTS idx_cornix_performance_signal ON cornix_performance(signal_id);
CREATE INDEX IF NOT EXISTS idx_cornix_performance_verified ON cornix_performance(verified) WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_cornix_leaderboard_period ON cornix_leaderboard(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_cornix_leaderboard_rank ON cornix_leaderboard(period_type, rank_position);

CREATE INDEX IF NOT EXISTS idx_cornix_webhook_signal ON cornix_webhook_deliveries(signal_id);
CREATE INDEX IF NOT EXISTS idx_cornix_webhook_status ON cornix_webhook_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_user ON pix_payments(user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_cornix_signals_updated_at BEFORE UPDATE ON cornix_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cornix_leaderboard_updated_at BEFORE UPDATE ON cornix_leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cornix_user_webhooks_updated_at BEFORE UPDATE ON cornix_user_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pix_payments_updated_at BEFORE UPDATE ON pix_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar signal_id automaticamente
CREATE OR REPLACE FUNCTION generate_signal_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.signal_id IS NULL THEN
        NEW.signal_id := 'SIG_' || to_char(now(), 'YYYYMMDD') || '_' || LPAD(nextval('signal_seq')::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Sequence para signal_id
CREATE SEQUENCE IF NOT EXISTS signal_seq START 1;

-- Trigger para gerar signal_id
CREATE TRIGGER trigger_generate_signal_id BEFORE INSERT ON cornix_signals
    FOR EACH ROW EXECUTE FUNCTION generate_signal_id();

-- Função para calcular win rate e estatísticas
CREATE OR REPLACE FUNCTION calculate_leaderboard_stats(
    p_period_type VARCHAR,
    p_period_start DATE,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR
)
RETURNS TABLE (
    total_signals INT,
    win_count INT,
    loss_count INT,
    win_rate DECIMAL,
    avg_profit_win DECIMAL,
    avg_loss DECIMAL,
    total_profit_percent DECIMAL,
    profit_factor DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT as total_signals,
        COUNT(*) FILTER (WHERE cs.result = 'WIN')::INT as win_count,
        COUNT(*) FILTER (WHERE cs.result = 'LOSS')::INT as loss_count,
        ROUND(COUNT(*) FILTER (WHERE cs.result = 'WIN') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE cs.result IN ('WIN', 'LOSS')), 0), 2) as win_rate,
        ROUND(AVG(cs.profit_percent) FILTER (WHERE cs.result = 'WIN'), 4) as avg_profit_win,
        ROUND(AVG(ABS(cs.profit_percent)) FILTER (WHERE cs.result = 'LOSS'), 4) as avg_loss,
        ROUND(SUM(cs.profit_percent), 4) as total_profit_percent,
        ROUND(
            SUM(CASE WHEN cs.profit_percent > 0 THEN cs.profit_percent ELSE 0 END) / 
            NULLIF(SUM(CASE WHEN cs.profit_percent < 0 THEN ABS(cs.profit_percent) ELSE 0 END), 0),
            4
        ) as profit_factor
    FROM cornix_signals cs
    WHERE cs.result IS NOT NULL
    AND cs.result IN ('WIN', 'LOSS')
    AND CASE 
        WHEN p_period_type = 'DAILY' THEN DATE(cs.completed_at) = p_period_start
        WHEN p_period_type = 'WEEKLY' THEN DATE(cs.completed_at) >= p_period_start AND DATE(cs.completed_at) < p_period_start + 7
        WHEN p_period_type = 'MONTHLY' THEN DATE_TRUNC('month', cs.completed_at)::DATE = p_period_start
        ELSE true
    END
    AND CASE 
        WHEN p_entity_type = 'STRATEGY' THEN cs.strategy = p_entity_id
        WHEN p_entity_type = 'AGENT' THEN cs.generated_by_agent = p_entity_id
        ELSE true
    END;
END;
$$ language 'plpgsql';

-- View para sinais ativos (free preview)
CREATE OR REPLACE VIEW cornix_signals_free_view AS
SELECT 
    id,
    signal_id,
    symbol,
    side,
    entry_price,
    entry_range_low,
    entry_range_high,
    leverage,
    margin_type,
    is_premium,
    unlock_price_brl,
    status,
    expires_at,
    strategy,
    timeframe,
    confidence_score,
    created_at,
    -- Campos bloqueados para free: targets e stop são NULL
    NULL::DECIMAL as target_1,
    NULL::DECIMAL as target_2,
    NULL::DECIMAL as target_3,
    NULL::DECIMAL as target_4,
    NULL::DECIMAL as target_5,
    NULL::DECIMAL as stop_loss,
    'LOCKED' as unlock_status
FROM cornix_signals
WHERE status = 'ACTIVE'
AND (expires_at IS NULL OR expires_at > now());

-- View para sinais completos (após pagamento)
CREATE OR REPLACE VIEW cornix_signals_full_view AS
SELECT 
    cs.*,
    CASE 
        WHEN cs.is_premium = false THEN 'FREE'
        WHEN csa.access_granted = true THEN 'UNLOCKED'
        ELSE 'LOCKED'
    END as access_status
FROM cornix_signals cs
LEFT JOIN cornix_signal_access csa ON cs.id = csa.signal_id;

-- View para leaderboard atual
CREATE OR REPLACE VIEW cornix_leaderboard_current AS
SELECT 
    entity_type,
    entity_id,
    entity_name,
    total_signals,
    win_count,
    loss_count,
    win_rate,
    total_profit_percent,
    profit_factor,
    rank_position
FROM cornix_leaderboard
WHERE period_type = 'MONTHLY'
AND period_start = DATE_TRUNC('month', now())::DATE
ORDER BY rank_position;

COMMENT ON TABLE cornix_signals IS 'Trading signals in Cornix-compatible format with premium unlock';
COMMENT ON TABLE cornix_signal_access IS 'Payment records for accessing premium signals';
COMMENT ON TABLE cornix_performance IS 'Detailed performance tracking for each signal';
COMMENT ON TABLE cornix_leaderboard IS 'Aggregated performance rankings by period';
COMMENT ON TABLE cornix_webhook_deliveries IS 'Delivery tracking for Cornix webhooks';
COMMENT ON TABLE pix_payments IS 'PIX payment records for signal unlocking';
