-- ============================================================================
-- GXEON — Verificar configuração da API REST
-- ============================================================================

-- 1. Verificar se há tabelas no schema 'public' que NÃO aparecem na API
-- (comparar pg_tables vs o que o PostgREST expõe)
SELECT 
    t.schemaname,
    t.tablename,
    EXISTS (
        SELECT 1 FROM pg_publication_tables pt 
        WHERE pt.pubname = 'supabase_realtime' 
        AND pt.schemaname = t.schemaname 
        AND pt.tablename = t.tablename
    ) as in_publication
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN ('users', 'billing_transactions');

-- 2. Verificar se há políticas de acesso explícitas necessárias
-- (mesmo com RLS desativado, às vezes precisa de policy para anon/authenticated)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'billing_transactions');

-- 3. Verificar configurações do banco relacionadas a schemas
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE '%search%' OR name LIKE '%schema%';
