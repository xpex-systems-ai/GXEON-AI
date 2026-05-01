/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON MONETIZATION SERVER — Production Ready
 * Multi-currency payment processing with actor tracking
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
    PORT: process.env.PORT || 3000,
    MAIN_ACTOR: 'GX_MAIN_ACTOR',
    DEFAULT_COMMISSION: 0.10,
    PIX: {
        ENABLED: true,
        CHAVE: process.env.PIX_CHAVE || '00020126360014BR.GOV.BCB.PIX0114+5581981980446520400005303986540429.905802BR5913JUNIOR H SENA6014SAO PAULO62070503***6304D3B3',
        CNPJ_CPF: process.env.PIX_CPF || '01360508163',
        NOME: process.env.PIX_NOME || 'JUNIOR H SENA',
        CIDADE: process.env.PIX_CIDADE || 'SAO PAULO'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════════════════
const app = express();
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTOR TRACKING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════
async function actorTrackingMiddleware(req, res, next) {
    // Capture ref parameter from query
    const ref = req.query.ref || req.body.actor_code;
    
    if (ref) {
        // Validate actor exists
        const { data: actor, error } = await supabase
            .from('actors')
            .select('actor_code, status, commission_rate')
            .eq('actor_code', ref)
            .single();
        
        if (actor && actor.status === 'active') {
            req.actor = actor;
            console.log(`🎭 Actor tracked: ${actor.actor_code} (${actor.commission_rate * 100}% commission)`);
        } else {
            // Fallback to main actor
            const { data: mainActor } = await supabase
                .from('actors')
                .select('*')
                .eq('actor_code', CONFIG.MAIN_ACTOR)
                .single();
            
            req.actor = mainActor;
            console.log(`🎭 Fallback to main actor: ${CONFIG.MAIN_ACTOR}`);
        }
    } else {
        // No ref provided, use main actor
        const { data: mainActor } = await supabase
            .from('actors')
            .select('*')
            .eq('actor_code', CONFIG.MAIN_ACTOR)
            .single();
        
        req.actor = mainActor;
    }
    
    next();
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GXEON Monetization Server',
        version: '4.0.0',
        timestamp: new Date().toISOString(),
        actor_system: 'ACTIVE',
        main_actor: CONFIG.MAIN_ACTOR
    });
});

// Signal preview with actor tracking
app.get('/v1/signals/preview', actorTrackingMiddleware, async (req, res) => {
    try {
        const { data: signals, error } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        // Add pricing based on actor's country (simplified)
        const signalsWithPricing = signals.map(signal => ({
            ...signal,
            preview: true,
            unlock_price_brl: 4.90,
            unlock_price_usd: 0.99,
            actor_attribution: req.actor?.actor_code || CONFIG.MAIN_ACTOR
        }));
        
        res.json({
            success: true,
            count: signalsWithPricing.length,
            actor: req.actor?.actor_code,
            signals: signalsWithPricing
        });
        
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch signals'
        });
    }
});

