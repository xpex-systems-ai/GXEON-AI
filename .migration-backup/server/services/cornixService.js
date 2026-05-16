/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORNIX SERVICE v1.0 — Trading Signal Monetization Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Responsibilities:
 * - Generate Cornix-compatible trading signals
 * - Handle free vs premium signal logic
 * - Process PIX payments for unlock
 * - Auto-feed to Cornix webhooks
 * - Performance tracking for leaderboard
 */

import supabase from './supabase.js';
import crypto from 'crypto';
import { recordCornixSale, updateFinancialMetrics } from './cornixTelemetry.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const CORNIX_CONFIG = {
    default_leverage: 10,
    default_margin: 'ISOLATED',
    default_unlock_price: 29.90, // BRL
    pix_expiry_minutes: 30,
    max_targets: 5,
    webhook_timeout: 10000,
    retry_attempts: 3,
    retry_delay: 5000
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new trading signal
 * @param {Object} signalData - Raw signal data
 * @returns {Promise<Object>} Created signal
 */
async function createSignal(signalData) {
    const {
        symbol,
        side,
        entry_price,
        entry_range_low,
        entry_range_high,
        targets,
        stop_loss,
        leverage = CORNIX_CONFIG.default_leverage,
        margin_type = CORNIX_CONFIG.default_margin,
        is_premium = false,
        unlock_price_brl = CORNIX_CONFIG.default_unlock_price,
        strategy,
        timeframe,
        confidence_score,
        source = 'AI_GENERATED',
        generated_by_agent,
        expires_at
    } = signalData;

    // Validate targets
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        throw new Error('At least one target is required');
    }

    if (targets.length > CORNIX_CONFIG.max_targets) {
        throw new Error(`Maximum ${CORNIX_CONFIG.max_targets} targets allowed`);
    }

    // Format targets for database
    const targetFields = {};
    targets.forEach((target, index) => {
        targetFields[`target_${index + 1}`] = target;
    });

    // Calculate risk/reward ratio
    const avgEntry = entry_range_low && entry_range_high 
        ? (entry_range_low + entry_range_high) / 2 
        : entry_price;
    const risk = Math.abs(avgEntry - stop_loss);
    const reward = Math.abs(targets[0] - avgEntry);
    const risk_reward = risk > 0 ? reward / risk : 0;

    // Default expiry: 24 hours
    const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: signal, error } = await supabase
        .from('cornix_signals')
        .insert({
            symbol: symbol.toUpperCase(),
            side: side.toUpperCase(),
            entry_price,
            entry_range_low,
            entry_range_high,
            ...targetFields,
            stop_loss,
            leverage,
            margin_type,
            is_premium,
            unlock_price_brl: is_premium ? unlock_price_brl : 0,
            status: 'ACTIVE',
            expires_at: expires_at || defaultExpiry.toISOString(),
            strategy,
            timeframe,
            confidence_score,
            risk_reward: risk_reward.toFixed(2),
            source,
            generated_by_agent
        })
        .select()
        .single();

    if (error) {
        console.error('[CORNIX] Error creating signal:', error);
        throw new Error(`Failed to create signal: ${error.message}`);
    }

    // Trigger webhook deliveries for this signal
    await triggerWebhookDeliveries(signal);

    return signal;
}

/**
 * Get signal in free preview format (locked targets/stop)
 * @param {string} signalId - Signal UUID or signal_id
 * @returns {Promise<Object>} Free preview signal
 */
async function getFreeSignal(signalId) {
    const { data: signal, error } = await supabase
        .from('cornix_signals')
        .select('id, signal_id, symbol, side, entry_price, entry_range_low, entry_range_high, leverage, margin_type, is_premium, unlock_price_brl, status, expires_at, strategy, timeframe, confidence_score, created_at')
        .or(`id.eq.${signalId},signal_id.eq.${signalId}`)
        .eq('status', 'ACTIVE')
        .single();

    if (error) {
        throw new Error('Signal not found');
    }

    // Return locked format for free users
    return {
        ...signal,
        targets: 'LOCKED',
        stop_loss: 'LOCKED',
        unlock_status: signal.is_premium ? 'PREMIUM' : 'FREE',
        message: signal.is_premium 
            ? `Desbloqueie por R$ ${signal.unlock_price_brl} via PIX para ver alvos e stop`
            : 'Sinal gratuito - aguardando ativação'
    };
}

