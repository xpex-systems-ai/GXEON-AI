-- ============================================================================
-- GXEON MAXIMUM RELOAD — Forçar PostgREST a reconhecer novas tabelas
-- ============================================================================

-- 1. Verificar se tabelas existem e estão na publicação
SELECT 
    t.tablename,
    EXISTS (
        SELECT 1 FROM pg_publication_tables pt 
        WHERE pt.pubname = 'supabase_realtime' 
        AND pt.schemaname = 'public' 
        AND pt.tablename = t.tablename
    ) as in_publication
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'gxeon_%';

-- 2. Se não estiverem na publicação, adicionar
-- (descomente e execute se necessário)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.gxeon_users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.gxeon_billing_transactions;

-- 3. Forçar reload via múltiplos métodos
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(0.5);
SELECT pg_notify('pgrst', 'reload config');
SELECT pg_sleep(0.5);

-- 4. Verificar funções
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('deduct_credits_atomic', 'refund_credits');

-- 5. Criar uma view simples para testar se PostgREST vê algo novo
CREATE OR REPLACE VIEW public.test_gxeon_view AS 
SELECT 'gxeon_users exists' as status 
WHERE EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='gxeon_users');

-- 6. Adicionar view à publicação para testar
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_gxeon_view;

-- 7. Reload final
NOTIFY pgrst, 'reload schema';

-- 8. Status
SELECT 'Maximum reload executado. Aguarde 15 segundos e teste via API.' as status;
