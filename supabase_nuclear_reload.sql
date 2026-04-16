-- ============================================================================
-- GXEON NUCLEAR RELOAD — Forçar reconexão completa do PostgREST
-- ============================================================================

-- 1. Matar processos PostgREST (força reconexão com schema atualizado)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE application_name ILIKE '%postgrest%'
  AND pid != pg_backend_pid();

-- 2. Aguardar um instante (simulado via comentário)
-- Aguardar 2-3 segundos antes de testar novamente

-- 3. Verificar search_path do banco
SHOW search_path;

-- 4. Forçar reload explícito
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- 5. Comment bump para forçar reparse das tabelas
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('users', 'billing_transactions')
    LOOP
        EXECUTE format('COMMENT ON TABLE public.%I IS %L', tbl, 'Updated at ' || now());
    END LOOP;
END $$;

-- 6. Verificar se funções têm SECURITY DEFINER correto
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_function_identity_arguments(p.oid) as args,
    pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_credits_atomic', 'refund_credits');

-- 7. Verificar se tabelas estão na publicação correta
SELECT pubname, tablename 
FROM pg_publication_tables 
WHERE schemaname='public' 
  AND tablename IN ('users', 'billing_transactions');

-- 8. Teste direto na função (bypass PostgREST)
DO $$
DECLARE
    result jsonb;
    test_user_id uuid;
BEGIN
    -- Criar usuário teste
    INSERT INTO public.users (name, api_key, balance_credits, tier, status)
    VALUES ('Nuclear Test', 'nuclear-test-key', 100.00, 'enterprise', 'active')
    ON CONFLICT (api_key) DO UPDATE SET balance_credits = 100.00
    RETURNING id INTO test_user_id;
    
    -- Testar dedução
    result := public.deduct_credits_atomic('nuclear-test-key', 0.05, '/test/nuclear', 'nuclear-req-001');
    
    RAISE NOTICE 'Test result: %', result;
    
    -- Cleanup
    DELETE FROM public.billing_transactions WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE api_key = 'nuclear-test-key';
END $$;

-- 9. Confirmação final
SELECT 'Nuclear reload executado. Aguarde 5 segundos e teste via API.' as status;
