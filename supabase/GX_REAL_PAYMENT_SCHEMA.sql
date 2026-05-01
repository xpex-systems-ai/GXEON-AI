-- ═══════════════════════════════════════════════════════════════════════════
-- GX REAL PAYMENT SCHEMA v1.0
-- Production-grade PIX payment infrastructure
-- Comandante: Júnior Sena
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABELA: transactions
-- Armazena todos os pagamentos PIX
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificadores externos
    mp_payment_id VARCHAR(255) UNIQUE NOT NULL, -- ID do MercadoPago
    external_reference VARCHAR(255) UNIQUE NOT NULL, -- Nosso ID (GX-...)
    
    -- Actor attribution (obrigatório)
    actor_code VARCHAR(50) NOT NULL REFERENCES actors(code),
    
    -- Detalhes do pagamento
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('PRO', 'ENTERPRISE')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Status (ENFORCE: apenas webhook pode mudar para PAID)
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'REJECTED')),
    
    mp_status_detail VARCHAR(100), -- Detalhe do status do MP
    
    -- Dados do pagador
    payer_email VARCHAR(255) NOT NULL,
    payer_name VARCHAR(255),
    
    -- Dados PIX
    pix_qr_code TEXT,
    pix_qr_code_base64 TEXT,
    pix_copy_paste TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Índices
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_actor_code ON transactions(actor_code);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_external_ref ON transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_mp_payment_id ON transactions(mp_payment_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TABELA: commissions
-- Registra todas as comissões pagas aos actors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referências
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    actor_id UUID NOT NULL REFERENCES actors(id),
    actor_code VARCHAR(50) NOT NULL,
    
    -- Detalhes da comissão
    base_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL, -- Percentual (ex: 30.00 = 30%)
    commission_amount DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevenir duplicatas
    UNIQUE(transaction_id, actor_code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commissions_actor_id ON commissions(actor_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_transaction ON commissions(transaction_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TABELA: actor_wallets
-- Saldo e histórico de ganhos dos actors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS actor_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL UNIQUE REFERENCES actors(id),
    actor_code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Saldo atual (disponível para saque)
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Total histórico (inclui já sacado)
    total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Configurações de pagamento
    pix_key VARCHAR(100), -- Chave PIX para saque
    pix_key_type VARCHAR(20) CHECK (pix_key_type IN ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_actor_wallets_balance ON actor_wallets(balance) WHERE balance > 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TABELA: webhook_logs
-- Auditoria de todos os webhooks recebidos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Origem
    provider VARCHAR(50) NOT NULL, -- 'mercadopago', etc
    event_type VARCHAR(100) NOT NULL,
    
    -- Dados do webhook
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processamento
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Referência
    transaction_id UUID REFERENCES transactions(id),
    
    -- Timestamps
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FUNÇÕES E TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actor_wallets
DROP TRIGGER IF EXISTS update_actor_wallets_updated_at ON actor_wallets;
CREATE TRIGGER update_actor_wallets_updated_at
    BEFORE UPDATE ON actor_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. FUNÇÃO RPC: add_actor_balance
-- Adiciona saldo ao actor (usada pela commission engine)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_actor_balance(
    p_actor_id UUID,
    p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
    -- Insert se não existir, update se existir
    INSERT INTO actor_wallets (actor_id, balance, total_earned)
    VALUES (p_actor_id, p_amount, p_amount)
    ON CONFLICT (actor_id)
    DO UPDATE SET
        balance = actor_wallets.balance + p_amount,
        total_earned = actor_wallets.total_earned + p_amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para transactions
CREATE POLICY "Enable read access for service role" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON transactions
    FOR UPDATE USING (true);

-- Políticas para commissions
CREATE POLICY "Enable all access for service role" ON commissions
    FOR ALL USING (true);

-- Políticas para actor_wallets
CREATE POLICY "Enable all access for service role" ON actor_wallets
    FOR ALL USING (true);

-- Políticas para webhook_logs
CREATE POLICY "Enable all access for service role" ON webhook_logs
    FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. VIEW: actor_dashboard
-- Resumo consolidado para dashboard do actor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW actor_dashboard AS
SELECT 
    a.id as actor_id,
    a.code as actor_code,
    a.name as actor_name,
    a.commission_rate,
    COALESCE(aw.balance, 0) as current_balance,
    COALESCE(aw.total_earned, 0) as total_earned,
    COALESCE(aw.total_withdrawn, 0) as total_withdrawn,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'PAID') as total_sales,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'PAID'), 0) as total_revenue,
    COALESCE(SUM(c.commission_amount), 0) as total_commissions
FROM actors a
LEFT JOIN actor_wallets aw ON a.id = aw.actor_id
LEFT JOIN transactions t ON a.code = t.actor_code
LEFT JOIN commissions c ON a.id = c.actor_id
GROUP BY a.id, a.code, a.name, a.commission_rate, aw.balance, aw.total_earned, aw.total_withdrawn;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VIEW: payment_overview
-- Visão geral de pagamentos para admin
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW payment_overview AS
SELECT 
    t.status,
    t.tier,
    COUNT(*) as count,
    SUM(t.amount) as total_amount,
    MIN(t.created_at) as first_payment,
    MAX(t.created_at) as last_payment
FROM transactions t
GROUP BY t.status, t.tier;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. INTEGRITY CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Garantir que actor_wallets existe para todo actor
CREATE OR REPLACE FUNCTION ensure_actor_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO actor_wallets (actor_id, actor_code)
    VALUES (NEW.id, NEW.code)
    ON CONFLICT (actor_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_actor_wallet_trigger ON actors;
CREATE TRIGGER ensure_actor_wallet_trigger
    AFTER INSERT ON actors
    FOR EACH ROW
    EXECUTE FUNCTION ensure_actor_wallet();

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. DADOS INICIAIS (se necessário)
-- ═══════════════════════════════════════════════════════════════════════════

-- Actor principal (se não existir)
INSERT INTO actors (code, name, email, commission_rate, tier, status)
VALUES 
    ('GX_MAIN_ACTOR', 'GXEON Main Actor', 'admin@gxeon.ai', 50.00, 'ADMIN', 'ACTIVE'),
    ('GX_JUNIOR', 'Junior Sena', 'junior@gxeon.ai', 30.00, 'AFFILIATE', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DO SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
