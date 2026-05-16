-- ============================================================================
-- GXEON RELOAD-ONLY — Sem permissões especiais necessárias
-- ============================================================================

-- 1. Verificar search_path
SHOW search_path;

-- 2. Forçar reload via NOTIFY
SELECT pg_notify('pgrst', 'reload config');
SELECT pg_sleep(0.3);
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(0.3);

-- 3. Comment bump para forçar reparse
COMMENT ON TABLE public.users IS 'GXEON users v2 reload';
COMMENT ON TABLE public.billing_transactions IS 'GXEON billing v2 reload';

-- 4. Verificar funções
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_credits_atomic', 'refund_credits');

-- 5. Verificar publicação
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname='supabase_realtime' 
  AND schemaname='public'
ORDER BY tablename;

-- 6. TESTE FUNCIONAL DIRETO (bypass PostgREST)
DO $$
DECLARE
    result jsonb;
    test_user_id uuid;
    test_api_key text := 'reload-test-' || extract(epoch from now())::int;
BEGIN
    -- Criar usuário
    INSERT INTO public.users (name, api_key, balance_credits, tier, status)
    VALUES ('Reload Test', test_api_key, 50.00, 'enterprise', 'active')
    RETURNING id INTO test_user_id;
    
    -- Testar dedução
    result := public.deduct_credits_atomic(test_api_key, 0.05, '/test/reload', 'reload-req-001');
    
    RAISE NOTICE '✅ TESTE RESULT: %', result;
    
    -- Verificar se sucesso
    IF (result->>'success')::boolean THEN
        RAISE NOTICE '✅ Dedução funcionou! Novo saldo: %, TX: %', 
            result->>'new_balance', 
            result->>'transaction_id';
    ELSE
        RAISE NOTICE '❌ Dedução falhou: %', result->>'message';
    END IF;
    
    -- Cleanup
    DELETE FROM public.billing_transactions WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    
    RAISE NOTICE '✅ Cleanup concluido';
END $$;

-- 7. Status
SELECT 'Reload executado. Teste via API em 5 segundos.' as status;
