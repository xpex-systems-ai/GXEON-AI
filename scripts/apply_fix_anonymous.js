/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APPLY FIX: Anonymous Users for Monetization
 * Remove FK constraints that block payments without user registration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 GX EXECUTORA — Aplicando fix para usuários anônimos...\n');

async function applyFix() {
    try {
        // Executar SQL para remover constraints
        const sql = `
            -- Remover FK constraint de pix_payments.user_id
            ALTER TABLE IF EXISTS pix_payments 
            DROP CONSTRAINT IF EXISTS pix_payments_user_id_fkey;

            -- Remover FK constraint de cornix_signal_access.user_id  
            ALTER TABLE IF EXISTS cornix_signal_access
            DROP CONSTRAINT IF EXISTS cornix_signal_access_user_id_fkey;

            -- Add index para performance
            CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON pix_payments(user_id);
            CREATE INDEX IF NOT EXISTS idx_signal_access_user_id ON cornix_signal_access(user_id);
        `;

        // Executar via RPC ou query direta
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
            // Tentar método alternativo - criar função se não existir
            console.log('⚠️  RPC exec_sql não disponível, tentando query direta...');
            
            // Testar se podemos inserir um registro de teste
            const testUuid = crypto.randomUUID();
            const { error: testError } = await supabase
                .from('pix_payments')
                .insert({
                    user_id: testUuid,
                    signal_id: '00000000-0000-0000-0000-000000000000',
                    pix_tx_id: 'TEST_' + Date.now(),
                    amount_brl: 1.00,
                    status: 'TEST',
                    expires_at: new Date().toISOString()
                })
                .select();

            if (testError && testError.message.includes('foreign key')) {
                console.log('❌ FK constraint ainda existe. Precisa rodar SQL manualmente no Supabase:');
                console.log('   Arquivo: supabase/fix_anonymous_users.sql');
                console.log('');
                console.log('   Ou execute no SQL Editor:');
                console.log('   ALTER TABLE pix_payments DROP CONSTRAINT IF EXISTS pix_payments_user_id_fkey;');
                console.log('   ALTER TABLE cornix_signal_access DROP CONSTRAINT IF EXISTS cornix_signal_access_user_id_fkey;');
            } else {
                // Deletar registro de teste
                await supabase.from('pix_payments').delete().eq('status', 'TEST');
                console.log('✅ Teste passou! FK constraints já removidas ou não existem.');
            }
        } else {
            console.log('✅ Fix aplicado via RPC!');
        }

        console.log('\n📊 Status das tabelas:');
        
        // Verificar tabelas
        const tables = ['cornix_signals', 'pix_payments', 'cornix_signal_access'];
        for (const table of tables) {
            const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (countError) {
                console.log(`   ❌ ${table}: ${countError.message}`);
            } else {
                console.log(`   ✅ ${table}: pronta`);
            }
        }

        console.log('\n🎯 PRÓXIMO PASSO: Rode o teste de monetização novamente!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.log('\n💡 INSTRUÇÃO MANUAL:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/_/sql');
        console.log('   2. Cole o conteúdo de supabase/fix_anonymous_users.sql');
        console.log('   3. Execute');
    }
}

applyFix();
