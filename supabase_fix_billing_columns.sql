-- ============================================================================
-- GXEON BILLING FIX — Adicionar colunas faltantes em billing_transactions
-- ============================================================================

-- 1. ADICIONAR COLUNAS FALTANTES (se não existirem)
ALTER TABLE public.billing_transactions
    ADD COLUMN IF NOT EXISTS operation text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_before numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_after numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'debit',
    ADD COLUMN IF NOT EXISTS reason text,
    ADD COLUMN IF NOT EXISTS request_id text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. REMOVER DEFAULTS após adicionar (opcional, para não forçar valores)
ALTER TABLE public.billing_transactions ALTER COLUMN operation DROP DEFAULT;
ALTER TABLE public.billing_transactions ALTER COLUMN amount DROP DEFAULT;
ALTER TABLE public.billing_transactions ALTER COLUMN balance_before DROP DEFAULT;
ALTER TABLE public.billing_transactions ALTER COLUMN balance_after DROP DEFAULT;

-- 3. RECRIAR AS FUNÇÕES RPC (para garantir que estejam atualizadas)
DROP FUNCTION IF EXISTS public.deduct_credits_atomic(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.refund_credits(uuid, text);

-- 4. RPC FUNCTION — deduct_credits_atomic
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

-- 5. RPC FUNCTION — refund_credits
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

-- 6. PERMISSÕES
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.billing_transactions TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO service_role;

-- 7. RELOAD DO SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 8. CONFIRMAÇÃO
SELECT 'Colunas adicionadas e funções recriadas com sucesso!' as status;
