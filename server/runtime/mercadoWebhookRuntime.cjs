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
  const status = String(payload.status || '').toUpperCase();
  const action = String(payload.action || payload.type || '').toUpperCase();
  const agentId = payload.metadata?.agent_id || payload.agent_id || 'agent_buyer_1';
  const amount = Number(payload.amount || payload.transaction_amount || 0);
  let creditActivation = null;

  const approvedEvent = status === 'APPROVED' || action === 'PAYMENT.APPROVED';
  const pendingEvent = status === 'PENDING' || action.includes('PENDING');
  if (approvedEvent && amount > 0) {
    ensureWallet('platform_treasury');
    ensureWallet(agentId);
    creditActivation = transferCredits({
      from_agent_id: 'platform_treasury',
      to_agent_id: agentId,
      amount,
      reason: 'PIX_TOPUP_APPROVED',
    });
  }
  if (pendingEvent) {
    pending.unshift({
      payment_id: id,
      channels: [
        payload.customer?.phone ? 'WHATSAPP' : null,
        payload.customer?.email ? 'EMAIL' : null,
      ].filter(Boolean),
      contact: {
        email: payload.customer?.email || null,
        phone: payload.customer?.phone || null,
      },
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

function processPendingPixFollowups(input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 20), 200));
  const mem = readMemory();
  const rows = mem.pending_pix_followups || [];
  const now = Date.now();
  const processed = [];
  const next = rows.map((item) => {
    if (processed.length >= limit) return item;
    if (item.followup_status === 'RESOLVED') return item;
    const attempts = Number(item.attempts || 0) + 1;
    const retryAt = new Date(now + (attempts * 2) * 60_000).toISOString();
    const status = attempts >= 3 ? 'ESCALATED' : 'RETRY_QUEUED';
    const channels = item.channels || [];
    const dispatch = channels.map((ch) => ({ channel: ch, dispatched: true }));
    processed.push({ payment_id: item.payment_id, attempts, status, dispatch });
    return {
      ...item,
      attempts,
      dispatch,
      last_attempt_at: new Date(now).toISOString(),
      next_retry_at: retryAt,
      followup_status: status,
    };
  });
  writeMemory({ pending_pix_followups: next.slice(0, 5000) });
  return { followup_processor: 'ACTIVE', processed_count: processed.length, processed };
}

module.exports = { processWebhook, processPendingPixFollowups };
