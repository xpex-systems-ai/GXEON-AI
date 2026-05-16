-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON SIGNAL MARKETPLACE SUPREME - DATABASE SCHEMA
-- Fase 1: Signal Provider + Marketplace Engine Foundation
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SIGNAL PROVIDER LAYER
-- ═══════════════════════════════════════════════════════════════════════════

-- Providers cadastrados (internos + externos)
CREATE TABLE IF NOT EXISTS signal_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('internal', 'external', 'verified', 'premium')),
    webhook_url TEXT,
    api_key VARCHAR(255) UNIQUE,
    contact_email VARCHAR(255),
    
    -- Scoring
    total_signals INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    avg_roi DECIMAL(8,4) DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    provider_score DECIMAL(5,2) DEFAULT 50, -- Calculated overall score
    
    -- Revenue share
    revenue_share_percent DECIMAL(5,2) DEFAULT 30, -- % do provider
    total_revenue_earned DECIMAL(15,2) DEFAULT 0,
    pending_payout DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_revenue_share CHECK (revenue_share_percent BETWEEN 0 AND 100)
);

-- Schema padrão de sinal (unificado para todos providers)
CREATE TABLE IF NOT EXISTS unified_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(100) UNIQUE NOT NULL, -- GX-XXXXXXXX format
    
    -- Provider info
    provider_id UUID REFERENCES signal_providers(id),
    provider_name VARCHAR(255),
    
    -- Core signal data (schema padrão)
    pair VARCHAR(50) NOT NULL, -- BTC/USDT
    type VARCHAR(10) NOT NULL CHECK (type IN ('LONG', 'SHORT')),
    entry_price DECIMAL(18,8) NOT NULL,
    target_price DECIMAL(18,8) NOT NULL,
    stop_price DECIMAL(18,8) NOT NULL,
    
    -- Metadata
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    strategy VARCHAR(50) NOT NULL CHECK (strategy IN ('arbitrage', 'scalp', 'trend', 'breakout', 'momentum')),
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    timeframe VARCHAR(10), -- 5m, 15m, 1h, 4h
    
    -- Calculated fields
    profit_potential DECIMAL(8,4), -- %
    risk_reward_ratio DECIMAL(5,2),
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    
    -- Tags para tiers
    tags TEXT[] DEFAULT '{}', -- ['PREMIUM', 'EARLY', 'HIGH-RISK']
    tier_access VARCHAR(20) DEFAULT 'FREE' CHECK (tier_access IN ('FREE', 'PRO', 'ENTERPRISE')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'hit_target', 'hit_stop', 'cancelled')),
    result VARCHAR(20) CHECK (result IN ('pending', 'win', 'loss', 'expired')),
    
    -- Raw data do provider (JSONB flexível)
    raw_data JSONB,
    
    -- Performance tracking
    actual_profit_loss DECIMAL(8,4), -- % realizado quando fecha
    executed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT valid_confidence CHECK (confidence BETWEEN 0 AND 100)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_signals_provider ON unified_signals(provider_id);
CREATE INDEX IF NOT EXISTS idx_unified_signals_status ON unified_signals(status);
CREATE INDEX IF NOT EXISTS idx_unified_signals_tier ON unified_signals(tier_access);
CREATE INDEX IF NOT EXISTS idx_unified_signals_created ON unified_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_signals_valid_until ON unified_signals(valid_until);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SIGNAL MARKETPLACE ENGINE
-- ═══════════════════════════════════════════════════════════════════════════

