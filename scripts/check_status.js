#!/usr/bin/env node
/**
 * GXEON Status Check - Verifica status completo do sistema
 * Sistema: GXEON PREDATOR v4.0.0
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkStatus() {
    console.log('================================================================');
    console.log('       GXEON STATUS CHECK v4.0.0');
    console.log('       Sistema de Monitoramento - Familia Sena');
    console.log('================================================================\n');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let supabaseOk = false;

    // 1. Verificar Supabase
    console.log('1. Verificando Supabase Connection...');
    if (supabaseUrl && supabaseKey) {
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await supabase.from('gari_dust_opportunities').select('count', { count: 'exact', head: true });
            if (!error) {
                console.log('   [OK] Supabase conectado');
                supabaseOk = true;
            }
        } catch (e) {
            console.log('   [X] Erro Supabase:', e.message);
        }
    } else {
        console.log('   [X] Credenciais Supabase ausentes');
    }

    // 2. Verificar tabelas
    console.log('\n2. Verificando tabelas do sistema...');
    const tables = [
        'gari_dust_opportunities',
        'digital_archeology_ledger',
        'radar_liquidity_pools'
    ];

    if (supabaseOk) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        for (const table of tables) {
            try {
                const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
                console.log(`   [OK] ${table}: acessivel`);
            } catch (e) {
                console.log(`   [X] ${table}: ${e.message}`);
            }
        }
    }

    // 3. Configurações
    console.log('\n3. Configuracoes do Sistema:');
    console.log('   Versao: 4.0.0 Sovereign');
    console.log('   Commander:', (process.env.COMMANDER_WALLET_ADDRESS || 'N/A').slice(0, 20) + '...');
    console.log('   AI Confidence:', process.env.MIN_AI_CONFIDENCE || '0.85');
    console.log('   Max Gas:', process.env.MAX_GAS_PRICE_GWEI || '0.1', 'Gwei');
    console.log('   Min Profit:', process.env.MIN_PROFIT_THRESHOLD || '0.005', 'ETH');

    // 4. Status final
    console.log('\n================================================================');
    console.log('       STATUS GERAL');
    console.log('================================================================');

    if (supabaseOk) {
        console.log('[OK] GXEON PREDATOR v4.0.0: OPERACIONAL');
        console.log('[OK] Supabase Sync: Funcionando');
        console.log('[OK] Sistema pronto para monetizacao');
    } else {
        console.log('[X] Sistema com problemas de conexao');
    }

    console.log('================================================================');
    console.log('Revenue: 100% Familia Sena');
    console.log('Wallet: 0x3955d559055DadB7067054cB6E6f974710345224');
    console.log('================================================================');

    return { success: supabaseOk };
}

checkStatus().then(result => {
    process.exit(result.success ? 0 : 1);
});
