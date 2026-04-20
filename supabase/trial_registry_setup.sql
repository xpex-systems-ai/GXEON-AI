--
-- 🗝️ MASTER KEY TRIAL REGISTRY — SUPREME SYNC
-- Tabela para registro de Trials atômicos de 24h
-- 
-- Arquiteto: Júnior Sena — Sovereign AI Architect
-- Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
--

-- Criar tabela de registro de Trials
CREATE TABLE IF NOT EXISTS trial_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT UNIQUE NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    calls_used INTEGER DEFAULT 0,
    max_calls INTEGER DEFAULT 10,
    ip_address INET,
    user_agent TEXT,
    tier TEXT DEFAULT 'trial_agent',
    features TEXT[] DEFAULT ARRAY['basic_mempool', 'delayed_signals'],
    active BOOLEAN DEFAULT TRUE,
    upgraded_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_trial_api_key ON trial_registry(api_key);
CREATE INDEX IF NOT EXISTS idx_trial_ip ON trial_registry(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_active ON trial_registry(active);
CREATE INDEX IF NOT EXISTS idx_trial_expires ON trial_registry(expires_at);

-- Função para incrementar chamadas do Trial
CREATE OR REPLACE FUNCTION increment_trial_calls(p_api_key TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE trial_registry 
    SET calls_used = calls_used + 1,
        updated_at = NOW()
    WHERE api_key = p_api_key
    RETURNING calls_used INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se Trial está ativo
CREATE OR REPLACE FUNCTION is_trial_active(p_api_key TEXT)
RETURNS TABLE (
    active BOOLEAN,
    expired BOOLEAN,
    calls_remaining INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (tr.expires_at > NOW() AND tr.calls_used < tr.max_calls AND tr.active) as active,
        (tr.expires_at <= NOW()) as expired,
        (tr.max_calls - tr.calls_used) as calls_remaining,
        tr.expires_at
    FROM trial_registry tr
    WHERE tr.api_key = p_api_key;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar Trials expirados (rodar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_trials()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM trial_registry 
        WHERE expires_at < NOW() - INTERVAL '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_trial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_trial_updated_at ON trial_registry;
CREATE TRIGGER tr_trial_updated_at
    BEFORE UPDATE ON trial_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_trial_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE trial_registry ENABLE ROW LEVEL SECURITY;

-- Política: Users podem ver apenas seus próprios Trials (por IP)
CREATE POLICY trial_select_own ON trial_registry
    FOR SELECT
    USING (ip_address = inet_client_addr());

-- Política: System pode inserir (via backend)
CREATE POLICY trial_insert_system ON trial_registry
    FOR INSERT
    WITH CHECK (true);

-- Política: System pode atualizar
CREATE POLICY trial_update_system ON trial_registry
    FOR UPDATE
    USING (true);

-- Comentários
COMMENT ON TABLE trial_registry IS '🗝️ Master Key Trial Registry — 24h Atomic Trial System';
COMMENT ON COLUMN trial_registry.api_key IS 'Chave API única do Trial (gxe_trial_*)';
COMMENT ON COLUMN trial_registry.calls_used IS 'Número de chamadas já utilizadas';
COMMENT ON COLUMN trial_registry.max_calls IS 'Máximo de chamadas (default: 10)';
COMMENT ON COLUMN trial_registry.features IS 'Features disponíveis no Trial';

-- Inserir Trial de exemplo (opcional, para testes)
-- INSERT INTO trial_registry (api_key, expires_at, features) 
-- VALUES ('gxe_trial_demo_1234567890abcdef', NOW() + INTERVAL '24 hours', ARRAY['basic_mempool', 'delayed_signals']);
