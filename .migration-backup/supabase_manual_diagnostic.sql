-- ============================================================================
-- GXEON MANUAL DIAGNOSTIC — Execute uma por vez e me envie o resultado
-- ============================================================================

-- QUERY 1: Search path
-- Resultado esperado: uma linha com o valor do search_path
-- Me envie: o texto que aparecer (ex: '"$user", public' ou outro valor)
SHOW search_path;

-- QUERY 2: Onde estão as tabelas
-- Resultado esperado: 2 linhas (users e billing_transactions)
-- Me envie: schemaname, tablename, tableowner para cada uma
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE tablename IN ('users', 'billing_transactions');

-- QUERY 3: Views mascarando
-- Resultado esperado: 0 linhas (vazio)
-- Me envie: se apareceu alguma linha ou "(no rows)"
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' AND viewname IN ('users', 'billing_transactions');

-- QUERY 4: RLS status users
-- Resultado esperado: enabled = true/false, forced = true/false
-- Me envie: os 2 valores
SELECT c.relrowsecurity as enabled, c.relforcerowsecurity as forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users' AND n.nspname = 'public';

-- QUERY 5: RLS status billing_transactions  
-- Resultado esperado: enabled = true/false, forced = true/false
-- Me envie: os 2 valores
SELECT c.relrowsecurity as enabled, c.relforcerowsecurity as forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'billing_transactions' AND n.nspname = 'public';

-- QUERY 6: Dono das tabelas (crítico!)
-- Resultado esperado: nome do owner
-- Me envie: o nome do tableowner
SELECT tableowner FROM pg_tables WHERE tablename = 'users';
SELECT tableowner FROM pg_tables WHERE tablename = 'billing_transactions';
