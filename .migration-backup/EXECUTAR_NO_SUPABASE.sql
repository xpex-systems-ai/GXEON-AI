-- ============================================================================
-- EXECUTAR_NO_SUPABASE.sql
-- CÓDIGO DEFINITIVO PARA LIBERAR O FLUXO DE DINHEIRO DO GXEON
-- Execute TUDO no SQL Editor do Supabase Dashboard
-- ============================================================================

-- ============================================================================
-- PARTE 1: CRIAR TABELA audit_logs (Logs do Sistema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    level TEXT DEFAULT 'info',
    module TEXT,
    message TEXT,
    metadata JSONB,
    notification_type TEXT DEFAULT 'system',
    priority TEXT DEFAULT 'low',
    requires_action BOOLEAN DEFAULT false
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON public.audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_notification_type ON public.audit_logs(notification_type);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs
CREATE POLICY IF NOT EXISTS "Allow service_role all on audit_logs"
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated read on audit_logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon read on audit_logs"
    ON public.audit_logs
    FOR SELECT
    TO anon
    USING (true);

-- ============================================================================
-- PARTE 2: CRIAR TABELA keeper_rewards (Rastreamento de Lucros)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.keeper_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    task_id TEXT,
    protocol TEXT,
    network TEXT,
    reward_amount NUMERIC,
    reward_token TEXT,
    gas_spent_usd NUMERIC,
    net_profit_usd NUMERIC,
    tx_hash TEXT,
    status TEXT DEFAULT 'detected'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_task_id ON public.keeper_rewards(task_id);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_network ON public.keeper_rewards(network);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_status ON public.keeper_rewards(status);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_created_at ON public.keeper_rewards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keeper_rewards_net_profit ON public.keeper_rewards(net_profit_usd DESC);

-- Habilitar RLS
ALTER TABLE public.keeper_rewards ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para keeper_rewards
CREATE POLICY IF NOT EXISTS "Allow service_role all on keeper_rewards"
    ON public.keeper_rewards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated read on keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon read on keeper_rewards"
    ON public.keeper_rewards
    FOR SELECT
    TO anon
    USING (true);

-- ============================================================================
-- PARTE 3: HABILITAR REALTIME (Atualizações em Tempo Real)
-- ============================================================================

-- Adicionar audit_logs ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- Adicionar keeper_rewards ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.keeper_rewards;

-- ============================================================================
-- PARTE 4: CONFIGURAR PERMISSÕES DO SERVICE_ROLE (Agente Backend)
-- ============================================================================

-- Garantir que service_role tenha permissão em audit_logs
GRANT ALL ON public.audit_logs TO service_role;

-- Garantir que service_role tenha permissão em keeper_rewards
GRANT ALL ON public.keeper_rewards TO service_role;

-- Grant em sequências (para UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- PARTE 5: REFRESH DO SCHEMA CACHE
-- ============================================================================

-- Forçar refresh do PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se tabelas foram criadas corretamente
SELECT 
    'audit_logs' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'audit_logs' AND table_schema = 'public'
UNION ALL
SELECT 
    'keeper_rewards' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'keeper_rewards' AND table_schema = 'public';

-- Verificar se realtime está habilitado
SELECT 
    tablename,
    pubname
FROM pg_publication_tables
WHERE tablename IN ('audit_logs', 'keeper_rewards');
