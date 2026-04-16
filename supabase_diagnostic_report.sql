-- ============================================================================
-- GXEON DIAGNOSTIC REPORT — Dados para análise CASCADE
-- Execute cada query separadamente e me envie os resultados
-- ============================================================================

-- PASSO 1: Funções RPC (execute e me envie o resultado)
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_credits_atomic', 'refund_credits');

-- PASSO 2: Tabelas na publicação supabase_realtime
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname='supabase_realtime' 
  AND schemaname='public'
ORDER BY tablename;

-- PASSO 3: Colunas de billing_transactions (CRÍTICO!)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'billing_transactions'
ORDER BY ordinal_position;

-- PASSO 4: Colunas de users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- PASSO 5: RLS status (CRÍTICO!)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'billing_transactions');

-- PASSO 6: Contagem de usuários (ver se há dados)
SELECT COUNT(*) as total_users FROM public.users;
SELECT COUNT(*) as users_with_api_key FROM public.users WHERE api_key IS NOT NULL;
