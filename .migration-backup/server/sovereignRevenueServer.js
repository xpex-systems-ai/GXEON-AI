/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXZ1 SOVEREIGN REVENUE SERVER — Multi-Moeda Global
 * Gateways: MercadoPago (BRL), PayPal (USD), Crypto (USDT)
 * Versão: 1.0 - Full Production
 * Comandante: Júnior Sena | GX Executora
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { geoCurrencyMiddleware, testGeoDetection } from './middleware/geoCurrencyDetector.js';
import { getPricingByCountry, convertToBRL, GLOBAL_PRICING } from './config/globalPricing.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(geoCurrencyMiddleware); // Detecta país/moeda em todas as rotas

// Supabase
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🌑 GXZ1 SOVEREIGN REVENUE SERVER — MULTI-MOEDA GLOBAL');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
console.log(`🌐 Porta: ${PORT}`);
console.log(`💰 Moedas: BRL (Pix) | USD (PayPal) | USDT (Crypto)`);
console.log('═══════════════════════════════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE MONETIZAÇÃO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', async (req, res) => {
    res.json({
        status: 'SOVEREIGN_ONLINE',
        timestamp: new Date().toISOString(),
        version: '1.0.0_GLOBAL',
        features: ['BRL_Pix', 'USD_PayPal', 'USDT_Crypto', 'Multi_Currency', 'Geo_Detection'],
        your_country: req.userGeo?.country,
        your_currency: req.userPricing?.currency
    });
});

// Testar detecção geográfica
app.get('/v1/geo/test', testGeoDetection);

