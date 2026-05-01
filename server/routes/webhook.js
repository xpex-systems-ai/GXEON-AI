#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON WEBHOOK ROUTES - PRODUCTION HARDENED
 * MercadoPago webhook handler with signature validation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { mpPayments } from '../services/mercadoPagoReal.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// MERCADO PAGO WEBHOOK - ÚNICA FORMA DE CONFIRMAR PAGAMENTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /v1/webhook/mercadopago
 * Recebe notificações de pagamento do MercadoPago
 * 
 * SECURITY:
 * - Source IP validation (optional)
 * - Signature validation (if configured)
 * - Idempotency check
 */
router.post('/mercadopago', async (req, res) => {
  try {
    console.log('[📬 WEBHOOK] Received at:', new Date().toISOString());
    console.log('[📬 WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
    
    // IMMEDIATE ACK (MercadoPago requires 200 OK quickly)
    res.status(200).json({ received: true });
    
    // Process async after responding
    const payload = req.body;
    
    // Log para auditoria
    console.log('[📬 WEBHOOK] Payload:', JSON.stringify(payload, null, 2));
    
    // Processar pagamento
    const result = await mpPayments.processWebhook(payload, req.headers);
    
    console.log('[✅ WEBHOOK] Processed:', result);
    
  } catch (error) {
    // Already responded with 200, just log the error
    console.error('[❌ WEBHOOK] Processing error:', error.message);
    console.error('[❌ WEBHOOK] Stack:', error.stack);
    
    // Não enviar resposta de erro - já enviamos 200
    // MercadoPago vai retry automaticamente se necessário
  }
});

/**
 * GET /v1/webhook/mercadopago
 * Para validação do MercadoPago (challenge-response)
 */
router.get('/mercadopago', (req, res) => {
  console.log('[📬 WEBHOOK] Challenge received:', req.query);
  
  // MercadoPago sometimes sends challenge for webhook validation
  if (req.query.challenge) {
    return res.status(200).send(req.query.challenge);
  }
  
  res.status(200).json({ status: 'webhook active', timestamp: new Date().toISOString() });
});

/**
 * POST /v1/payment/create
 * Cria pagamento PIX real
 * 
 * BODY: {
 *   actor_code: string (required),
 *   amount: number (required),
 *   payer_email: string (required),
 *   payer_name: string (optional),
 *   tier: 'PRO' | 'ENTERPRISE' (default: PRO)
 * }
 */
router.post('/payment/create', async (req, res) => {
  try {
    console.log('[💰 PAYMENT] Create request:', req.body);
    
    const result = await mpPayments.createPixPayment(req.body);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('[❌ PAYMENT] Create error:', error.message);
    
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /v1/payment/status/:external_reference
 * Consulta status de pagamento
 */
router.get('/payment/status/:external_reference', async (req, res) => {
  try {
    const { external_reference } = req.params;
    
    const db = (await import('../services/mercadoPagoReal.js')).getSupabase?.() || 
               (await import('@supabase/supabase-js')).createClient(
                 process.env.SUPABASE_PROJECT_URL,
                 process.env.SUPABASE_SERVICE_ROLE_KEY
               );
    
    const { data: transaction, error } = await db
      .from('transactions')
      .select('*')
      .eq('external_reference', external_reference)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.status(200).json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        actor_code: transaction.actor_code,
        tier: transaction.tier,
        created_at: transaction.created_at,
        paid_at: transaction.paid_at,
        pix_copy_paste: transaction.status === 'PENDING' ? transaction.pix_copy_paste : null
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /v1/payment/health
 * Health check do sistema de pagamentos
 */
router.get('/payment/health', (req, res) => {
  const envValid = !!(
    process.env.MERCADO_PAGO_ACCESS_TOKEN &&
    process.env.PIX_RECEIVER_KEY &&
    process.env.SUPABASE_PROJECT_URL
  );
  
  res.status(200).json({
    status: envValid ? 'healthy' : 'degraded',
    pix_enabled: envValid,
    timestamp: new Date().toISOString()
  });
});

export default router;
