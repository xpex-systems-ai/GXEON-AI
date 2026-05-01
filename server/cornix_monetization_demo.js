/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON CORNIX MONETIZATION SERVER — DEMONSTRAÇÃO OPERACIONAL
 * Servidor minimalista focado em monetização real
 * Comandante: Júnior Sena | Parceria de última geração
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🚀 GXEON CORNIX MONETIZATION — SERVIDOR OPERACIONAL');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`🔌 Supabase: ${process.env.SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}`);
console.log(`🌐 Porta: ${PORT}`);
console.log(`⏰ Iniciado: ${new Date().toLocaleString('pt-BR')}`);
console.log('═══════════════════════════════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE MONETIZAÇÃO REAL
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', async (req, res) => {
    const { data, error } = await supabase.from('cornix_signals').select('count', { count: 'exact', head: true });
    
    res.json({
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
        database: error ? 'ERROR' : 'CONNECTED',
        signals_ready: !error,
        version: '4.0.0-monetization'
    });
});

// 1. STREAM PÚBLICO — Atrai tráfego
app.get('/v1/signals/live', async (req, res) => {
    try {
        const { data: signals, error } = await supabase
            .from('cornix_signals')
            .select('signal_id, symbol, side, entry_price, status, created_at')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({
            success: true,
            signals: signals || [],
            count: signals?.length || 0,
            message: '📡 Stream de sinais ativos',
            monetization_note: 'Acesse /v1/signals/cornix-ready para preview completo'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. PREVIEW GRATUITO — Targets bloqueados
app.get('/v1/signals/cornix-ready', async (req, res) => {
    try {
        const { symbol, limit = 5 } = req.query;
        
        let query = supabase
            .from('cornix_signals')
            .select('*')
            .eq('status', 'ACTIVE')
            .eq('is_premium', true)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (symbol) {
            query = query.ilike('symbol', `%${symbol}%`);
        }

        const { data: signals, error } = await query;
        if (error) throw error;

        // Mascarar targets premium
        const maskedSignals = signals?.map(s => ({
            id: s.id,
            signal_id: s.signal_id,
            symbol: s.symbol,
            side: s.side,
            entry_price: s.entry_price,
            entry_range_low: s.entry_range_low,
            entry_range_high: s.entry_range_high,
            targets: '🔒 PREMIUM — Desbloqueie para ver os 5 alvos',
            stop_loss: '🔒 PREMIUM — Proteja seu capital',
            leverage: s.leverage,
            margin_type: s.margin_type,
            strategy: s.strategy,
            confidence_score: s.confidence_score,
            is_premium: s.is_premium,
            unlock_price_brl: s.unlock_price_brl,
            unlock_status: 'LOCKED',
            payment_url: `/v1/signals/${s.id}/pay`,
            expires_at: s.expires_at
        }));

        res.json({
            success: true,
            signals: maskedSignals || [],
            count: maskedSignals?.length || 0,
            message: '👁️ Preview gratuito — Pague para desbloquear alvos completos',
            pricing: {
                premium_signal: 'R$ 29,90',
                payment_methods: ['PIX'],
                access_duration: '30 dias'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. GERAR PIX — Inicia pagamento
app.get('/v1/signals/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        // Gerar UUID v4 para usuário anônimo ou usar o fornecido
        const userId = req.headers['x-user-id'] || crypto.randomUUID();

        // Buscar sinal
        const { data: signal, error: signalError } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', id)
            .single();

        if (signalError || !signal) {
            return res.status(404).json({ error: 'Sinal não encontrado' });
        }

        if (!signal.is_premium) {
            return res.status(400).json({ error: 'Este sinal é gratuito — não requer pagamento' });
        }

        // Verificar se já existe pagamento pendente
        const { data: existingPayment } = await supabase
            .from('pix_payments')
            .select('*')
            .eq('signal_id', id)
            .eq('user_id', userId)
            .eq('status', 'PENDING')
            .maybeSingle();

        if (existingPayment) {
            return res.json({
                success: true,
                payment: {
                    method: 'PIX',
                    amount_brl: existingPayment.amount_brl,
                    tx_id: existingPayment.pix_tx_id,
                    status: 'PENDING',
                    qr_code: existingPayment.pix_qr_code,
                    copy_paste: existingPayment.pix_copy_paste,
                    expires_at: existingPayment.expires_at
                },
                instructions: [
                    '1. Abra seu app bancário',
                    '2. Escaneie o QR Code ou cole o código PIX',
                    `3. Confirme o pagamento de R$ ${existingPayment.amount_brl}`,
                    '4. O sinal será desbloqueado automaticamente'
                ]
            });
        }

        // Criar novo PIX
        const txId = `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const amount = signal.unlock_price_brl || 29.90;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

        const qrCode = `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${amount.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO`;

        const { data: payment, error: paymentError } = await supabase
            .from('pix_payments')
            .insert({
                user_id: userId,
                signal_id: id,
                pix_tx_id: txId,
                amount_brl: amount,
                status: 'PENDING',
                expires_at: expiresAt.toISOString(),
                pix_qr_code: qrCode,
                pix_copy_paste: qrCode
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        console.log(`💰 PIX gerado: ${txId} — R$ ${amount}`);

        res.json({
            success: true,
            payment: {
                method: 'PIX',
                amount_brl: amount,
                tx_id: txId,
                status: 'PENDING',
                qr_code: qrCode,
                copy_paste: qrCode,
                expires_at: expiresAt.toISOString()
            },
            signal: {
                symbol: signal.symbol,
                side: signal.side,
                entry: [signal.entry_range_low, signal.entry_range_high]
            },
            instructions: [
                '✅ PIX gerado com sucesso!',
                '',
                '1. Abra seu aplicativo bancário',
                '2. Escaneie o QR Code ACIMA ou cole o código PIX',
                `3. Confirme o pagamento de R$ ${amount}`,
                '4. O sinal será desbloqueado AUTOMATICAMENTE',
                '',
                `⏰ Expira em: 30 minutos (${expiresAt.toLocaleTimeString('pt-BR')})`
            ],
            check_status_url: `/v1/signals/pix-status/${txId}`
        });
    } catch (error) {
        console.error('❌ Erro ao gerar PIX:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. CHECK PIX STATUS — Confirma pagamento
app.get('/v1/signals/pix-status/:txId', async (req, res) => {
    try {
        const { txId } = req.params;
        const userId = req.headers['x-user-id'] || 'anonymous';

        const { data: payment, error } = await supabase
            .from('pix_payments')
            .select('*, cornix_signals(id, symbol, side, entry_range_low, entry_range_high, target_1, target_2, target_3, target_4, target_5, stop_loss, leverage)')
            .eq('pix_tx_id', txId)
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }

        // Verificar expiração
        const isExpired = new Date(payment.expires_at) < new Date();
        
        if (isExpired && payment.status === 'PENDING') {
            await supabase
                .from('pix_payments')
                .update({ status: 'EXPIRED' })
                .eq('id', payment.id);

            return res.json({
                status: 'EXPIRED',
                message: '⚠️ Pagamento expirado. Gere um novo PIX.',
                expires_at: payment.expires_at
            });
        }

        // Se PAID, liberar acesso
        if (payment.status === 'PAID') {
            // Verificar se já concedeu acesso
            const { data: existingAccess } = await supabase
                .from('cornix_signal_access')
                .select('*')
                .eq('signal_id', payment.signal_id)
                .eq('user_id', userId)
                .maybeSingle();

            if (!existingAccess) {
                // Conceder acesso
                await supabase
                    .from('cornix_signal_access')
                    .insert({
                        signal_id: payment.signal_id,
                        user_id: userId,
                        payment_method: 'PIX',
                        payment_amount_brl: payment.amount_brl,
                        payment_tx_id: txId,
                        access_granted: true,
                        accessed_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });

                // Registrar venda no telemetry
                await supabase
                    .from('grafana_cornix_sales')
                    .insert({
                        signal_id: payment.signal_id,
                        symbol: payment.cornix_signals.symbol,
                        side: payment.cornix_signals.side,
                        unlock_price_brl: payment.amount_brl,
                        payment_status: 'PAID',
                        payment_method: 'PIX',
                        pix_tx_id: txId,
                        buyer_country: 'BR'
                    });

                console.log(`💰 VENDA REALIZADA: ${payment.cornix_signals.symbol} — R$ ${payment.amount_brl}`);
            }

            return res.json({
                success: true,
                status: 'PAID',
                access_granted: true,
                signal: {
                    symbol: payment.cornix_signals.symbol,
                    side: payment.cornix_signals.side
                },
                full_signal_url: `/v1/signals/${payment.signal_id}/full`,
                message: '🎉 Pagamento confirmado! Acesso concedido aos alvos completos.'
            });
        }

        // Ainda pendente
        res.json({
            status: 'PENDING',
            amount_brl: payment.amount_brl,
            expires_at: payment.expires_at,
            message: '⏳ Aguardando confirmação do pagamento PIX...',
            check_again_in: '5 segundos'
        });
    } catch (error) {
        console.error('❌ Erro ao verificar PIX:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. SINAL COMPLETO — Após pagamento
app.get('/v1/signals/:id/full', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] || 'anonymous';

        // Verificar acesso
        const { data: access, error: accessError } = await supabase
            .from('cornix_signal_access')
            .select('*')
            .eq('signal_id', id)
            .eq('user_id', userId)
            .eq('access_granted', true)
            .maybeSingle();

        const { data: signal, error: signalError } = await supabase
            .from('cornix_signals')
            .select('*')
            .eq('id', id)
            .single();

        if (signalError || !signal) {
            return res.status(404).json({ error: 'Sinal não encontrado' });
        }

        // Se não tem acesso e é premium
        if (!access && signal.is_premium) {
            return res.status(402).json({
                error: 'PAGAMENTO REQUERIDO',
                message: '🔒 Este é um sinal PREMIUM',
                price_brl: signal.unlock_price_brl,
                payment_url: `/v1/signals/${id}/pay`,
                preview: {
                    symbol: signal.symbol,
                    side: signal.side,
                    entry_price: signal.entry_price,
                    leverage: signal.leverage,
                    targets: '🔒 BLOQUEADO',
                    stop_loss: '🔒 BLOQUEADO'
                }
            });
        }

        // Acesso concedido — retornar sinal completo
        const targets = [signal.target_1, signal.target_2, signal.target_3, signal.target_4, signal.target_5]
            .filter(t => t !== null && t !== undefined);

        const cornixFormat = {
            symbol: signal.symbol,
            side: signal.side,
            entry: signal.entry_range_low && signal.entry_range_high 
                ? [signal.entry_range_low, signal.entry_range_high] 
                : signal.entry_price,
            targets: targets,
            stop: signal.stop_loss,
            leverage: signal.leverage,
            margin_type: signal.margin_type,
            strategy: signal.strategy,
            confidence: signal.confidence_score,
            signal_id: signal.signal_id
        };

        res.json({
            success: true,
            access_status: 'UNLOCKED',
            access_method: access?.payment_method || 'FREE',
            paid_amount: access?.payment_amount_brl || 0,
            signal: {
                id: signal.id,
                signal_id: signal.signal_id,
                symbol: signal.symbol,
                side: signal.side,
                entry_price: signal.entry_price,
                entry_range: [signal.entry_range_low, signal.entry_range_high],
                targets: targets,
                stop_loss: signal.stop_loss,
                leverage: signal.leverage,
                margin_type: signal.margin_type,
                strategy: signal.strategy,
                confidence_score: signal.confidence_score,
                risk_reward: signal.risk_reward,
                expires_at: signal.expires_at
            },
            cornix_format: cornixFormat,
            message: '✅ Sinal completo desbloqueado! Pronto para auto-trade.',
            webhook_ready: true
        });
    } catch (error) {
        console.error('❌ Erro ao obter sinal:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. LEADERBOARD — Ranking de performance
app.get('/v1/leaderboard', async (req, res) => {
    try {
        const { data: leaderboard, error } = await supabase
            .from('cornix_leaderboard')
            .select('*')
            .order('rank_position', { ascending: true })
            .limit(20);

        if (error) throw error;

        res.json({
            success: true,
            leaderboard: leaderboard || [],
            top_performer: leaderboard?.[0] || null,
            total_traders: leaderboard?.length || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. CRIAR SINAL (Internal)
app.post('/v1/signals', async (req, res) => {
    try {
        const internalKey = req.headers['x-internal-key'];
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            symbol, side, entry_price, entry_range_low, entry_range_high,
            targets, stop_loss, leverage = 10, is_premium = true,
            unlock_price_brl = 29.90, strategy, confidence_score
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
                unlock_price_brl: is_premium ? unlock_price_brl : 0,
                strategy,
                confidence_score,
                status: 'ACTIVE',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`📡 Sinal criado: ${signalId} — ${symbol} ${side} — R$ ${is_premium ? unlock_price_brl : 'FREE'}`);

        res.json({
            success: true,
            signal: signal,
            preview_url: `/v1/signals/cornix-ready`,
            payment_url: is_premium ? `/v1/signals/${signal.id}/pay` : null,
            message: is_premium 
                ? '💰 Sinal PREMIUM criado e pronto para venda!' 
                : '✅ Sinal gratuito criado!'
        });
    } catch (error) {
        console.error('❌ Erro ao criar sinal:', error);
        res.status(500).json({ error: error.message });
    }
});

// 8. SIMULAR PAGAMENTO PIX (para testes)
app.post('/v1/admin/simulate-pix-payment/:txId', async (req, res) => {
    try {
        const { txId } = req.params;
        const internalKey = req.headers['x-internal-key'];
        
        if (internalKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: payment, error } = await supabase
            .from('pix_payments')
            .update({
                status: 'PAID',
                paid_at: new Date().toISOString()
            })
            .eq('pix_tx_id', txId)
            .select()
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'PIX não encontrado' });
        }

        console.log(`🧪 PIX simulado como PAGO: ${txId}`);

        res.json({
            success: true,
            message: '💰 Pagamento PIX simulado com sucesso!',
            tx_id: txId,
            status: 'PAID',
            next_step: `GET /v1/signals/pix-status/${txId}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVIDOR NO AR
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ SERVIDOR GXEON CORNIX MONETIZATION OPERACIONAL');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📡 Sinais: http://localhost:${PORT}/v1/signals/live`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('💰 ENDPOINTS DE MONETIZAÇÃO:');
    console.log(`   GET  /v1/signals/cornix-ready     → Preview gratuito (targets bloqueados)`);
    console.log(`   GET  /v1/signals/:id/pay          → Gerar PIX (R$ 29,90)`);
    console.log(`   GET  /v1/signals/pix-status/:txId → Verificar pagamento`);
    console.log(`   GET  /v1/signals/:id/full         → Sinal completo (após pagamento)`);
    console.log(`   POST /v1/signals                  → Criar sinal (internal)`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🎯 PRONTO PARA MONETIZAR!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
});
