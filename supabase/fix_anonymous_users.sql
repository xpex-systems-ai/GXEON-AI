-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Permitir usuários anônimos no sistema de monetização
-- Remove foreign key constraints que impedem usuários sem cadastro
-- ═══════════════════════════════════════════════════════════════════════════

-- Remover FK constraint de pix_payments.user_id
ALTER TABLE pix_payments 
DROP CONSTRAINT IF EXISTS pix_payments_user_id_fkey;

-- Remover FK constraint de cornix_signal_access.user_id  
ALTER TABLE cornix_signal_access
DROP CONSTRAINT IF EXISTS cornix_signal_access_user_id_fkey;

-- Alterar colunas para aceitar qualquer UUID (incluindo anônimos)
-- Note: Ainda mantemos como UUID para consistência, mas sem FK constraint

-- Verificar se tabelas existem
DO $$
BEGIN
    -- Pix payments já deve existir, apenas removemos a constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pix_payments') THEN
        RAISE NOTICE '✅ Tabela pix_payments encontrada, FK removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cornix_signal_access') THEN
        RAISE NOTICE '✅ Tabela cornix_signal_access encontrada, FK removida';
    END IF;
END $$;

-- Add index para performance em user_id (mesmo sem FK)
CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON pix_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_access_user_id ON cornix_signal_access(user_id);

SELECT '✅ FIX APLICADO: Usuários anônimos agora podem fazer pagamentos PIX' as status;
