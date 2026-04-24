/**
 * ⛽ ALCHEMY GAS CREDITS WEBHOOK
 * 
 * Recebe notificações de aprovação e consumo de créditos
 * da Alchemy Developer Portal.
 * 
 * Arquiteto: Júnior Sena — Sovereign AI Architect
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../services/supabase');

// 🎯 Alchemy Webhook Secret (configurar no .env)
const ALCHEMY_WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET || '';

/**
 * 🔐 Verificar assinatura do webhook
 */
function verifyWebhookSignature(payload, signature) {
  if (!ALCHEMY_WEBHOOK_SECRET) {
    console.log('[ALCHEMY_WEBHOOK] ⚠️ No secret configured, skipping verification');
    return true; // Em desenvolvimento
  }
  
  const expected = crypto
    .createHmac('sha256', ALCHEMY_WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * 📊 Log webhook event
 */
async function logWebhookEvent(event) {
  try {
    await supabase.from('alchemy_webhook_log').insert({
      event_type: event.type,
      event_data: event,
      received_at: new Date().toISOString(),
      processed: false
    });
  } catch (error) {
    console.error('[ALCHEMY_WEBHOOK] Log error:', error.message);
  }
}

/**
 * 💰 Process credit approval
 */
async function processCreditApproval(data) {
  const { credit_amount, currency, validity_months, approved_at } = data;
  
  console.log('[ALCHEMY_WEBHOOK] ✅ CREDIT APPROVED');
  console.log(`  Amount: ${credit_amount} ${currency}`);
  console.log(`  Validity: ${validity_months} months`);
  console.log(`  Approved at: ${approved_at}`);
  
  // Notificar sistema
  await supabase.from('system_notifications').insert({
    type: 'alchemy_credit_approved',
    title: 'Gas Credits Approved',
    message: `${credit_amount} ${currency} approved for 12 months`,
    severity: 'info',
    data: { credit_amount, currency, validity_months }
  });
  
  return {
    status: 'approved',
    amount: credit_amount,
    currency,
    action: 'ready_for_deployment'
  };
}

/**
 * ⚠️ Process threshold alert
 */
async function processThresholdAlert(data) {
  const { remaining_credits, threshold_percent } = data;
  
  console.log('[ALCHEMY_WEBHOOK] ⚠️ THRESHOLD ALERT');
  console.log(`  Remaining: ${remaining_credits}`);
  console.log(`  Threshold: ${threshold_percent}%`);
  
  // Alerta crítico se < 20%
  if (threshold_percent < 20) {
    await supabase.from('system_notifications').insert({
      type: 'alchemy_credit_low',
      title: 'Gas Credits Running Low',
      message: `Only ${remaining_credits} credits remaining`,
      severity: 'warning',
      data: { remaining_credits, threshold_percent }
    });
  }
  
  return {
    status: 'alert',
    remaining: remaining_credits,
    action: 'monitor_consumption'
  };
}

/**
 * 🎯 POST /webhooks/alchemy-credits
 * Recebe eventos da Alchemy
 */
router.post('/alchemy-credits', async (req, res) => {
  try {
    const signature = req.headers['x-alchemy-signature'] || '';
    const payload = JSON.stringify(req.body);
    
    // Verificar assinatura
    if (!verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed'
      });
    }
    
    const event = req.body;
    const { type, data } = event;
    
    console.log('[ALCHEMY_WEBHOOK] 📨 Event received:', type);
    
    // Log event
    await logWebhookEvent(event);
    
    // Processar por tipo
    let result;
    switch (type) {
      case 'credit_approved':
        result = await processCreditApproval(data);
        break;
        
      case 'credit_consumed':
        console.log('[ALCHEMY_WEBHOOK] 💳 Credit consumed:', data.amount);
        result = { status: 'consumed', amount: data.amount };
        break;
        
      case 'threshold_alert':
        result = await processThresholdAlert(data);
        break;
        
      default:
        result = { status: 'ignored', type };
    }
    
    res.status(200).json({
      received: true,
      type,
      processed: result
    });
    
  } catch (error) {
    console.error('[ALCHEMY_WEBHOOK] ❌ Error:', error.message);
    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: error.message
    });
  }
});

/**
 * 📊 GET /webhooks/alchemy-credits/status
 * Status dos créditos
 */
router.get('/alchemy-credits/status', async (req, res) => {
  try {
    // Buscar último evento de aprovação
    const { data: lastApproval } = await supabase
      .from('alchemy_webhook_log')
      .select('*')
      .eq('event_type', 'credit_approved')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();
    
    // Buscar consumo total
    const { data: consumed } = await supabase
      .from('alchemy_webhook_log')
      .select('*')
      .eq('event_type', 'credit_consumed');
    
    const totalConsumed = consumed?.reduce((sum, e) => sum + (e.event_data?.data?.amount || 0), 0) || 0;
    const totalApproved = lastApproval?.event_data?.data?.credit_amount || 0;
    
    res.json({
      protocol: 'ALCHEMY_GAS_WEBHOOK',
      treasury: '0x3955d559055DadB7067054cB6E6f974710345224',
      credits: {
        approved: totalApproved,
        consumed: totalConsumed,
        remaining: totalApproved - totalConsumed,
        currency: lastApproval?.event_data?.data?.currency || 'ETH'
      },
      last_event: lastApproval?.received_at || null,
      status: totalApproved > 0 ? 'ACTIVE' : 'PENDING_APPROVAL'
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'STATUS_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
