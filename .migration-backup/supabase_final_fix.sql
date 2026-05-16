-- ============================================================================
-- GXEON FINAL FIX — Recriar tabelas com nomes únicos (evitar conflito auth.users)
-- ============================================================================

-- 1. Fazer backup dos dados (se houver)
-- CREATE TABLE IF NOT EXISTS public.users_backup AS SELECT * FROM public.users;
-- CREATE TABLE IF NOT EXISTS public.billing_transactions_backup AS SELECT * FROM public.billing_transactions;

-- 2. Dropar tabelas antigas (e dependências)
DROP TABLE IF EXISTS public.billing_transactions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. Dropar funções antigas
DROP FUNCTION IF EXISTS public.deduct_credits_atomic(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.refund_credits(uuid, text);

-- 4. Recriar tabela gxeon_users (nome único, sem conflito)
CREATE TABLE public.gxeon_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name text,
    email text UNIQUE,
    api_key text UNIQUE,
    balance_credits numeric DEFAULT 0,
    tier text DEFAULT 'free',
    status text DEFAULT 'active'
);

-- 5. Recriar tabela gxeon_billing_transactions
CREATE TABLE public.gxeon_billing_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES public.gxeon_users(id),
    operation text,
    amount numeric,
    balance_before numeric,
    balance_after numeric,
    transaction_type text,
    reason text,
    request_id text
);

-- 6. Criar função deduct_credits_atomic
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
    FROM public.gxeon_users WHERE api_key = p_api_key FOR UPDATE;
    
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
    UPDATE public.gxeon_users SET balance_credits = v_new_balance WHERE id = v_user.id;
    
    INSERT INTO public.gxeon_billing_transactions (
        user_id, operation, amount, balance_before, balance_after,
        transaction_type, reason, request_id
    ) VALUES (
        v_user.id, p_operation, p_amount, v_user.balance_credits, v_new_balance,
        'debit', NULL, p_request_id
    ) RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object('success', true, 'user_id', v_user.id, 'new_balance', v_new_balance, 'transaction_id', v_transaction_id, 'charged', p_amount);
END;
$$;

-- 7. Criar função refund_credits
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
    INTO v_transaction FROM public.gxeon_billing_transactions WHERE id = p_transaction_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação não encontrada');
    END IF;
    
    PERFORM 1 FROM public.gxeon_users WHERE id = v_transaction.user_id FOR UPDATE;
    
    UPDATE public.gxeon_users
    SET balance_credits = balance_credits + v_transaction.amount
    WHERE id = v_transaction.user_id
    RETURNING balance_credits INTO v_new_balance;
    
    INSERT INTO public.gxeon_billing_transactions (
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

-- 8. Configurar publicação
ALTER PUBLICATION supabase_realtime ADD TABLE public.gxeon_users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gxeon_billing_transactions;

-- 9. Permissões
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(text, numeric, text, text) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO service_role, anon, authenticated;

-- 10. Criar índices
CREATE INDEX IF NOT EXISTS idx_gxeon_users_api_key ON public.gxeon_users(api_key);
CREATE INDEX IF NOT EXISTS idx_gxeon_billing_user_id ON public.gxeon_billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gxeon_billing_created ON public.gxeon_billing_transactions(created_at);

-- 11. Inserir usuário de teste
INSERT INTO public.gxeon_users (name, api_key, balance_credits, tier, status)
VALUES ('Test User', 'gx-test-key-001', 100.00, 'enterprise', 'active')
ON CONFLICT DO NOTHING;

-- 12. Forçar reload
NOTIFY pgrst, 'reload schema';

-- 13. Status
SELECT 'Tabelas recriadas como gxeon_* com nomes únicos. Aguarde 15 segundos e teste.' as status;
