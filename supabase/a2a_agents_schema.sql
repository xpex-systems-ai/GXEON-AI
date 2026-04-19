-- ═══════════════════════════════════════════════════════════════════════════
-- 🤖 A2A AGENTS SCHEMA v20.0
-- Registro e billing de agentes autônomos
-- Protocolo: JSON-RPC 2.0 + Streaming Micropayments
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela: Registro de Agentes Autônomos
CREATE TABLE IF NOT EXISTS a2a_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key_hash TEXT NOT NULL UNIQUE, -- Hash SHA256 da chave (nunca armazenar plaintext)
    agent_id TEXT NOT NULL UNIQUE, -- ID público do agente (16 chars)
    
    -- Classificação
    tier TEXT NOT NULL DEFAULT 'standard', -- free, standard, premium, enterprise
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended, banned
    
    -- Capacidades
    allowed_channels TEXT[] DEFAULT ARRAY['liquidity_sniffer'], -- canais autorizados
    rate_limit_per_minute INTEGER DEFAULT 1000,
    
    -- Billing (micropagamentos streaming)
    streaming_contract_address TEXT, -- Endereço Superfluid/Sablier
    payment_token TEXT DEFAULT 'USDC',
    current_balance DECIMAL(18,6) DEFAULT 0,
    total_paid DECIMAL(18,6) DEFAULT 0,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_a2a_agents_tier ON a2a_agents(tier);
CREATE INDEX IF NOT EXISTS idx_a2a_agents_status ON a2a_agents(status);
CREATE INDEX IF NOT EXISTS idx_a2a_agents_last_seen ON a2a_agents(last_seen_at DESC);

COMMENT ON TABLE a2a_agents IS 'Registro de agentes autônomos A2A';

-- ═══════════════════════════════════════════════════════════════════════════
-- Tabela: Log de Atividade de Agentes (alta frequência)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS a2a_agent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES a2a_agents(agent_id),
    
    -- Request
    request_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT,
    
    -- Performance
    request_at TIMESTAMPTZ DEFAULT NOW(),
    response_at TIMESTAMPTZ,
    latency_ms INTEGER,
    
    -- Payload
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Resultado
    status_code INTEGER,
    error_code TEXT,
    
    -- Custo (para billing streaming)
    signals_consumed INTEGER DEFAULT 0,
    cost_usd DECIMAL(18,8) DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'
);

-- Índices para análise
CREATE INDEX IF NOT EXISTS idx_a2a_activity_agent ON a2a_agent_activity(agent_id, request_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_activity_endpoint ON a2a_agent_activity(endpoint);
CREATE INDEX IF NOT EXISTS idx_a2a_activity_request_at ON a2a_agent_activity(request_at DESC);

COMMENT ON TABLE a2a_agent_activity IS 'Log de alta frequência de requests A2A';

-- ═══════════════════════════════════════════════════════════════════════════
-- Tabela: Sinais Consumidos (billing granular)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS a2a_signals_consumed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES a2a_agents(agent_id),
    
    -- Sinal
    signal_type TEXT NOT NULL, -- liquidity, whale, mempool
    signal_id TEXT NOT NULL,
    signal_timestamp TIMESTAMPTZ,
    
    -- Conteúdo (para auditoria)
    signal_payload JSONB,
    
    -- Billing
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    cost_usd DECIMAL(18,8) DEFAULT 0,
    
    -- Referência à atividade
    activity_id UUID REFERENCES a2a_agent_activity(id)
);

