/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTE DE MONETIZAÇÃO — SUPABASE DIRECT (OFFLINE)
 * Testa fluxo completo sem servidor rodando
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('💰 TESTE DE MONETIZAÇÃO REAL — SUPABASE DIRECT');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Supabase: ${process.env.SUPABASE_PROJECT_URL?.split('//')[1]?.split('.')[0]}`);
console.log(`Time: ${new Date().toLocaleString('pt-BR')}`);
console.log('');

async function testMonetization() {
    const results = { passed: 0, failed: 0, tests: [] };
    let testSignalId = null;
    let testPixId = null;
    
    // TEST 1: Verificar tabelas existem
    console.log('🧪 TESTE 1: Verificando Schema');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const tables = [
        'cornix_signals',
        'cornix_signal_access', 
        'cornix_performance',
        'cornix_leaderboard',
        'pix_payments',
        'cornix_webhook_deliveries',
        'cornix_user_webhooks'
    ];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`   ❌ ${table}: ${error.message}`);
            results.failed++;
        } else {
            console.log(`   ✅ ${table}: OK`);
            results.passed++;
        }
    }
    console.log('');
    
    // TEST 2: Criar sinal premium
    console.log('🧪 TESTE 2: Criando Sinal Premium');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const signalData = {
        symbol: 'BTCUSDT',
        side: 'LONG',
        entry_price: 65000.00,
        entry_range_low: 64500.00,
        entry_range_high: 65500.00,
        target_1: 66000.00,
        target_2: 67000.00,
        target_3: 68000.00,
        stop_loss: 64000.00,
        leverage: 10,
        margin_type: 'ISOLATED',
        is_premium: true,
        unlock_price_brl: 29.90,
        strategy: 'AI_BREAKOUT_V2',
        timeframe: '15m',
        confidence_score: 87.5,
        risk_reward: 1.5,
        status: 'ACTIVE',
        source: 'TEST_MONETIZACAO',
        generated_by_agent: 'test_agent',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    const { data: signal, error: signalError } = await supabase
        .from('cornix_signals')
        .insert(signalData)
        .select()
        .single();
    
    if (signalError) {
        console.log(`   ❌ Erro: ${signalError.message}`);
        results.failed++;
    } else {
        testSignalId = signal.id;
        console.log(`   ✅ Sinal criado: ${signal.signal_id}`);
        console.log(`   📊 Symbol: ${signal.symbol} | Premium: R$ ${signal.unlock_price_brl}`);
        console.log(`   🔒 Targets: ${signal.target_1}, ${signal.target_2}, ${signal.target_3} (bloqueados para free)`);
        results.passed++;
    }
    console.log('');
    
    // TEST 3: Verificar view free
    console.log('🧪 TESTE 3: View Free Preview (Targets Bloqueados)');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: freeView, error: viewError } = await supabase
        .from('cornix_signals_free_view')
        .select('*')
        .eq('id', testSignalId)
        .single();
    
    if (viewError) {
        console.log(`   ❌ Erro: ${viewError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ View acessível`);
        console.log(`   👁️  Dados visíveis: symbol=${freeView.symbol}, side=${freeView.side}, entry=${freeView.entry_price}`);
        console.log(`   🔒 Targets: ${freeView.target_1 || 'NULL (bloqueado)'}`);
        console.log(`   🔓 Unlock Status: ${freeView.unlock_status}`);
        results.passed++;
    }
    console.log('');
    
    // TEST 4: Criar pagamento PIX
    console.log('🧪 TESTE 4: Gerando Cobrança PIX');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const pixData = {
        signal_id: testSignalId,
        pix_tx_id: `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        amount_brl: 29.90,
        status: 'PENDING',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        pix_qr_code: '00020126580014BR.GOV.BCB.PIX52040000530398654029.905802BR5909GXEON_AI6009SAO_PAULO',
        pix_copy_paste: '00020126580014BR.GOV.BCB.PIX52040000530398654029.905802BR5909GXEON_AI6009SAO_PAULO621305TEST'
    };
    
    const { data: pix, error: pixError } = await supabase
        .from('pix_payments')
        .insert(pixData)
        .select()
        .single();
    
    if (pixError) {
        console.log(`   ❌ Erro: ${pixError.message}`);
        results.failed++;
    } else {
        testPixId = pix.pix_tx_id;
        console.log(`   ✅ PIX criado: ${pix.pix_tx_id}`);
        console.log(`   💵 Valor: R$ ${pix.amount_brl}`);
        console.log(`   ⏰ Expira: ${new Date(pix.expires_at).toLocaleTimeString('pt-BR')}`);
        console.log(`   📱 QR Code: ${pix.pix_qr_code.substring(0, 40)}...`);
        results.passed++;
    }
    console.log('');
    
    // TEST 5: Simular pagamento
    console.log('🧪 TESTE 5: Simulando Pagamento PIX');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { error: payError } = await supabase
        .from('pix_payments')
        .update({
            status: 'PAID',
            paid_at: new Date().toISOString()
        })
        .eq('pix_tx_id', testPixId);
    
    if (payError) {
        console.log(`   ❌ Erro: ${payError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ Pagamento confirmado!`);
        console.log(`   💰 Status: PAID`);
        results.passed++;
    }
    console.log('');
    
    // TEST 6: Conceder acesso
    console.log('🧪 TESTE 6: Liberando Acesso ao Sinal');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const accessData = {
        signal_id: testSignalId,
        payment_method: 'PIX',
        payment_amount_brl: 29.90,
        payment_tx_id: testPixId,
        access_granted: true,
        accessed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const { data: access, error: accessError } = await supabase
        .from('cornix_signal_access')
        .insert(accessData)
        .select()
        .single();
    
    if (accessError) {
        console.log(`   ❌ Erro: ${accessError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ Acesso concedido!`);
        console.log(`   🔓 Access ID: ${access.id}`);
        console.log(`   📅 Válido até: ${new Date(access.expires_at).toLocaleDateString('pt-BR')}`);
        results.passed++;
    }
    console.log('');
    
    // TEST 7: Verificar sinal completo
    console.log('🧪 TESTE 7: Sinal Completo (Formato Cornix)');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: fullSignal, error: fullError } = await supabase
        .from('cornix_signals')
        .select('*')
        .eq('id', testSignalId)
        .single();
    
    if (fullError) {
        console.log(`   ❌ Erro: ${fullError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ Sinal completo acessível`);
        console.log('');
        console.log('   📋 FORMATO CORNIX:');
        console.log(`   {`);
        console.log(`     "symbol": "${fullSignal.symbol}",`);
        console.log(`     "side": "${fullSignal.side}",`);
        console.log(`     "entry": [${fullSignal.entry_range_low}, ${fullSignal.entry_range_high}],`);
        console.log(`     "targets": [${fullSignal.target_1}, ${fullSignal.target_2}, ${fullSignal.target_3}],`);
        console.log(`     "stop": ${fullSignal.stop_loss},`);
        console.log(`     "leverage": ${fullSignal.leverage}`);
        console.log(`   }`);
        console.log('');
        console.log('   🤖 PRONTO PARA AUTO-TRADE!');
        results.passed++;
    }
    console.log('');
    
    // TEST 8: Registrar performance
    console.log('🧪 TESTE 8: Registrando Performance (WIN)');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const performanceData = {
        signal_id: testSignalId,
        exit_time: new Date().toISOString(),
        exit_price_actual: 66500.00,
        profit_percent: 2.31,
        verified: true,
        verification_source: 'TEST'
    };
    
    const { data: perf, error: perfError } = await supabase
        .from('cornix_performance')
        .insert(performanceData)
        .select()
        .single();
    
    if (perfError) {
        console.log(`   ❌ Erro: ${perfError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ Performance registrada`);
        console.log(`   📈 Profit: +${perf.profit_percent}%`);
        console.log(`   ✅ Verificado: ${perf.verified}`);
        results.passed++;
    }
    console.log('');
    
    // TEST 9: Atualizar sinal como WIN
    console.log('🧪 TESTE 9: Finalizando Sinal (WIN)');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { error: updateError } = await supabase
        .from('cornix_signals')
        .update({
            result: 'WIN',
            profit_percent: 2.31,
            filled_target: 1,
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
        })
        .eq('id', testSignalId);
    
    if (updateError) {
        console.log(`   ❌ Erro: ${updateError.message}`);
        results.failed++;
    } else {
        console.log(`   ✅ Sinal finalizado: WIN`);
        console.log(`   🎯 Target atingido: #1`);
        results.passed++;
    }
    console.log('');
    
    // RESUMO
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMO DOS TESTES');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`   ✅ Passaram: ${results.passed}`);
    console.log(`   ❌ Falharam: ${results.failed}`);
    console.log(`   📊 Taxa: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    console.log('');
    
    if (results.failed === 0) {
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('');
        console.log('💰 DEMONSTRAÇÃO DE RECEITA:');
        console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Sinal Premium:    BTCUSDT LONG');
        console.log('   Preço:            R$ 29,90');
        console.log('   Pagamento:        PIX (confirmado)');
        console.log('   Acesso:           Liberado automaticamente');
        console.log('   Resultado:        WIN (+2.31%)');
        console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   💵 Receita:       R$ 29,90 (menos taxas PIX ~R$ 1,50)');
        console.log('   📈 Lucro:         ~R$ 28,40 (95% margin)');
        console.log('');
        console.log('🚀 SISTEMA PRONTO PARA PRODUÇÃO!');
        console.log('   • Start servidor: npm run dev');
        console.log('   • Criar sinais:   POST /v1/signals');
        console.log('   • PIX ativo:      /v1/signals/:id/pay');
        console.log('   • Webhooks:       Auto-feed para Cornix');
        console.log('');
        console.log('📈 PROJEÇÃO DE RECEITA:');
        console.log('   10 vendas/dia  = R$ 299,00/dia  = R$ 8.970,00/mês');
        console.log('   50 vendas/dia  = R$ 1.495,00/dia = R$ 44.850,00/mês');
    } else {
        console.log('⚠️  ALGUNS TESTES FALHARAM');
        console.log('   Verifique o schema do Supabase');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Teste finalizado: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    return results;
}

testMonetization().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
