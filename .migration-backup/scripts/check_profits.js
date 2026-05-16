#!/usr/bin/env node
/**
 * GXEON Profit Checker - Verifica lucros acumulados
 * Sistema: GXEON PREDATOR v4.0.0
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkProfits() {
    console.log('================================================================');
    console.log('       GXEON PROFIT CHECKER v4.0.0');
    console.log('================================================================\n');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log('ERRO: Variaveis de ambiente Supabase nao configuradas');
        return { success: false, error: 'Env vars missing' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        db: { schema: 'public' }
    });

    try {
        // Test connection first
        console.log('1. Testando conexao...');
        const { error: connError } = await supabase.from('gari_dust_opportunities').select('*', { count: 'exact', head: true });
        
        if (connError && connError.message.includes('schema cache')) {
            console.log('   [AVISO] Schema cache nao atualizado, tabelas podem nao estar visiveis');
            console.log('   [INFO] Tabelas foram criadas mas Supabase pode precisar de refresh\n');
        }

        // Verificar oportunidades executadas
        console.log('2. Verificando oportunidades executadas...');
        let executed = 0;
        try {
            const { count, error: err1 } = await supabase
                .from('gari_dust_opportunities')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'EXECUTED');
            
            if (!err1) executed = count || 0;
        } catch (e) {
            console.log('   [AVISO] Nao foi possivel contar oportunidades');
        }

        // Verificar ledger
        console.log('3. Verificando digital_archeology_ledger...');
        let ledger = [];
        try {
            const { data, error: err2 } = await supabase
                .from('digital_archeology_ledger')
                .select('net_profit_eth, net_profit_usd, fee_buffer_amount_eth')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (!err2) ledger = data || [];
        } catch (e) {
            console.log('   [AVISO] Nao foi possivel acessar ledger');
        }

        // Calcular totais
        let totalProfitEth = 0;
        let totalProfitUsd = 0;
        let totalFees = 0;

        if (ledger && ledger.length > 0) {
            ledger.forEach(entry => {
                totalProfitEth += parseFloat(entry.net_profit_eth || 0);
                totalProfitUsd += parseFloat(entry.net_profit_usd || 0);
                totalFees += parseFloat(entry.fee_buffer_amount_eth || 0);
            });
        }

        console.log('\n================================================================');
        console.log('       RELATORIO DE LUCROS - FAMILIA SENA');
        console.log('================================================================');
        console.log(`Oportunidades Registradas:  ${executed}`);
        console.log(`Total Lucro (ETH):          ${totalProfitEth.toFixed(6)} ETH`);
        console.log(`Total Lucro (USD):          $${totalProfitUsd.toFixed(2)}`);
        console.log(`Taxas Protegidas:           ${totalFees.toFixed(6)} ETH`);
        console.log(`Entradas no Ledger:        ${ledger.length}`);
        console.log(`Comandante Wallet:          ${process.env.COMMANDER_WALLET_ADDRESS?.slice(0, 20)}...`);
        console.log('================================================================');
        console.log('Nota: Tabelas criadas. Aguardando primeiras transacoes.');
        console.log('================================================================');

        return {
            success: true,
            executed,
            totalProfitEth,
            totalProfitUsd,
            totalFees,
            ledgerEntries: ledger.length
        };

    } catch (err) {
        console.log('\n[X] ERRO:', err.message);
        return { success: false, error: err.message };
    }
}

checkProfits().then(result => {
    process.exit(result.success ? 0 : 1);
});
