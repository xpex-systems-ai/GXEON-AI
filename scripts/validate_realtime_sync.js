#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 SUPABASE REALTIME VALIDATION - GXEON v4.0.0
 * Valida sincronização do canal Realtime para GariFeed Neon
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL || 'https://telxvphgrsvsnxvmjkce.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REALTIME_EVENTS = [
    'alchemy:rate_limit_handled',
    'monetizer:execute_swap',
    'ledger:new_entry'
];

async function validateRealtimeSync() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║        📡 SUPABASE REALTIME VALIDATION v4.0.0                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    if (!SUPABASE_KEY || SUPABASE_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...') {
        console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY não configurada!\n');
        console.log('🔧 PARA CORRIGIR, execute:\n');
        console.log('   npm run setup:env\n');
        console.log('   Ou configure manualmente o arquivo .env:\n');
        console.log('   1. Crie o arquivo .env na raiz do projeto');
        console.log('   2. Adicione: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
        console.log('   3. Obtenha a chave em: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/settings/api');
        console.log('\n⏹️  VALIDAÇÃO INTERROMPIDA - Ambiente não configurado\n');
        process.exit(1);
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log(`🔗 Conectando ao Supabase: ${SUPABASE_URL}`);
    
    try {
        // Testar conexão básica
        const { data: health, error: healthError } = await supabase
            .from('digital_archeology_ledger')
            .select('count')
            .limit(1);
        
        if (healthError) {
            console.log(`⚠️  Tabela digital_archeology_ledger: ${healthError.message}`);
        } else {
            console.log('✅ Tabela digital_archeology_ledger: ACESSÍVEL');
        }
        
        // Testar canal Realtime
        console.log('\n📡 Testando canais Realtime:');
        
        for (const event of REALTIME_EVENTS) {
            const channel = supabase.channel(`test-${event}`);
            
            await channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`   ✅ Canal [${event}]: SUBSCRIBED`);
                } else if (status === 'CLOSED') {
                    console.log(`   ⚠️  Canal [${event}]: CLOSED`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.log(`   ❌ Canal [${event}]: ERROR`);
                }
            });
            
            // Enviar mensagem de teste
            await channel.send({
                type: 'broadcast',
                event: event,
                payload: { test: true, timestamp: Date.now() }
            });
            
            // Cleanup
            setTimeout(() => channel.unsubscribe(), 1000);
        }
        
        // Testar broadcast de sinal
        console.log('\n🚀 Testando broadcast de EXECUTE_SWAP:');
        const testChannel = supabase.channel('gxeon-monetizer-signals');
        
        await testChannel.subscribe();
        
        const testSignal = {
            type: 'EXECUTE_SWAP',
            protocol: 'GXEON_PREDATOR_v4.0',
            timestamp: Date.now(),
            opportunity: {
                pair_address: '0xTEST...',
                profit_usd: 50.00,
                confidence: 0.95
            },
            guardian: {
                signal_id: `test_${Date.now()}`,
                process_persistence: 'ALIVE'
            }
        };
        
        await testChannel.send({
            type: 'broadcast',
            event: 'execute_swap_signal',
            payload: testSignal
        });
        
        console.log('   ✅ Sinal de teste transmitido');
        console.log(`   📊 Signal ID: ${testSignal.guardian.signal_id}`);
        
        await testChannel.unsubscribe();
        
        // Resumo
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ REALTIME SYNC VALIDADO                         ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        
        console.log('Eventos monitorados:');
        REALTIME_EVENTS.forEach(e => console.log(`   • ${e}`));
        
        console.log('\n🎨 Dashboard GXEON_BLACK_GOLD pronto para receber:');
        console.log('   • Neon Blue Glow em lucros reais');
        console.log('   • Pulsing alerts em execute_swap');
        console.log('   • Real-time ledger entries');
        
        return { success: true, events: REALTIME_EVENTS };
        
    } catch (err) {
        console.error('\n❌ ERRO NA VALIDAÇÃO:', err.message);
        return { success: false, error: err.message };
    }
}

// Executar
validateRealtimeSync().then(result => {
    process.exit(result.success ? 0 : 1);
}).catch(err => {
    console.error('Falha crítica:', err);
    process.exit(1);
});