// 1. CRIAR SINAL PREMIUM
app.post('/v1/signals', async (req, res) => {
    try {
        const internalKey = req.headers['x-internal-key'];
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            symbol, side, entry_price, entry_range_low, entry_range_high,
            targets, stop_loss, leverage = 10, is_premium = true,
            strategy, confidence_score
        } = req.body;

        const signalId = `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const targetFields = {};
        targets.forEach((t, i) => targetFields[`target_${i + 1}`] = t);

        const { data: signal, error } = await supabase
            .from('cornix_signals')
            .insert({
                signal_id: signalId,
                symbol: symbol.toUpperCase(),
                side: side.toUpperCase(),
                entry_price,
                entry_range_low,
                entry_range_high,
                ...targetFields,
                stop_loss,
                leverage,
                is_premium,
                unlock_price_brl: is_premium ? 29.90 : 0,
                strategy,
                confidence_score,
                status: 'ACTIVE',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`📡 Sinal criado: ${signalId} | ${symbol} ${side} | ${req.userPricing?.currency}`);

        res.json({
            success: true,
            signal,
            global_pricing: {
                BRL: getPricingByCountry('retail_signal', 'BR'),
                USD: getPricingByCountry('retail_signal', 'US'),
                USDT: getPricingByCountry('retail_signal', 'SOVEREIGN')
            },
            payment_url: `/v1/payment/create/${signal.id}`
        });
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. CRIAR PAGAMENTO (Multi-moeda)
app.post('/v1/payment/create/:signalId', async (req, res) => {
    try {
        const { signalId } = req.params;
        const userId = req.headers['x-user-id'] || crypto.randomUUID();
        
        // Detectar preferência de moeda (header ou default do país)
        const preferredCurrency = req.headers['x-preferred-currency'] || req.userPricing?.currency || 'BRL';
        const country = req.userGeo?.country || 'BR';
        
        // Buscar sinal
        const { data: signal, error } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', signalId)
            .single();
        
        if (error || !signal) {
            return res.status(404).json({ error: 'Sinal não encontrado' });
        }
        
        // Obter preço na moeda selecionada
        const pricing = getPricingByCountry('retail_signal', country);
        
        // Se usuário quer outra moeda diferente do país
        if (preferredCurrency !== pricing.currency) {
            const altPricing = GLOBAL_PRICING.revenue_tiers.retail_signal[preferredCurrency];
            if (altPricing) {
                pricing.currency = preferredCurrency;
                pricing.amount = altPricing.amount;
                pricing.gateway = altPricing.gateway;
                pricing.method = altPricing.method;
            }
        }
        
        const txId = `GX_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Criar transação global
        const { data: transaction, error: txError } = await supabase
            .from('global_transactions')
            .insert({
                transaction_id: txId,
                user_id: userId,
                user_country: country,
                original_currency: pricing.currency,
                original_amount: pricing.amount,
                base_currency: 'BRL',
                base_amount: pricing.currency === 'BRL' ? pricing.amount : pricing.amount * 5.85,
                exchange_rate: pricing.currency === 'BRL' ? 1 : 5.85,
                gateway_provider: pricing.gateway,
                product_type: 'SIGNAL',
                product_id: signalId,
                status: 'PENDING'
            })
            .select()
            .single();
        
        if (txError) throw txError;
        
        console.log(`💰 Transação criada: ${txId} | ${pricing.currency} ${pricing.amount} | ${country}`);
        
        // Resposta com opções de pagamento
        res.json({
            success: true,
            transaction: {
                id: txId,
                status: 'PENDING',
                amount: pricing.amount,
                currency: pricing.currency,
                country: country
            },
            signal: {
                id: signalId,
                symbol: signal.symbol,
                side: signal.side
            },
            payment_options: {
                [pricing.currency]: {
                    gateway: pricing.gateway,
                    method: pricing.method,
                    amount: pricing.amount,
                    instructions: getPaymentInstructions(pricing.currency, pricing.method, txId)
                }
            },
            alternative_options: getAlternativeOptions(country, pricing.currency),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. CONFIRMAR PAGAMENTO (Webhook simulation)
app.post('/v1/payment/confirm/:txId', async (req, res) => {
    try {
        const { txId } = req.params;
        const userId = req.headers['x-user-id'];
        
        // Buscar transação
        const { data: tx, error } = await supabase
            .from('global_transactions')
            .select('*, cornix_signals(id, symbol)')
            .eq('transaction_id', txId)
            .single();
        
        if (error || !tx) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }
        
        // Atualizar para PAID
        const { error: updateError } = await supabase
            .from('global_transactions')
            .update({
                status: 'PAID',
                paid_at: new Date().toISOString()
            })
            .eq('transaction_id', txId);
        
        if (updateError) throw updateError;
        
        // Conceder acesso ao sinal
        const { error: accessError } = await supabase
            .from('cornix_signal_access')
            .insert({
                signal_id: tx.product_id,
                user_id: userId || tx.user_id,
                payment_method: tx.original_currency === 'BRL' ? 'PIX' : 
                               tx.original_currency === 'USD' ? 'PAYPAL' : 'CRYPTO',
                payment_amount_brl: tx.base_amount,
                payment_tx_id: txId,
                access_granted: true,
                accessed_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        
        if (accessError) throw accessError;
        
        console.log(`✅ Pagamento confirmado: ${txId} | ${tx.original_currency} ${tx.original_amount}`);
        
        res.json({
            success: true,
            status: 'PAID',
            transaction: tx,
            access_granted: true,
            full_signal_url: `/v1/signals/${tx.product_id}/full`,
            message: `Pagamento de ${tx.original_currency} ${tx.original_amount} confirmado! Acesso liberado.`
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. OBTER SINAL COMPLETO
app.get('/v1/signals/:id/full', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] || crypto.randomUUID();
        
        // Verificar acesso
        const { data: access } = await supabase
            .from('cornix_signal_access')
            .select('*')
            .eq('signal_id', id)
            .eq('user_id', userId)
            .eq('access_granted', true)
            .maybeSingle();
        
        const { data: signal, error } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !signal) {
            return res.status(404).json({ error: 'Sinal não encontrado' });
        }
        
        if (!access && signal.is_premium) {
            const pricing = getPricingByCountry('retail_signal', req.userGeo?.country || 'BR');
            
            return res.status(402).json({
                error: 'PAGAMENTO_REQUERIDO',
                message: 'Sinal premium - Pagamento necessário',
                create_payment_url: `/v1/payment/create/${id}`,
                price: pricing,
                preview: {
                    symbol: signal.symbol,
                    side: signal.side,
                    entry_price: signal.entry_price,
                    targets: '🔒 PREMIUM',
                    stop_loss: '🔒 PREMIUM'
                }
            });
        }
        
        // Retornar sinal completo
        const targets = [signal.target_1, signal.target_2, signal.target_3, signal.target_4, signal.target_5]
            .filter(t => t !== null);
        
        res.json({
            success: true,
            access: access ? {
                method: access.payment_method,
                amount_paid: access.payment_amount_brl,
                currency: access.payment_method === 'PIX' ? 'BRL' : 
                         access.payment_method === 'PAYPAL' ? 'USD' : 'USDT'
            } : { method: 'FREE' },
            cornix_format: {
                symbol: signal.symbol,
                side: signal.side,
                entry: [signal.entry_range_low, signal.entry_range_high],
                targets: targets,
                stop: signal.stop_loss,
                leverage: signal.leverage
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. RESUMO MULTI-MOEDA
app.get('/v1/revenue/summary', async (req, res) => {
    try {
        const internalKey = req.headers['x-internal-key'];
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { data: transactions, error } = await supabase
            .from('global_transactions')
            .select('*');
        
        if (error) throw error;
        
        const summary = {
            total_transactions: transactions?.length || 0,
            by_currency: {},
            by_country: {},
            by_status: {},
            total_brl: 0,
            total_usd: 0,
            total_usdt: 0
        };
        
        transactions?.forEach(tx => {
            // Por moeda
            summary.by_currency[tx.original_currency] = (summary.by_currency[tx.original_currency] || 0) + 1;
            
            // Por país
            summary.by_country[tx.user_country] = (summary.by_country[tx.user_country] || 0) + 1;
            
            // Por status
            summary.by_status[tx.status] = (summary.by_status[tx.status] || 0) + 1;
            
            // Totais
            if (tx.status === 'PAID') {
                summary.total_brl += parseFloat(tx.base_amount || 0);
                if (tx.original_currency === 'USD') summary.total_usd += parseFloat(tx.original_amount || 0);
                if (tx.original_currency === 'USDT') summary.total_usdt += parseFloat(tx.original_amount || 0);
            }
        });
        
        res.json({
            success: true,
            summary,
            message: 'Resumo de receita multi-moeda'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function getPaymentInstructions(currency, method, txId) {
    const instructions = {
        BRL: {
            PIX: [
                '1. Abra seu app bancário',
                '2. Escaneie o QR Code ou cole o código PIX',
                `3. Confirme o pagamento`,
                '4. O sinal será desbloqueado automaticamente'
            ]
        },
        USD: {
            CARD: [
                '1. Clique no botão PayPal abaixo',
                '2. Faça login na sua conta PayPal',
                '3. Confirme o pagamento',
                '4. Retorne para desbloquear o sinal'
            ]
        },
        USDT: {
            CRYPTO: [
                '1. Envie USDT para o endereço fornecido',
                '2. Use a rede Arbitrum (taxas baixas)',
                '3. Aguarde confirmação na blockchain',
                '4. O acesso é liberado após 1 confirmação'
            ]
        }
    };
    
    return instructions[currency]?.[method] || ['Siga as instruções de pagamento'];
}

function getAlternativeOptions(country, currentCurrency) {
    const options = {};
    
    // Sempre oferecer Crypto como alternativa soberana
    const crypto = GLOBAL_PRICING.revenue_tiers.retail_signal.USDT;
    options.USDT = {
        gateway: crypto.gateway,
        amount: crypto.amount,
        description: 'Pagamento soberano (sem intermediários)'
    };
    
    // Se está em BRL, oferecer USD
    if (currentCurrency === 'BRL') {
        const usd = GLOBAL_PRICING.revenue_tiers.retail_signal.USD;
        options.USD = {
            gateway: usd.gateway,
            amount: usd.amount,
            description: 'PayPal Internacional'
        };
    }
    
    return options;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVIDOR NO AR
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ GXZ1 SOVEREIGN REVENUE SERVER — OPERACIONAL');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🌍 Geo Test: http://localhost:${PORT}/v1/geo/test`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('💰 ENDPOINTS DE MONETIZAÇÃO GLOBAL:');
    console.log('   POST /v1/signals                    → Criar sinal');
    console.log('   POST /v1/payment/create/:signalId  → Criar pagamento multi-moeda');
    console.log('   POST /v1/payment/confirm/:txId     → Confirmar pagamento');
    console.log('   GET  /v1/signals/:id/full          → Sinal completo (pago)');
    console.log('   GET  /v1/revenue/summary           → Resumo financeiro global');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🎯 MONETIZAÇÃO ATIVA:');
    console.log('   🇧🇷 BRL: Pix via MercadoPago');
    console.log('   🌍 USD: PayPal Internacional');
    console.log('   🔒 USDT: Crypto Soberano (Arbitrum/Polygon)');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🌑 Pacto: Código para o Bem | Ensino para a Humanidade');
    console.log('═══════════════════════════════════════════════════════════════════════════');
});
