-- ============================================================================
-- GXEON FORCE REPARSE — Alterar schema para forçar PostgREST a recarregar
-- ============================================================================

-- 1. Adicionar coluna dummy (força reparse)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS _temp_refresh int;
ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS _temp_refresh int;

-- 2. Remover coluna dummy (força reparse novamente)
ALTER TABLE public.users DROP COLUMN IF EXISTS _temp_refresh;
ALTER TABLE public.billing_transactions DROP COLUMN IF EXISTS _temp_refresh;

-- 3. Recriar as funções (força reparse das signatures)
DROP FUNCTION IF EXISTS public.deduct_credits_atomic(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.refund_credits(uuid, text);

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
    SELECT id, balance_credits, status INTO v_user
    FROM public.users WHERE api_key = p_api_key FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'API Key inválida');
    END IF;
    
    IF v_user.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Conta suspensa', 'current_balance', v_user.balance_credits);
    END IF;
    
    IF v_user.balance_credits < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente', 'current_balance', v_user.balance_credits, 'required', p_amount);
    END IF;
    
    v_new_balance := v_user.balance_credits - p_amount;
    UPDATE public.users SET balance_credits = v_new_balance WHERE id = v_user.id;
    
    INSERT INTO public.billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_user.id, p_operation, p_amount, v_user.balance_credits, v_new_balance,
        'debit', NULL, p_request_id
    ) RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object('success', true, 'user_id', v_user.id, 'new_balance', v_new_balance, 'transaction_id', v_transaction_id, 'charged', p_amount);
END;
$$;

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
    SELECT id, user_id, amount, balance_before, balance_after, operation
    INTO v_transaction FROM public.billing_transactions WHERE id = p_transaction_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação não encontrada');
    END IF;
    
    PERFORM 1 FROM public.users WHERE id = v_transaction.user_id FOR UPDATE;
    
    UPDATE public.users
    SET balance_credits = balance_credits + v_transaction.amount
    WHERE id = v_transaction.user_id
    RETURNING balance_credits INTO v_new_balance;
    
    INSERT INTO public.billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_transaction.user_id, 'refund:' || v_transaction.operation, v_transaction.amount,
        v_new_balance - v_transaction.amount, v_new_balance, 'refund', p_reason,
        'refund-for-' || v_transaction.id
    ) RETURNING id INTO v_refund_id;
    
    RETURN jsonb_build_object('success', true, 'refunded_amount', v_transaction.amount, 'new_balance', v_new_balance, 'refund_transaction_id', v_refund_id);
END;
$$;

-- 4. Permissões
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO service_role;

-- 5. Reload
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload config';

-- 6. Status
SELECT 'Schema forçado a reparse. Aguarde 10 segundos e teste.' as status;