CREATE INDEX IF NOT EXISTS idx_a2a_signals_agent ON a2a_signals_consumed(agent_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_signals_type ON a2a_signals_consumed(signal_type);

COMMENT ON TABLE a2a_signals_consumed IS 'Registro granular de sinais consumidos para billing';

-- ═══════════════════════════════════════════════════════════════════════════
-- Tabela: Streaming Payment Channels (Superfluid/Sablier)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS a2a_streaming_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES a2a_agents(agent_id),
    
    -- Configuração do stream
    protocol TEXT NOT NULL DEFAULT 'SUPERFLUID', -- SUPERFLUID, SABLIER
    contract_address TEXT NOT NULL,
    sender_address TEXT NOT NULL, -- Quem está pagando
    receiver_address TEXT NOT NULL, -- Nosso treasury
    
    -- Token
    token_address TEXT NOT NULL, -- USDC on Arbitrum
    token_symbol TEXT DEFAULT 'USDC',
    
    -- Flow
    flow_rate_per_second DECIMAL(36,18) NOT NULL,
    total_streamed DECIMAL(18,6) DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active', -- active, paused, closed
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE a2a_streaming_channels IS 'Canais de pagamento streaming ativos';

-- ═══════════════════════════════════════════════════════════════════════════
-- Políticas RLS
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE a2a_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_signals_consumed ENABLE ROW LEVEL SECURITY;

-- Service role pode tudo
CREATE POLICY "Service can manage agents" ON a2a_agents FOR ALL TO service_role USING (true);
CREATE POLICY "Service can log activity" ON a2a_agent_activity FOR ALL TO service_role USING (true);
CREATE POLICY "Service can log signals" ON a2a_signals_consumed FOR ALL TO service_role USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Funções RPC para Billing
-- ═══════════════════════════════════════════════════════════════════════════

-- Deduzir créditos de agente
CREATE OR REPLACE FUNCTION deduct_agent_credits(
    p_agent_id TEXT,
    p_amount DECIMAL
) RETURNS TABLE(success BOOLEAN, new_balance DECIMAL, message TEXT) AS $$
DECLARE
    v_current DECIMAL;
    v_new DECIMAL;
BEGIN
    SELECT current_balance INTO v_current
    FROM a2a_agents
    WHERE agent_id = p_agent_id
    FOR UPDATE;
    
    IF v_current IS NULL THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'AGENT_NOT_FOUND'::TEXT;
        RETURN;
    END IF;
    
    IF v_current < p_amount THEN
        RETURN QUERY SELECT false, v_current, 'INSUFFICIENT_CREDITS'::TEXT;
        RETURN;
    END IF;
    
    v_new := v_current - p_amount;
    
    UPDATE a2a_agents
    SET current_balance = v_new, updated_at = NOW()
    WHERE agent_id = p_agent_id;
    
    RETURN QUERY SELECT true, v_new, 'SUCCESS'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Registrar consumo de sinal
CREATE OR REPLACE FUNCTION log_signal_consumed(
    p_agent_id TEXT,
    p_signal_type TEXT,
    p_signal_id TEXT,
    p_cost_usd DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO a2a_signals_consumed (agent_id, signal_type, signal_id, cost_usd)
    VALUES (p_agent_id, p_signal_type, p_signal_id, p_cost_usd);
    
    -- Atualizar saldo
    UPDATE a2a_agents
    SET current_balance = current_balance - p_cost_usd,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- Views para Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- View: Agentes ativos nas últimas 24h
CREATE OR REPLACE VIEW a2a_active_agents_24h AS
SELECT 
    tier,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 hour') as active_now,
    SUM(current_balance) as total_balance
FROM a2a_agents
WHERE last_seen_at > NOW() - INTERVAL '24 hours'
GROUP BY tier;

-- View: Revenue streaming por hora
CREATE OR REPLACE VIEW a2a_revenue_hourly AS
SELECT 
    DATE_TRUNC('hour', consumed_at) as hour,
    signal_type,
    COUNT(*) as signals_sold,
    SUM(cost_usd) as revenue_usd
FROM a2a_signals_consumed
WHERE consumed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', consumed_at), signal_type
ORDER BY hour DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🚀 A2A SCHEMA v20.0 PRONTO
-- ═══════════════════════════════════════════════════════════════════════════