-- Ranking cache (atualizado por trigger/function)
CREATE TABLE IF NOT EXISTS signal_rankings (
    signal_id UUID PRIMARY KEY REFERENCES unified_signals(id) ON DELETE CASCADE,
    
    -- Ranking scores
    confidence_score DECIMAL(5,2), -- peso 30%
    provider_score DECIMAL(5,2), -- peso 25%
    timing_score DECIMAL(5,2), -- peso 20% (quão recente)
    profit_score DECIMAL(5,2), -- peso 15%
    risk_score DECIMAL(5,2), -- peso 10%
    
    -- Overall ranking (0-100)
    total_score DECIMAL(5,2) NOT NULL,
    rank_position INTEGER,
    
    -- Categorização
    category VARCHAR(20) CHECK (category IN ('HOT', 'TRENDING', 'STANDARD', 'RISKY')),
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT valid_total_score CHECK (total_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_rankings_score ON signal_rankings(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_category ON signal_rankings(category);

-- Signal dispatch log (para tracking de entrega)
CREATE TABLE IF NOT EXISTS signal_dispatch_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES unified_signals(id),
    
    -- Quem recebeu
    user_id VARCHAR(255),
    telegram_chat_id BIGINT,
    api_key VARCHAR(255),
    
    -- Como recebeu
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('telegram', 'api', 'webhook', 'b2b')),
    tier_delivered VARCHAR(20) NOT NULL,
    
    -- Quando
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    
    -- Delay aplicado (para FREE tier)
    delay_seconds INTEGER DEFAULT 0,
    
    -- Billing
    billed BOOLEAN DEFAULT false,
    billing_amount DECIMAL(10,4),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_dispatch_signal ON signal_dispatch_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_user ON signal_dispatch_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_time ON signal_dispatch_log(dispatched_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. MONETIZATION ENGINE
-- ═══════════════════════════════════════════════════════════════════════════

-- Subscriptions (integra com PIX existente)
CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    
    -- Tier
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('FREE', 'PRO', 'ENTERPRISE')),
    
    -- Pagamento PIX (referência ao sistema existente)
    pix_payment_id VARCHAR(255),
    last_payment_at TIMESTAMPTZ,
    next_payment_due TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,
    
    -- Limits
    daily_signals_used INTEGER DEFAULT 0,
    daily_signals_limit INTEGER DEFAULT 5, -- FREE default
    monthly_spent DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    UNIQUE(user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON marketplace_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON marketplace_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON marketplace_subscriptions(is_active) WHERE is_active = true;

-- Pay-per-signal transactions
CREATE TABLE IF NOT EXISTS pay_per_signal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    signal_id UUID REFERENCES unified_signals(id),
    
    -- Valor
    amount_brl DECIMAL(10,2) NOT NULL, -- R$ 1.00 por sinal premium
    amount_usd DECIMAL(10,4),
    
    -- Pagamento
    pix_transaction_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    paid_at TIMESTAMPTZ,
    
    -- Revenue split
    provider_id UUID REFERENCES signal_providers(id),
    provider_earnings DECIMAL(10,2) DEFAULT 0,
    platform_earnings DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider payouts
CREATE TABLE IF NOT EXISTS provider_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES signal_providers(id),
    
    -- Período
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Sinais no período
    total_signals INTEGER DEFAULT 0,
    winning_signals INTEGER DEFAULT 0,
    
    -- Revenue
    total_revenue DECIMAL(15,2) DEFAULT 0,
    provider_share DECIMAL(15,2) DEFAULT 0,
    platform_share DECIMAL(15,2) DEFAULT 0,
    
    -- Pagamento
    payout_status VARCHAR(20) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50), -- PIX, crypto, etc
    payment_reference TEXT,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. PROOF OF VALUE SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Signal results tracking (validação de acerto/erro)
CREATE TABLE IF NOT EXISTS signal_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID UNIQUE REFERENCES unified_signals(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES signal_providers(id),
    
    -- Resultado
    result VARCHAR(20) NOT NULL CHECK (result IN ('win', 'loss', 'expired', 'cancelled')),
    result_source VARCHAR(50) DEFAULT 'manual' CHECK (result_source IN ('manual', 'price_oracle', 'exchange_api', 'admin')),
    
    -- Prices
    highest_price_reached DECIMAL(18,8),
    lowest_price_reached DECIMAL(18,8),
    exit_price DECIMAL(18,8),
    
    -- Performance
    actual_profit_loss DECIMAL(8,4), -- % real
    max_drawdown DECIMAL(8,4), -- % pior momento
    time_to_result_minutes INTEGER,
    
    -- Validação
    validated_by VARCHAR(255),
    validated_at TIMESTAMPTZ,
    evidence_url TEXT, -- screenshot, tx hash, etc
    
    -- Notas
    notes TEXT,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_provider ON signal_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_results_result ON signal_results(result);

-- Leaderboard (cache calculado)
CREATE TABLE IF NOT EXISTS signal_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de ranking
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('top_signals', 'top_providers', 'best_roi', 'most_accurate')),
    
    -- Ranked entity
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('signal', 'provider')),
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    
    -- Stats
    rank_position INTEGER NOT NULL,
    score DECIMAL(8,2),
    win_rate DECIMAL(5,2),
    total_signals INTEGER,
    avg_roi DECIMAL(8,4),
    
    -- Snapshot date
    calculated_for_date DATE NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(period, category, rank_position, calculated_for_date)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON signal_leaderboard(period, calculated_for_date DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON signal_leaderboard(category);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DISTRIBUTION LAYER
-- ═══════════════════════════════════════════════════════════════════════════

-- B2B API Clients
CREATE TABLE IF NOT EXISTS b2b_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    
    -- Plan
    plan_tier VARCHAR(20) DEFAULT 'STARTER' CHECK (plan_tier IN ('STARTER', 'GROWTH', 'ENTERPRISE')),
    monthly_limit INTEGER,
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Billing
    monthly_fee DECIMAL(10,2),
    overage_rate DECIMAL(8,4), -- per signal
    
    -- Webhook config
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    webhook_events TEXT[] DEFAULT '{signal_new, signal_result}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES b2b_clients(id),
    event_type VARCHAR(50) NOT NULL,
    
    payload JSONB NOT NULL,
    
    -- Delivery
    attempt_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    http_status INTEGER,
    response_body TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_client ON webhook_delivery_log(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_delivery_log(status);

-- Cornix copy-trading configs
CREATE TABLE IF NOT EXISTS cornix_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    
    -- Cornix integration
    cornix_api_key VARCHAR(255),
    exchange_connected VARCHAR(50), -- binance, bybit, etc
    
    -- Auto-trading settings
    auto_trade_enabled BOOLEAN DEFAULT false,
    max_position_size_usd DECIMAL(12,2) DEFAULT 100,
    risk_per_trade DECIMAL(5,2) DEFAULT 2, -- %
    
    -- Filters
    min_confidence INTEGER DEFAULT 80,
    allowed_strategies TEXT[] DEFAULT '{arbitrage,trend}',
    max_risk_level VARCHAR(10) DEFAULT 'medium',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ACQUISITION ENGINE
-- ═══════════════════════════════════════════════════════════════════════════

-- Referral system
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id VARCHAR(255) NOT NULL,
    referred_user_id VARCHAR(255) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
    
    -- Recompensa
    reward_type VARCHAR(30) DEFAULT 'free_days' CHECK (reward_type IN ('free_days', 'cash', 'signals')),
    reward_value INTEGER DEFAULT 7, -- 7 dias grátis
    rewarded_at TIMESTAMPTZ,
    
    -- Conversion tracking
    converted_at TIMESTAMPTZ,
    conversion_value DECIMAL(10,2), -- valor da conversão em R$
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(referrer_user_id, referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_tracking(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_referred ON referral_tracking(referred_user_id);

-- Antenna bot campaigns
CREATE TABLE IF NOT EXISTS antenna_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    
    -- Config
    target_groups TEXT[] NOT NULL, -- IDs ou nomes dos grupos
    message_template TEXT NOT NULL,
    
    -- Signal config
    signals_to_send INTEGER DEFAULT 3, -- quantos sinais FREE enviar
    signal_delay_minutes INTEGER DEFAULT 10, -- delay para criar escassez
    
    -- CTA
    cta_text VARCHAR(500) DEFAULT '⚡ Acesso TEMPO REAL → @gxeon_bot',
    landing_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    -- Stats
    messages_sent INTEGER DEFAULT 0,
    clicks_generated INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Antenna activity log
CREATE TABLE IF NOT EXISTS antenna_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES antenna_campaigns(id),
    
    action VARCHAR(50) NOT NULL, -- 'message_sent', 'signal_shared', 'user_clicked'
    target_group VARCHAR(255),
    user_id VARCHAR(255),
    
    -- Content
    signal_id UUID REFERENCES unified_signals(id),
    message_text TEXT,
    
    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to update provider score
CREATE OR REPLACE FUNCTION calculate_provider_score(provider_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_sigs INTEGER;
    wins INTEGER;
    avg_return DECIMAL;
    new_score DECIMAL;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE result = 'win'),
        COALESCE(AVG(actual_profit_loss), 0)
    INTO total_sigs, wins, avg_return
    FROM signal_results sr
    JOIN unified_signals us ON sr.signal_id = us.id
    WHERE us.provider_id = provider_uuid;
    
    -- Score baseado em: win_rate (40%), avg_roi (40%), volume (20%)
    IF total_sigs > 0 THEN
        new_score := (wins::DECIMAL / total_sigs * 40) + 
                     (LEAST(avg_return * 10, 40)) + 
                     (LEAST(total_sigs / 10, 20));
    ELSE
        new_score := 50; -- Score default para novos
    END IF;
    
    UPDATE signal_providers 
    SET provider_score = new_score,
        total_signals = total_sigs,
        win_rate = CASE WHEN total_sigs > 0 THEN (wins::DECIMAL / total_sigs * 100) ELSE 0 END,
        avg_roi = avg_return,
        updated_at = NOW()
    WHERE id = provider_uuid;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular ranking quando sinal é criado
CREATE OR REPLACE FUNCTION calculate_signal_ranking()
RETURNS TRIGGER AS $$
DECLARE
    provider_s DECIMAL;
    timing_s DECIMAL;
    profit_s DECIMAL;
    risk_s DECIMAL;
    total_s DECIMAL;
    cat VARCHAR(20);
BEGIN
    -- Get provider score
    SELECT provider_score INTO provider_s
    FROM signal_providers WHERE id = NEW.provider_id;
    
    -- Calculate component scores (0-100)
    provider_s := COALESCE(provider_s, 50);
    timing_s := 100 - EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600 * 10; -- Decai com tempo
    timing_s := GREATEST(timing_s, 0);
    profit_s := LEAST(NEW.profit_potential * 5, 100); -- Até 20% = 100 pontos
    risk_s := CASE NEW.risk_level 
        WHEN 'low' THEN 80
        WHEN 'medium' THEN 50
        WHEN 'high' THEN 20
        ELSE 50
    END;
    
    -- Weighted total (confidence 30%, provider 25%, timing 20%, profit 15%, risk 10%)
    total_s := (NEW.confidence * 0.30) + 
               (provider_s * 0.25) + 
               (timing_s * 0.20) + 
               (profit_s * 0.15) + 
               (risk_s * 0.10);
    
    -- Category
    cat := CASE 
        WHEN total_s >= 80 THEN 'HOT'
        WHEN total_s >= 65 THEN 'TRENDING'
        WHEN total_s >= 40 THEN 'STANDARD'
        ELSE 'RISKY'
    END;
    
    -- Upsert ranking
    INSERT INTO signal_rankings (
        signal_id, confidence_score, provider_score, timing_score, 
        profit_score, risk_score, total_score, category, expires_at
    ) VALUES (
        NEW.id, NEW.confidence, provider_s, timing_s, profit_s, risk_s, total_s, cat, NEW.valid_until
    )
    ON CONFLICT (signal_id) DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        provider_score = EXCLUDED.provider_score,
        timing_score = EXCLUDED.timing_score,
        profit_score = EXCLUDED.profit_score,
        risk_score = EXCLUDED.risk_score,
        total_score = EXCLUDED.total_score,
        category = EXCLUDED.category,
        calculated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on signal insert/update
DROP TRIGGER IF EXISTS trigger_calc_ranking ON unified_signals;
CREATE TRIGGER trigger_calc_ranking
    AFTER INSERT OR UPDATE ON unified_signals
    FOR EACH ROW
    EXECUTE FUNCTION calculate_signal_ranking();

-- Function to cleanup expired signals
CREATE OR REPLACE FUNCTION cleanup_expired_signals()
RETURNS void AS $$
BEGIN
    UPDATE unified_signals 
    SET status = 'expired'
    WHERE valid_until < NOW() 
    AND status = 'active'
    AND result = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security) - configure políticas depois
ALTER TABLE unified_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_subscriptions ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Provider interno GXEON
INSERT INTO signal_providers (name, provider_type, revenue_share_percent, is_verified, verification_date)
VALUES ('GXEON Internal', 'internal', 50, true, NOW())
ON CONFLICT DO NOTHING;

-- Provider exemplo externo
INSERT INTO signal_providers (name, provider_type, webhook_url, revenue_share_percent)
VALUES ('Alpha Signals Pro', 'external', 'https://alphasignals.io/webhook/gxeon', 30)
ON CONFLICT DO NOTHING;

-- Tiers de subscription
-- FREE tier default já configurado na estrutura

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE unified_signals IS 'Schema unificado de sinais - TODOS providers usam este formato';
COMMENT ON TABLE signal_providers IS 'Providers cadastrados com scoring automático';
COMMENT ON TABLE signal_rankings IS 'Cache de ranking calculado automaticamente via trigger';
COMMENT ON TABLE signal_dispatch_log IS 'Log completo de entrega de sinais por canal';
COMMENT ON TABLE signal_results IS 'Validação real de resultado (win/loss) com evidence';

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════
