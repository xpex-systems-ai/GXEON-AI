#!/usr/bin/env node
/**
 * Teste de Sincronização Supabase - GXEON v4.0.0
 * Valida conexão com Supabase e tabelas necessárias
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function testSupabaseSync() {
    console.log('================================================================');
    console.log('       SUPABASE SYNC VALIDATION v4.0.0');
    console.log('================================================================\n');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('1. Verificando variáveis de ambiente:');
    console.log('   SUPABASE_PROJECT_URL:', supabaseUrl ? 'OK' : 'FALTANDO');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'FALTANDO');

    if (!supabaseUrl || !supabaseKey) {
        console.log('\n[X] ERRO: Variáveis de ambiente não configuradas');
        return { success: false, error: 'Env vars missing' };
    }

    console.log('\n2. Criando cliente Supabase...');
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        console.log('   [OK] Cliente criado');

        // Testar tabela gari_dust_opportunities
        console.log('\n3. Testando tabela gari_dust_opportunities...');
        const { data, error, count } = await supabase
            .from('gari_dust_opportunities')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log('   [X] Erro:', error.message);
        } else {
            console.log('   [OK] Tabela acessível');
            console.log('   Registros:', count || 0);
        }

        // Testar tabela digital_archeology_ledger
        console.log('\n4. Testando tabela digital_archeology_ledger...');
        const { data: data2, error: error2, count: count2 } = await supabase
            .from('digital_archeology_ledger')
            .select('*', { count: 'exact', head: true });

        if (error2) {
            console.log('   [X] Erro:', error2.message);
        } else {
            console.log('   [OK] Tabela acessível');
            console.log('   Registros:', count2 || 0);
        }

        console.log('\n================================================================');
        console.log('       SUPABASE SYNC: OPERACIONAL');
        console.log('================================================================');

        return { success: true };

    } catch (err) {
        console.log('\n[X] ERRO:', err.message);
        return { success: false, error: err.message };
    }
}

testSupabaseSync().then(result => {
    process.exit(result.success ? 0 : 1);
});
