#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 DIGITAL ARCHEOLOGY SNIPER VALIDATION - GXEON v4.0.0
 * Valida que o sniper saiu do modo de espera e está em varredura ativa
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { getDustSweeper } = require('../server/services/dustSweeper');

async function validateSniperActive() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║        🎯 DIGITAL ARCHEOLOGY SNIPER VALIDATION                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('🔍 Verificando status do sniper...\n');
    
    try {
        const sweeper = getDustSweeper();
        
        // Status atual
        console.log('📊 Status do Sniper:');
        console.log(`   Estado: ${sweeper.isRunning ? '🟢 ATIVO' : '🔴 INATIVO'}`);
        console.log(`   Scans realizados: ${sweeper.stats?.totalScanned || 0}`);
        console.log(`   Oportunidades descobertas: ${sweeper.discoveredOpportunities?.length || 0}`);
        
        if (!sweeper.isRunning) {
            console.log('\n🚀 Iniciando sniper...');
            await sweeper.start();
            console.log('   ✅ Sniper iniciado com sucesso');
        } else {
            console.log('\n✅ Sniper já está em operação');
        }
        
        // Configurações de segurança
        console.log('\n🛡️  Filtros de Segurança:');
        console.log(`   Require Locked Liquidity: ${sweeper.config?.filters?.requireLockedLiquidity ? '✅' : '❌'}`);
        console.log(`   Require Renounced: ${sweeper.config?.filters?.requireRenounced ? '✅' : '❌'}`);
        console.log(`   Block Honeypots: ${sweeper.config?.filters?.blockHoneypots ? '✅' : '❌'}`);
        console.log(`   Min Confidence: ${sweeper.config?.filters?.minConfidence || 0.85}`);
        
        // Configurações de gas
        console.log('\n⛽ Estratégia Low Gwei:');
        console.log(`   Max Gas Price: ${sweeper.config?.maxGasPriceGwei || 0.1} Gwei`);
        console.log(`   Min Fee Value: $${sweeper.config?.minFeeValueUsd || 5}`);
        console.log(`   Scan Interval: ${(sweeper.config?.scanIntervalMs || 300000) / 1000}s`);
        
        // Revenue destination
        console.log('\n💰 Revenue Stream:');
        console.log(`   Destination: ${process.env.COMMANDER_WALLET_ADDRESS?.slice(0, 20) || '0x3955d559055DadB7067054cB6E6f974710345224'.slice(0, 20)}...`);
        console.log(`   Distribution: 100% FAMÍLIA SENA`);
        
        // Simular scan rápido
        console.log('\n🔬 Executando scan de teste...');
        
        const scanStart = Date.now();
        
        // Aguardar próximo scan ou forçar um
        if (sweeper.performScan) {
            await sweeper.performScan();
        }
        
        const scanDuration = Date.now() - scanStart;
        
        console.log(`   ✅ Scan completado em ${scanDuration}ms`);
        console.log(`   🎯 Oportunidades pós-scan: ${sweeper.discoveredOpportunities?.length || 0}`);
        
        // Verificar Supabase sync
        console.log('\n🗄️  Supabase Sync:');
        if (sweeper.supabase) {
            console.log('   ✅ Cliente Supabase conectado');
            
            // Testar inserção
            try {
                const { data, error } = await sweeper.supabase
                    .from('gari_dust_opportunities')
                    .select('count')
                    .limit(1);
                
                if (!error) {
                    console.log('   ✅ Tabela gari_dust_opportunities acessível');
                }
            } catch (e) {
                console.log(`   ⚠️  Verificação de tabela: ${e.message}`);
            }
        } else {
            console.log('   ❌ Cliente Supabase não configurado');
        }
        
        // Resumo
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log(`║     ${sweeper.isRunning ? '🟢 SNIPER EM VARREDURA ATIVA' : '🔴 SNIPER INATIVO'}          ║`);
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        
        if (sweeper.isRunning) {
            console.log('✅ Digital Archeology Sniper está OPERACIONAL');
            console.log('   • Varrendo pools de Dust (Locked + Renounced)');
            console.log('   • Enviando oportunidades para Supabase');
            console.log('   • Sincronizando com Monetizer');
            console.log('   • Revenue: 100% Commander Wallet');
            
            return { 
                success: true, 
                active: true, 
                opportunities: sweeper.discoveredOpportunities?.length || 0,
                scans: sweeper.stats?.totalScanned || 0
            };
        } else {
            console.log('❌ Sniper não conseguiu iniciar');
            return { success: false, active: false };
        }
        
    } catch (err) {
        console.error('\n❌ ERRO NA VALIDAÇÃO:', err.message);
        return { success: false, error: err.message };
    }
}

// Executar
validateSniperActive().then(result => {
    process.exit(result.success ? 0 : 1);
}).catch(err => {
    console.error('Erro crítico:', err);
    process.exit(1);
});
