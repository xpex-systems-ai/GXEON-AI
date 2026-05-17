'use strict';

const crypto = require('node:crypto');
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { ensureWallet, transferCredits } = require('./creditRuntime.cjs');

function verifyWebhookSignature(rawBody = '', signature = '', secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '') {
  if (!secret) return true;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === digest;
}

function processWebhook(payload = {}, signature = '', rawBody = '') {
  const valid = verifyWebhookSignature(rawBody, signature);
  if (!valid) return { accepted: false, reason: 'INVALID_SIGNATURE' };

  const mem = readMemory();
  const processed = new Set(mem.webhook_processed_ids || []);
  const pending = mem.pending_pix_followups || [];
  const id = payload.id || payload.data?.id || `wh_${Date.now()}`;
  if (processed.has(id)) return { accepted: true, idempotent: true, id };

  processed.add(id);
  const events = [ ...(mem.financial_events || []), { id, payload, at: new Date().toISOString() } ].slice(-5000);
  const status = payload.status || payload.action || payload.type || '';
  const agentId = payload.metadata?.agent_id || payload.agent_id || 'agent_buyer_1';
  const amount = Number(payload.amount || payload.transaction_amount || 0);
  let creditActivation = null;

  if (String(status).toUpperCase().includes('APPROVED') && amount > 0) {
    ensureWallet('platform_treasury');
    ensureWallet(agentId);
    creditActivation = transferCredits({
      from_agent_id: 'platform_treasury',
      to_agent_id: agentId,
      amount,
      reason: 'PIX_TOPUP_APPROVED',
    });
  }
  if (String(status).toUpperCase().includes('PENDING')) {
    pending.unshift({
      payment_id: id,
      channel: payload.customer?.email ? 'EMAIL' : 'WHATSAPP',
      contact: payload.customer?.email || payload.customer?.phone || 'UNKNOWN',
      followup_status: 'QUEUED',
      created_at: new Date().toISOString(),
    });
  }

  writeMemory({
    webhook_processed_ids: Array.from(processed).slice(-5000),
    financial_events: events,
    pending_pix_followups: pending.slice(0, 5000),
    webhook_health: 'ACTIVE',
  });
  return { accepted: true, idempotent: false, id, credit_activation: creditActivation };
}

module.exports = { processWebhook };
