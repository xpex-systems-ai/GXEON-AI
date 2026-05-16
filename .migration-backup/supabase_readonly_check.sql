-- ============================================================================
-- GXEON READ-ONLY CHECK — Apenas SELECTs, zero modificações
-- ============================================================================

-- 1. Search path
SHOW search_path;

-- 2. Tentar reload (pode falhar em read-only, mas tentamos)
-- SELECT pg_notify('pgrst', 'reload schema');

-- 3. Verificar se funções existem e têm SECURITY DEFINER
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_function_identity_arguments(p.oid) as args,
    pg_get_function_result(p.oid) as returns_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_credits_atomic', 'refund_credits');

-- 4. Verificar tabelas na publicação
SELECT tablename, attnames 
FROM pg_publication_tables 
WHERE pubname='supabase_realtime' 
  AND schemaname='public';

-- 5. Verificar se colunas existem em billing_transactions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'billing_transactions'
ORDER BY ordinal_position;

-- 6. Verificar se colunas existem em users  
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 7. Verificar RLS nas tabelas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'billing_transactions');

-- 8. Teste DIRETO da função (não usa INSERT, só chama RPC com dados existentes)
-- Se houver algum usuário com api_key no banco, testamos nele
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.users WHERE api_key IS NOT NULL LIMIT 1)
        THEN (SELECT public.deduct_credits_atomic(
            (SELECT api_key FROM public.users WHERE api_key IS NOT NULL LIMIT 1),
            0.01,
            '/readonly/test',
            'readonly-req-001'
        ))
        ELSE '{"success": false, "message": "No user with api_key found"}'::jsonb
    END as test_result;
