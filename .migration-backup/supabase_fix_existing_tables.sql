-- ============================================================================
-- GXEON BILLING FIX — Alterar tabela users existente + criar billing_transactions
-- ============================================================================

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA users (se já existe sem elas)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS api_key text UNIQUE,
    ADD COLUMN IF NOT EXISTS balance_credits numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS rate_limit_override boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. ÍNDICE para api_key (performance crítica)
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users(api_key) WHERE api_key IS NOT NULL;

-- 3. TABELA BILLING_TRANSACTIONS (criar se não existir)
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    operation text NOT NULL,
    amount numeric NOT NULL,
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    transaction_type text DEFAULT 'debit',
    reason text,
    request_id text,
    created_at timestamptz DEFAULT now()
);

-- 4. ÍNDICES para billing_transactions
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON public.billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_request_id ON public.billing_transactions(request_id);

-- 5. DROP + RECRIAR FUNÇÕES RPC (garantir versão correta)
DROP FUNCTION IF EXISTS public.deduct_credits_atomic(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.refund_credits(uuid, text);

-- 6. RPC FUNCTION — deduct_credits_atomic
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
    p_api_key text,
    p_amount numeric,
    p_operation text,
    p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user record;
    v_new_balance numeric;
    v_transaction_id uuid;
BEGIN
    -- Buscar usuário com lock de row
    SELECT id, balance_credits, status
    INTO v_user
    FROM public.users
    WHERE api_key = p_api_key
    FOR UPDATE;
    
    -- Validar existência
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'API Key inválida ou não encontrada.'
        );
    END IF;
    
    -- Validar status ativo
    IF v_user.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário inativo. Conta suspensa.',
            'current_balance', v_user.balance_credits
        );
    END IF;
    
    -- Validar saldo
    IF v_user.balance_credits < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente para esta operação.',
            'current_balance', v_user.balance_credits,
            'required', p_amount
        );
    END IF;
    
    -- Deduzir créditos
    v_new_balance := v_user.balance_credits - p_amount;
    UPDATE public.users SET balance_credits = v_new_balance WHERE id = v_user.id;
    
    -- Registrar transação
    INSERT INTO public.billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_user.id, p_operation, p_amount, v_user.balance_credits, v_new_balance,
        'debit', NULL, p_request_id
    ) RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user.id,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id,
        'charged', p_amount
    );
END;
$$;

-- 7. RPC FUNCTION — refund_credits
CREATE OR REPLACE FUNCTION public.refund_credits(
    p_transaction_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction record;
    v_new_balance numeric;
    v_refund_id uuid;
BEGIN
    -- Buscar transação original
    SELECT id, user_id, amount, balance_before, balance_after, operation
    INTO v_transaction
    FROM public.billing_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transação não encontrada.'
        );
    END IF;
    
    -- Creditar de volta
    PERFORM 1 FROM public.users WHERE id = v_transaction.user_id FOR UPDATE;
    
    UPDATE public.users
    SET balance_credits = balance_credits + v_transaction.amount
    WHERE id = v_transaction.user_id
    RETURNING balance_credits INTO v_new_balance;
    
    -- Registrar reembolso
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
    
    RETURN jsonb_build_object(
        'success', true,
        'refunded_amount', v_transaction.amount,
        'new_balance', v_new_balance,
        'refund_transaction_id', v_refund_id,
        'original_transaction_id', p_transaction_id
    );
END;
$$;

-- 8. PERMISSÕES
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.billing_transactions TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO service_role;

-- 9. RELOAD DO SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 10. CONFIRMAÇÃO
SELECT 'Migração concluída com sucesso!' as status;