/**
 * Get full signal after payment verification
 * @param {string} signalId - Signal UUID or signal_id
 * @param {string} userId - User requesting access
 * @returns {Promise<Object>} Full signal with targets and stop
 */
async function getFullSignal(signalId, userId) {
    // Check if user has access
    const { data: access, error: accessError } = await supabase
        .from('cornix_signal_access')
        .select('*')
        .eq('signal_id', signalId)
        .eq('user_id', userId)
        .eq('access_granted', true)
        .maybeSingle();

    // Get signal data
    const { data: signal, error } = await supabase
        .from('cornix_signals')
        .select('*')
        .or(`id.eq.${signalId},signal_id.eq.${signalId}`)
        .single();

    if (error) {
        throw new Error('Signal not found');
    }

    // If free signal or user has access, return full data
    if (!signal.is_premium || (access && access.access_granted)) {
        return {
            ...signal,
            access_status: 'UNLOCKED',
            targets: [
                signal.target_1,
                signal.target_2,
                signal.target_3,
                signal.target_4,
                signal.target_5
            ].filter(Boolean),
            message: 'Sinal completo desbloqueado'
        };
    }

    // User doesn't have access
    return {
        id: signal.id,
        signal_id: signal.signal_id,
        symbol: signal.symbol,
        side: signal.side,
        entry_price: signal.entry_price,
        leverage: signal.leverage,
        is_premium: true,
        unlock_price_brl: signal.unlock_price_brl,
        access_status: 'LOCKED',
        payment_required: true,
        pix_payment_url: `/v1/signals/${signalId}/pay`,
        targets: 'LOCKED',
        stop_loss: 'LOCKED',
        message: `Desbloqueie por R$ ${signal.unlock_price_brl} via PIX`
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PIX PAYMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate PIX payment for signal unlock
 * @param {string} signalId - Signal to unlock
 * @param {string} userId - User requesting
 * @returns {Promise<Object>} PIX payment data
 */
async function createPixPayment(signalId, userId) {
    // Get signal price
    const { data: signal, error } = await supabase
        .from('cornix_signals')
        .select('id, is_premium, unlock_price_brl, symbol')
        .or(`id.eq.${signalId},signal_id.eq.${signalId}`)
        .single();

    if (error || !signal) {
        throw new Error('Signal not found');
    }

    if (!signal.is_premium) {
        throw new Error('This signal is free and does not require payment');
    }

    // Check if already has access
    const { data: existingAccess } = await supabase
        .from('cornix_signal_access')
        .select('*')
        .eq('signal_id', signal.id)
        .eq('user_id', userId)
        .eq('access_granted', true)
        .maybeSingle();

    if (existingAccess) {
        return {
            already_paid: true,
            message: 'Você já possui acesso a este sinal',
            signal_id: signalId
        };
    }

    // Generate PIX transaction
    const pixTxId = `PIX_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + CORNIX_CONFIG.pix_expiry_minutes * 60 * 1000);

    // Create PIX payment record
    const { data: payment, error: paymentError } = await supabase
        .from('pix_payments')
        .insert({
            user_id: userId,
            signal_id: signal.id,
            pix_tx_id: pixTxId,
            amount_brl: signal.unlock_price_brl,
            status: 'PENDING',
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

    if (paymentError) {
        throw new Error('Failed to create PIX payment');
    }

    // TODO: Integrate with real PIX provider (PagSeguro, MercadoPago, etc)
    // For now, return simulated PIX data
    const pixData = {
        tx_id: pixTxId,
        amount: signal.unlock_price_brl,
        currency: 'BRL',
        expires_at: expiresAt.toISOString(),
        qr_code: generateSimulatedQRCode(pixTxId, signal.unlock_price_brl),
        copy_paste: generateSimulatedCopyPaste(pixTxId, signal.unlock_price_brl),
        status: 'PENDING',
        check_url: `/v1/signals/pix-status/${pixTxId}`,
        signal_preview: {
            symbol: signal.symbol,
            message: `Desbloquear sinal ${signal.symbol} - R$ ${signal.unlock_price_brl}`
        }
    };

    // Update payment with QR code
    await supabase
        .from('pix_payments')
        .update({
            pix_qr_code: pixData.qr_code,
            pix_copy_paste: pixData.copy_paste
        })
        .eq('id', payment.id);

    return pixData;
}

/**
 * Check PIX payment status and grant access if paid
 * @param {string} pixTxId - PIX transaction ID
 * @param {string} userId - User checking status
 * @returns {Promise<Object>} Payment status
 */
async function checkPixStatus(pixTxId, userId) {
    const { data: payment, error } = await supabase
        .from('pix_payments')
        .select('*, cornix_signals(id, symbol)')
        .eq('pix_tx_id', pixTxId)
        .single();

    if (error || !payment) {
        throw new Error('Payment not found');
    }

    // Verify user owns this payment
    if (payment.user_id !== userId) {
        throw new Error('Unauthorized');
    }

    // TODO: Check with real PIX provider for actual payment status
    // For simulation, auto-approve if expired
    const isExpired = new Date(payment.expires_at) < new Date();
    
    if (isExpired && payment.status === 'PENDING') {
        await supabase
            .from('pix_payments')
            .update({ status: 'EXPIRED' })
            .eq('id', payment.id);
        
        return {
            status: 'EXPIRED',
            message: 'Pagamento expirado. Gere um novo PIX.',
            expires_at: payment.expires_at
        };
    }

    // If paid, grant access
    if (payment.status === 'PAID') {
        // Check if access already granted
        const { data: existingAccess } = await supabase
            .from('cornix_signal_access')
            .select('*')
            .eq('signal_id', payment.signal_id)
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingAccess) {
            // Grant access
            await supabase
                .from('cornix_signal_access')
                .insert({
                    signal_id: payment.signal_id,
                    user_id: userId,
                    payment_method: 'PIX',
                    payment_amount_brl: payment.amount_brl,
                    payment_tx_id: pixTxId,
                    access_granted: true,
                    accessed_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days access
                });

            // 🎯 INTEGRAÇÃO ALL-SEEING EYE — Registrar venda no dashboard
            try {
                await recordCornixSale(
                    {
                        signal_id: payment.signal_id,
                        symbol: payment.cornix_signals?.symbol || 'UNKNOWN',
                        side: 'LONG', // Default, pode ser melhorado
                        unlock_price_brl: payment.amount_brl
                    },
                    {
                        status: 'PAID',
                        method: 'PIX',
                        tx_id: pixTxId
                    },
                    {
                        region: 'Brazil',
                        country: 'BR',
                        source: 'cornix_api'
                    }
                );
                
                // Atualizar métricas financeiras em tempo real
                await updateFinancialMetrics();
                
                console.log(`💰 [CornixService] Venda registrada no All-Seeing Eye: ${pixTxId}`);
            } catch (telemetryError) {
                // Não falhar o fluxo principal se telemetry falhar
                console.warn('⚠️ [CornixService] Falha ao registrar telemetry:', telemetryError.message);
            }
        }

        return {
            status: 'PAID',
            access_granted: true,
            signal_id: payment.signal_id,
            full_signal_url: `/v1/signals/${payment.signal_id}/full`,
            message: 'Pagamento confirmado! Acesso concedido.'
        };
    }

    return {
        status: payment.status,
        amount: payment.amount_brl,
        expires_at: payment.expires_at,
        signal_id: payment.signal_id,
        message: 'Aguardando pagamento PIX...'
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK AUTO-FEED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trigger webhook deliveries for a new signal
 * @param {Object} signal - Signal data
 */
async function triggerWebhookDeliveries(signal) {
    try {
        // Get all active webhooks subscribed to this symbol
        const { data: webhooks, error } = await supabase
            .from('cornix_user_webhooks')
            .select('*')
            .eq('is_active', true)
            .contains('symbols', [signal.symbol]);

        if (error || !webhooks || webhooks.length === 0) {
            return;
        }

        // Create delivery records
        const deliveries = webhooks.map(webhook => ({
            signal_id: signal.id,
            webhook_url: webhook.webhook_url,
            status: 'PENDING',
            max_retries: CORNIX_CONFIG.retry_attempts,
            request_payload: formatCornixPayload(signal, webhook)
        }));

        const { data: deliveryRecords, error: insertError } = await supabase
            .from('cornix_webhook_deliveries')
            .insert(deliveries)
            .select();

        if (insertError) {
            console.error('[CORNIX] Error creating webhook deliveries:', insertError);
            return;
        }

        // Process deliveries asynchronously
        deliveryRecords.forEach(delivery => {
            processWebhookDelivery(delivery.id);
        });

    } catch (error) {
        console.error('[CORNIX] Error triggering webhooks:', error);
    }
}

/**
 * Process a single webhook delivery with retries
 * @param {string} deliveryId - Delivery record ID
 */
async function processWebhookDelivery(deliveryId) {
    try {
        const { data: delivery, error } = await supabase
            .from('cornix_webhook_deliveries')
            .select('*, cornix_signals(*)')
            .eq('id', deliveryId)
            .single();

        if (error || !delivery) return;

        // Update attempt count
        await supabase
            .from('cornix_webhook_deliveries')
            .update({
                attempt_count: delivery.attempt_count + 1,
                last_attempt_at: new Date().toISOString()
            })
            .eq('id', deliveryId);

        // Attempt delivery
        const response = await fetch(delivery.webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Cornix-Signal': 'true',
                'X-Delivery-Id': deliveryId
            },
            body: JSON.stringify(delivery.request_payload),
            timeout: CORNIX_CONFIG.webhook_timeout
        });

        const responseBody = await response.text();

        if (response.ok) {
            // Success
            await supabase
                .from('cornix_webhook_deliveries')
                .update({
                    status: 'DELIVERED',
                    response_status: response.status,
                    response_body: responseBody,
                    delivered_at: new Date().toISOString()
                })
                .eq('id', deliveryId);

            // Update webhook stats
            await updateWebhookStats(delivery.webhook_url, true);
        } else {
            throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }

    } catch (error) {
        console.error(`[CORNIX] Webhook delivery failed for ${deliveryId}:`, error.message);

        // Check if should retry
        const { data: currentDelivery } = await supabase
            .from('cornix_webhook_deliveries')
            .select('attempt_count, max_retries')
            .eq('id', deliveryId)
            .single();

        if (currentDelivery && currentDelivery.attempt_count < currentDelivery.max_retries) {
            // Schedule retry
            setTimeout(() => {
                processWebhookDelivery(deliveryId);
            }, CORNIX_CONFIG.retry_delay);

            await supabase
                .from('cornix_webhook_deliveries')
                .update({
                    status: 'RETRYING',
                    error_message: error.message
                })
                .eq('id', deliveryId);
        } else {
            // Max retries reached
            await supabase
                .from('cornix_webhook_deliveries')
                .update({
                    status: 'FAILED',
                    error_message: error.message
                })
                .eq('id', deliveryId);

            await updateWebhookStats(delivery.webhook_url, false);
        }
    }
}

/**
 * Format signal as Cornix-compatible payload
 * @param {Object} signal - Signal from database
 * @param {Object} webhook - Webhook configuration
 * @returns {Object} Cornix-formatted payload
 */
function formatCornixPayload(signal, webhook) {
    const targets = [
        signal.target_1,
        signal.target_2,
        signal.target_3,
        signal.target_4,
        signal.target_5
    ].filter(Boolean);

    return {
        // Cornix Standard Format
        symbol: signal.symbol,
        side: signal.side,
        entry: signal.entry_range_low && signal.entry_range_high 
            ? [signal.entry_range_low, signal.entry_range_high]
            : signal.entry_price,
        targets: targets,
        stop: signal.stop_loss,
        leverage: signal.leverage,
        
        // Metadata
        signal_id: signal.signal_id,
        strategy: signal.strategy,
        timeframe: signal.timeframe,
        confidence: signal.confidence_score,
        generated_at: signal.created_at,
        
        // Premium flag
        is_premium: signal.is_premium,
        
        // GXEON-specific
        source: 'GXEON_AI',
        version: '1.0'
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD & PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record signal performance (WIN/LOSS)
 * @param {string} signalId - Signal ID
 * @param {Object} performance - Performance data
 */
async function recordPerformance(signalId, performance) {
    const {
        result, // 'WIN', 'LOSS', 'PENDING'
        profit_percent,
        filled_target,
        exit_price,
        exit_time,
        verified = false
    } = performance;

    // Update signal
    const updateData = {
        result,
        profit_percent,
        filled_target,
        status: result === 'WIN' || result === 'LOSS' ? 'COMPLETED' : 'FILLED'
    };

    if (exit_time) {
        updateData.completed_at = exit_time;
    }

    await supabase
        .from('cornix_signals')
        .update(updateData)
        .eq('id', signalId);

    // Create performance record
    await supabase
        .from('cornix_performance')
        .insert({
            signal_id: signalId,
            exit_time,
            exit_price_actual: exit_price,
            profit_percent,
            verified,
            verification_source: verified ? 'MANUAL' : null
        });

    // Recalculate leaderboard
    await recalculateLeaderboard();
}

/**
 * Get leaderboard data
 * @param {string} period - 'DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'
 * @param {number} limit - Number of entries
 * @returns {Promise<Array>} Leaderboard entries
 */
async function getLeaderboard(period = 'MONTHLY', limit = 50) {
    const { data, error } = await supabase
        .from('cornix_leaderboard')
        .select('*')
        .eq('period_type', period)
        .order('rank_position', { ascending: true })
        .limit(limit);

    if (error) {
        throw new Error('Failed to fetch leaderboard');
    }

    return data || [];
}

/**
 * Recalculate leaderboard (can be called periodically)
 */
async function recalculateLeaderboard() {
    try {
        // Call the database function to recalculate
        await supabase.rpc('recalculate_leaderboard');
    } catch (error) {
        console.error('[CORNIX] Error recalculating leaderboard:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateSimulatedQRCode(txId, amount) {
    // Simulated QR code data
    return `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${amount.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO`;
}

function generateSimulatedCopyPaste(txId, amount) {
    // Simulated PIX copy-paste code
    return `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${amount.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO621305${txId}`;
}

async function updateWebhookStats(webhookUrl, success) {
    try {
        const { data: webhook } = await supabase
            .from('cornix_user_webhooks')
            .select('total_deliveries, failed_deliveries')
            .eq('webhook_url', webhookUrl)
            .single();

        if (webhook) {
            await supabase
                .from('cornix_user_webhooks')
                .update({
                    total_deliveries: webhook.total_deliveries + 1,
                    failed_deliveries: success ? webhook.failed_deliveries : webhook.failed_deliveries + 1,
                    last_delivery_at: new Date().toISOString()
                })
                .eq('webhook_url', webhookUrl);
        }
    } catch (error) {
        console.error('[CORNIX] Error updating webhook stats:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export const cornixService = {
    createSignal,
    getFreeSignal,
    getFullSignal,
    createPixPayment,
    checkPixStatus,
    recordPerformance,
    getLeaderboard,
    recalculateLeaderboard,
    triggerWebhookDeliveries,
    formatCornixPayload,
    CORNIX_CONFIG
};