// Create payment with actor tracking
app.post('/v1/payment/create/:signalId', actorTrackingMiddleware, async (req, res) => {
    try {
        const { signalId } = req.params;
        const userId = req.headers['x-user-id'] || crypto.randomUUID();
        
        // Get signal details
        const { data: signal, error: signalError } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', signalId)
            .single();
        
        if (signalError || !signal) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }
        
        // Generate transaction ID
        const txId = `GX${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Calculate price (BRL default)
        const priceBrl = signal.unlock_price_brl || 4.90;
        
        // Create global transaction with actor tracking
        const { data: transaction, error: txError } = await supabase
            .from('global_transactions')
            .insert({
                transaction_id: txId,
                user_id: userId,
                actor_code: req.actor?.actor_code || CONFIG.MAIN_ACTOR,
                user_country: 'BR',
                original_currency: 'BRL',
                original_amount: priceBrl,
                base_currency: 'BRL',
                base_amount: priceBrl,
                exchange_rate: 1.0,
                gateway_provider: 'MercadoPago_Pix',
                product_type: 'SIGNAL',
                product_id: signalId,
                status: 'PENDING',
                metadata: {
                    signal_symbol: signal.symbol,
                    actor_name: req.actor?.name
                },
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (txError) throw txError;
        
        // Create PIX payment record
        const { data: pixPayment, error: pixError } = await supabase
            .from('pix_payments')
            .insert({
                tx_id: txId,
                pix_tx_id: txId,
                actor_code: req.actor?.actor_code || CONFIG.MAIN_ACTOR,
                amount: priceBrl,
                currency: 'BRL',
                status: 'PENDING',
                pix_payload: CONFIG.PIX.CHAVE,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (pixError) throw pixError;
        
        console.log(`💰 Payment created: ${txId} for actor ${req.actor?.actor_code}`);
        
        res.json({
            success: true,
            transaction: {
                id: transaction.id,
                tx_id: txId,
                amount: priceBrl,
                currency: 'BRL',
                status: 'PENDING',
                actor_code: req.actor?.actor_code
            },
            pix: {
                payload: CONFIG.PIX.CHAVE,
                qr_code_data: `00020126360014BR.GOV.BCB.PIX0114+5581981980446520400005303986540${priceBrl.toFixed(2).replace('.', '').padStart(6, '0')}5802BR5913${CONFIG.PIX.NOME}6014${CONFIG.PIX.CIDADE}62070503***6304`,
                copy_paste: CONFIG.PIX.CHAVE
            }
        });
        
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment'
        });
    }
});

// Confirm payment (webhook simulation for now)
app.post('/v1/payment/confirm/:txId', async (req, res) => {
    try {
        const { txId } = req.params;
        
        // Find transaction
        const { data: transaction, error: txError } = await supabase
            .from('global_transactions')
            .select('*')
            .eq('transaction_id', txId)
            .single();
        
        if (txError || !transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        if (transaction.status === 'PAID') {
            return res.json({
                success: true,
                message: 'Transaction already confirmed',
                transaction: {
                    id: transaction.id,
                    status: 'PAID',
                    paid_at: transaction.paid_at
                }
            });
        }
        
        // Update transaction to PAID
        const paidAt = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('global_transactions')
            .update({
                status: 'PAID',
                paid_at: paidAt
            })
            .eq('id', transaction.id);
        
        if (updateError) throw updateError;
        
        // Update PIX payment status
        await supabase
            .from('pix_payments')
            .update({ status: 'PAID' })
            .eq('tx_id', txId);
        
        // Calculate and apply commission to actor's wallet
        const actorCode = transaction.actor_code || CONFIG.MAIN_ACTOR;
        const commission = transaction.base_amount * CONFIG.DEFAULT_COMMISSION;
        
        // Get actor's wallet
        const { data: wallet } = await supabase
            .from('actor_wallets')
            .select('*')
            .eq('actor_code', actorCode)
            .single();
        
        if (wallet) {
            // Update wallet with commission
            const { error: walletError } = await supabase
                .from('actor_wallets')
                .update({
                    balance: wallet.balance + commission,
                    total_earned: wallet.total_earned + commission,
                    updated_at: new Date().toISOString()
                })
                .eq('actor_code', actorCode);
            
            if (!walletError) {
                console.log(`💰 Commission applied: R$ ${commission.toFixed(2)} to ${actorCode}`);
            }
        }
        
        // Grant signal access to user
        await supabase
            .from('cornix_signal_access')
            .insert({
                user_id: transaction.user_id,
                signal_id: transaction.product_id,
                payment_id: transaction.id,
                status: 'active',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            });
        
        console.log(`✅ Payment confirmed: ${txId} | Commission: R$ ${commission.toFixed(2)}`);
        
        res.json({
            success: true,
            message: 'Payment confirmed successfully',
            transaction: {
                id: transaction.id,
                tx_id: txId,
                status: 'PAID',
                paid_at: paidAt,
                commission_paid: commission,
                actor_code: actorCode
            }
        });
        
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm payment'
        });
    }
});

// Get full signal (requires payment)
app.get('/v1/signals/:signalId/full', async (req, res) => {
    try {
        const { signalId } = req.params;
        const userId = req.headers['x-user-id'];
        
        // Check if user has access
        const { data: access, error: accessError } = await supabase
            .from('cornix_signal_access')
            .select('*')
            .eq('user_id', userId)
            .eq('signal_id', signalId)
            .eq('status', 'active')
            .single();
        
        if (accessError || !access) {
            return res.status(403).json({
                success: false,
                error: 'Payment required to view full signal'
            });
        }
        
        // Get full signal details
        const { data: signal, error: signalError } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', signalId)
            .single();
        
        if (signalError) throw signalError;
        
        res.json({
            success: true,
            signal: {
                ...signal,
                targets: signal.targets, // Full data unlocked
                stop_loss: signal.stop_loss,
                take_profits: signal.take_profits
            }
        });
        
    } catch (error) {
        console.error('Full signal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch signal'
        });
    }
});

// Revenue summary
app.get('/v1/revenue/summary', async (req, res) => {
    try {
        const { data: stats, error } = await supabase
            .from('global_transactions')
            .select('status, original_amount, actor_code')
            .eq('status', 'PAID');
        
        if (error) throw error;
        
        const summary = {
            total_transactions: stats?.length || 0,
            total_revenue_brl: stats?.reduce((sum, t) => sum + (t.original_amount || 0), 0) || 0,
            by_actor: {}
        };
        
        // Group by actor
        stats?.forEach(t => {
            if (!summary.by_actor[t.actor_code]) {
                summary.by_actor[t.actor_code] = {
                    transactions: 0,
                    revenue: 0
                };
            }
            summary.by_actor[t.actor_code].transactions++;
            summary.by_actor[t.actor_code].revenue += t.original_amount || 0;
        });
        
        res.json({
            success: true,
            summary
        });
        
    } catch (error) {
        console.error('Revenue summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch summary'
        });
    }
});

// Actor earnings
app.get('/v1/actors/:actorCode/earnings', async (req, res) => {
    try {
        const { actorCode } = req.params;
        
        // Get wallet
        const { data: wallet, error: walletError } = await supabase
            .from('actor_wallets')
            .select('*')
            .eq('actor_code', actorCode)
            .single();
        
        if (walletError) throw walletError;
        
        // Get transactions
        const { data: transactions, error: txError } = await supabase
            .from('global_transactions')
            .select('*')
            .eq('actor_code', actorCode)
            .eq('status', 'PAID')
            .order('created_at', { ascending: false });
        
        if (txError) throw txError;
        
        res.json({
            success: true,
            actor: actorCode,
            wallet: {
                balance: wallet.balance,
                total_earned: wallet.total_earned,
                pending_balance: wallet.pending_balance
            },
            transactions: transactions || []
        });
        
    } catch (error) {
        console.error('Actor earnings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch earnings'
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════
app.listen(CONFIG.PORT, () => {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🌑 GXEON MONETIZATION SERVER v4.0 — OPERATIONAL');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`🖥️  Server: http://localhost:${CONFIG.PORT}`);
    console.log(`🎭 Main Actor: ${CONFIG.MAIN_ACTOR}`);
    console.log(`💰 Commission: ${CONFIG.DEFAULT_COMMISSION * 100}%`);
    console.log(`🇧🇷 PIX: ${CONFIG.PIX.ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /health                    → System status');
    console.log('  GET  /v1/signals/preview?ref=   → Signal preview with actor tracking');
    console.log('  POST /v1/payment/create/:id       → Create payment');
    console.log('  POST /v1/payment/confirm/:txId    → Confirm payment + apply commission');
    console.log('  GET  /v1/revenue/summary         → Revenue analytics');
    console.log('  GET  /v1/actors/:code/earnings    → Actor earnings');
    console.log('');
    console.log('🏎️💰⚔️🌑 Ready for real transactions');
    console.log('═══════════════════════════════════════════════════════════════════════════');
});

export default app;
