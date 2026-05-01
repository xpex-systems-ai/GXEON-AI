/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMONSTRAÇÃO MULTI-MOEDA — GXZ1 SOVEREIGN CORE
 * Mostra o sistema cobrando em BRL, USD e USDT
 * ═══════════════════════════════════════════════════════════════════════════
 */

const BASE_URL = 'http://localhost:3000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'internal_1777001766759';

console.clear();
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🌎 DEMONSTRAÇÃO MULTI-MOEDA — GXZ1 SOVEREIGN');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('⏰', new Date().toLocaleString('pt-BR'));
console.log('');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiCall(method, path, body = null, headers = {}) {
    try {
        const url = `${BASE_URL}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(url, options);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

async function runDemo() {
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 1: TESTAR DETECÇÃO GEOGRÁFICA
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🌍 ETAPA 1: DETECÇÃO GEOGRÁFICA');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const countries = ['BR', 'US', 'DE', 'AR'];
    
    for (const country of countries) {
        const geo = await apiCall('GET', '/v1/geo/test', null, {
            'x-simulate-country': country
        });
        
        if (geo.ok) {
            const pricing = geo.data.all_tiers.find(t => t.country === country);
            console.log(`   ${country === 'BR' ? '🇧🇷' : country === 'US' ? '🇺🇸' : country === 'DE' ? '🇩🇪' : '🇦🇷'} ${country}: ${pricing.currency} $${pricing.signal_price} (${pricing.gateway})`);
        }
    }
    console.log('');
    await sleep(1000);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 2: CRIAR SINAL PREMIUM
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📡 ETAPA 2: CRIANDO SINAL PREMIUM');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const signalData = {
        symbol: 'ETHUSDT',
        side: 'LONG',
        entry_price: 3500,
        entry_range_low: 3450,
        entry_range_high: 3550,
        targets: [3600, 3700, 3800, 3900, 4000],
        stop_loss: 3400,
        leverage: 10,
        is_premium: true,
        strategy: 'AI_BREAKOUT_ETH',
        confidence_score: 88
    };
    
    const signal = await apiCall('POST', '/v1/signals', signalData, {
        'x-internal-key': INTERNAL_KEY,
        'x-simulate-country': 'BR'
    });
    
    if (!signal.ok) {
        console.log('❌ Erro ao criar sinal:', signal.data?.error);
        return;
    }
    
    const signalId = signal.data.signal.id;
    console.log(`✅ Sinal criado: ${signal.data.signal.signal_id}`);
    console.log(`   Ativo: ${signal.data.signal.symbol} ${signal.data.signal.side}`);
    console.log('');
    
    // Mostrar preços globais
    console.log('💰 PREÇOS GLOBAIS:');
    console.log(`   🇧🇷 BRL: R$ ${signal.data.global_pricing.BRL.amount} (${signal.data.global_pricing.BRL.method})`);
    console.log(`   🇺🇸 USD: $ ${signal.data.global_pricing.USD.amount} (${signal.data.global_pricing.USD.method})`);
    console.log(`   🔒 USDT: ${signal.data.global_pricing.USDT.amount} ${signal.data.global_pricing.USDT.method}`);
    console.log('');
    await sleep(1500);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 3: USUÁRIO BRASILEIRO — PAGAMENTO PIX
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🇧🇷 ETAPA 3: USUÁRIO BRASILEIRO — PIX');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const userBR = crypto.randomUUID();
    const paymentBR = await apiCall('POST', `/v1/payment/create/${signalId}`, null, {
        'x-user-id': userBR,
        'x-simulate-country': 'BR',
        'x-preferred-currency': 'BRL'
    });
    
    if (paymentBR.ok) {
        console.log(`✅ Pagamento criado: ${paymentBR.data.transaction.id}`);
        console.log(`   País: ${paymentBR.data.transaction.country}`);
        console.log(`   Moeda: ${paymentBR.data.transaction.currency}`);
        console.log(`   Valor: R$ ${paymentBR.data.transaction.amount}`);
        console.log(`   Gateway: ${paymentBR.data.payment_options.BRL.gateway}`);
        
        // Confirmar pagamento
        const confirmBR = await apiCall('POST', `/v1/payment/confirm/${paymentBR.data.transaction.id}`, null, {
            'x-user-id': userBR
        });
        
        if (confirmBR.ok) {
            console.log(`✅ Pagamento confirmado!`);
            console.log(`   Lucro: R$ ${(paymentBR.data.transaction.amount * 0.95).toFixed(2)}`);
        }
    }
    console.log('');
    await sleep(1500);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 4: USUÁRIO AMERICANO — PAGAMENTO PAYPAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🇺🇸 ETAPA 4: USUÁRIO AMERICANO — PAYPAL');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const userUS = crypto.randomUUID();
    const paymentUS = await apiCall('POST', `/v1/payment/create/${signalId}`, null, {
        'x-user-id': userUS,
        'x-simulate-country': 'US'
    });
    
    if (paymentUS.ok) {
        console.log(`✅ Pagamento criado: ${paymentUS.data.transaction.id}`);
        console.log(`   País: ${paymentUS.data.transaction.country}`);
        console.log(`   Moeda: ${paymentUS.data.transaction.currency}`);
        console.log(`   Valor: $ ${paymentUS.data.transaction.amount}`);
        console.log(`   Gateway: ${paymentUS.data.payment_options.USD.gateway}`);
        console.log(`   Conversão: R$ ${(paymentUS.data.transaction.amount * 5.85).toFixed(2)}`);
        
        // Confirmar pagamento
        const confirmUS = await apiCall('POST', `/v1/payment/confirm/${paymentUS.data.transaction.id}`, null, {
            'x-user-id': userUS
        });
        
        if (confirmUS.ok) {
            console.log(`✅ Pagamento confirmado!`);
            console.log(`   Lucro: ~R$ ${(paymentUS.data.transaction.amount * 5.85 * 0.95).toFixed(2)}`);
        }
    }
    console.log('');
    await sleep(1500);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 5: USUÁRIO SOBERANO — PAGAMENTO CRYPTO
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🔒 ETAPA 5: USUÁRIO SOBERANO — CRYPTO (USDT)');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const userCrypto = crypto.randomUUID();
    const paymentCrypto = await apiCall('POST', `/v1/payment/create/${signalId}`, null, {
        'x-user-id': userCrypto,
        'x-simulate-country': 'BR',
        'x-preferred-currency': 'USDT'
    });
    
    if (paymentCrypto.ok) {
        console.log(`✅ Pagamento criado: ${paymentCrypto.data.transaction.id}`);
        console.log(`   Moeda: ${paymentCrypto.data.transaction.currency}`);
        console.log(`   Valor: ${paymentCrypto.data.transaction.amount} USDT`);
        console.log(`   Gateway: ${paymentCrypto.data.payment_options.USDT?.gateway || 'GXeon_Crypto'}`);
        console.log(`   Rede: Arbitrum (taxa: ~$0.10)`);
        console.log(`   Conversão: R$ ${(paymentCrypto.data.transaction.amount * 5.85).toFixed(2)}`);
        
        // Confirmar pagamento
        const confirmCrypto = await apiCall('POST', `/v1/payment/confirm/${paymentCrypto.data.transaction.id}`, null, {
            'x-user-id': userCrypto
        });
        
        if (confirmCrypto.ok) {
            console.log(`✅ Pagamento confirmado na blockchain!`);
            console.log(`   Lucro: R$ ${(paymentCrypto.data.transaction.amount * 5.85 * 0.995).toFixed(2)}`);
            console.log(`   (Taxa crypto: apenas 0.5% vs 5% PayPal)`);
        }
    }
    console.log('');
    await sleep(1500);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 6: RESUMO FINANCEIRO GLOBAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📊 ETAPA 6: RESUMO FINANCEIRO GLOBAL');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const summary = await apiCall('GET', '/v1/revenue/summary', null, {
        'x-internal-key': INTERNAL_KEY
    });
    
    if (summary.ok) {
        console.log('✅ RECEITA TOTAL:');
        console.log(`   Total de transações: ${summary.data.summary.total_transactions}`);
        console.log(`   Total em BRL: R$ ${summary.data.summary.total_brl.toFixed(2)}`);
        console.log(`   Total em USD: $ ${summary.data.summary.total_usd.toFixed(2)}`);
        console.log(`   Total em USDT: ${summary.data.summary.total_usdt.toFixed(2)}`);
        console.log('');
        console.log('📈 POR MOEDA:');
        Object.entries(summary.data.summary.by_currency).forEach(([curr, count]) => {
            console.log(`   ${curr}: ${count} transações`);
        });
        console.log('');
        console.log('🌍 POR PAÍS:');
        Object.entries(summary.data.summary.by_country).forEach(([country, count]) => {
            const flag = country === 'BR' ? '🇧🇷' : country === 'US' ? '🇺🇸' : '🌐';
            console.log(`   ${flag} ${country}: ${count} vendas`);
        });
    }
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONCLUSÃO
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ DEMONSTRAÇÃO MULTI-MOEDA COMPLETA!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎯 SISTEMA MONETIZANDO EM:');
    console.log('   🇧🇷 Brasil: Pix (MercadoPago)');
    console.log('   🌍 Global: PayPal (USD)');
    console.log('   🔒 Soberano: Crypto (USDT)');
    console.log('');
    console.log('💰 VANTAGENS POR GATEWAY:');
    console.log('   Pix: Taxa 5%, instantâneo, brasileiros');
    console.log('   PayPal: Taxa 6%, global, cartões');
    console.log('   Crypto: Taxa 0.5%, soberano, sem chargeback');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🌑 GXZ1 SOVEREIGN — Corretora de Inteligência Transnacional');
    console.log('═══════════════════════════════════════════════════════════════════════════');
}

runDemo().catch(console.error);
