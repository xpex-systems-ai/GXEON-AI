-- ============================================================================
-- GXEON BILLING MIGRATION — Execute TUDO no SQL Editor do Supabase
-- Corrige o sistema de cobrança: alter users + RPC functions
-- ============================================================================

-- ============================================================================
-- PARTE 1: ALTER TABLE users — adicionar colunas de billing
-- ============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS api_key text UNIQUE,
    ADD COLUMN IF NOT EXISTS balance_credits numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS rate_limit_override boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Índice para lookup rápido de API Key (usado pelo gxeonEnforcer)
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users(api_key) WHERE api_key IS NOT NULL;

-- Garantir que service_role pode ler api_key (necessário para auth middleware)
CREATE POLICY IF NOT EXISTS "Service role can read api_key"
    ON public.users FOR SELECT
    TO service_role
    USING (true);

-- ============================================================================
-- PARTE 2: TABELA billing_transactions — auditoria de débitos/créditos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    operation text NOT NULL,
    amount numeric NOT NULL,
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    transaction_type text NOT NULL DEFAULT 'debit',  -- 'debit' | 'credit' | 'refund'
    reason text,
    request_id text,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own transactions"
    ON public.billing_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role full access"
    ON public.billing_transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON public.billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_request_id ON public.billing_transactions(request_id);

-- ============================================================================
-- PARTE 3: RPC FUNCTION — deduct_credits_atomic
-- Dedução atômica de créditos com verificação de saldo
-- Chamada pelo gxeonEnforcer: supabase.rpc('deduct_credits_atomic', {...})
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
    p_api_key text,
    p_amount numeric,
    p_operation text,
    p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user record;
    v_new_balance numeric;
    v_transaction_id uuid;
BEGIN
    -- 1. Buscar usuário pela API Key (lock row com FOR UPDATE para atomicidade)
    SELECT id, balance_credits, status, tier
    INTO v_user
    FROM public.users
    WHERE api_key = p_api_key
    FOR UPDATE;

    -- 2. Validar que usuário existe e está ativo
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'API Key inválida ou não encontrada.'
        );
    END IF;

    IF v_user.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário inativo. Conta suspensa.',
            'current_balance', v_user.balance_credits
        );
    END IF;

    -- 3. Verificar saldo suficiente
    IF v_user.balance_credits < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente para esta operação.',
            'current_balance', v_user.balance_credits,
            'required', p_amount
        );
    END IF;

    -- 4. Deduzir créditos atomicamente
    v_new_balance := v_user.balance_credits - p_amount;

    UPDATE public.users
    SET balance_credits = v_new_balance
    WHERE id = v_user.id;

    -- 5. Registrar transação
    INSERT INTO public.billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_user.id, p_operation, p_amount, v_user.balance_credits, v_new_balance,
        'debit', NULL, p_request_id
    ) RETURNING id INTO v_transaction_id;

    -- 6. Retornar resultado
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user.id,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id,
        'charged', p_amount
    );
END;
$$;

-- ============================================================================
-- PARTE 4: RPC FUNCTION — refund_credits
-- Reembolso de créditos (usado quando operação falha)
-- Chamado pelo gxeonEnforcer: supabase.rpc('refund_credits', {...})
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refund_credits(
    p_transaction_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction record;
    v_new_balance numeric;
    v_refund_id uuid;
BEGIN
    -- 1. Buscar transação original (lock row)
    SELECT id, user_id, amount, balance_before, balance_after, operation
    INTO v_transaction
    FROM public.billing_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    -- 2. Validar que transação existe
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transação não encontrada.'
        );
    END IF;

    -- 3. Creditar de volta o valor (lock user row)
    PERFORM 1 FROM public.users WHERE id = v_transaction.user_id FOR UPDATE;

    UPDATE public.users
    SET balance_credits = balance_credits + v_transaction.amount
    WHERE id = v_transaction.user_id
    RETURNING balance_credits INTO v_new_balance;

    -- 4. Registrar transação de reembolso
    INSERT INTO public.billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_transaction.user_id,
        'refund:' || v_transaction.operation,
        v_transaction.amount,
        v_new_balance - v_transaction.amount,
        v_new_balance,
        'refund',
        p_reason,
        'refund-for-' || v_transaction.id
    ) RETURNING id INTO v_refund_id;

    -- 5. Retornar resultado
    RETURN jsonb_build_object(
        'success', true,
        'refunded_amount', v_transaction.amount,
        'new_balance', v_new_balance,
        'refund_transaction_id', v_refund_id,
        'original_transaction_id', p_transaction_id
    );
END;
$$;

-- ============================================================================
-- PARTE 5: GRANT PERMISSIONS para as RPC functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO service_role;

-- ============================================================================
-- VERIFICAÇÃO — rode isto para confirmar que tudo foi criado
-- ============================================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
