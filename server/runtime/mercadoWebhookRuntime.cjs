'use strict';

const crypto = require('node:crypto');
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { ensureWallet, transferCredits } = require('./creditRuntime.cjs');
const { activateSubscriptionFromPayment } = require('./subscriptionRuntime.cjs');

function verifyWebhookSignature(rawBody = '', signature = '', secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '') {
  if (!secret) return true;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = String(signature || '')
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.startsWith('v1='))?.replace('v1=', '') || String(signature || '').trim();
  if (!normalized) return false;
  const a = Buffer.from(digest);
  const b = Buffer.from(normalized);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function processWebhook(payload = {}, signature = '', rawBody = '') {
  const valid = verifyWebhookSignature(rawBody, signature);
  if (!valid) return { accepted: false, reason: 'INVALID_SIGNATURE' };

  const mem = readMemory();
  const processed = new Set(mem.webhook_processed_ids || []);
  const pending = mem.pending_pix_followups || [];
  const notifications = mem.revenue_notifications || [];
  const payments = mem.payments || [];
  const id = String(payload.id || payload.data?.id || payload.payment_id || `wh_${Date.now()}`);
  const idempotencyKey = `${String(payload.action || payload.type || 'PAYMENT_EVENT').toUpperCase()}::${id}`;
  if (processed.has(idempotencyKey)) return { accepted: true, idempotent: true, id };

  processed.add(idempotencyKey);
  const events = [ ...(mem.financial_events || []), { id, payload, at: new Date().toISOString() } ].slice(-5000);
  const status = String(payload.status || '').toUpperCase();
  const action = String(payload.action || payload.type || '').toUpperCase();
  const agentId = payload.metadata?.agent_id || payload.agent_id || 'agent_buyer_1';
  const amount = Number(payload.amount || payload.transaction_amount || payload.metadata?.amount || 0);
  const paymentType = String(payload.payment_type_id || payload.payment_type || payload.type || '').toUpperCase();
  const plan = String(payload.metadata?.plan || '').toUpperCase();
  let creditActivation = null;
  let subscriptionActivation = null;

  const approvedEvent = status === 'APPROVED' || action === 'PAYMENT.APPROVED';
  const pendingEvent = status === 'PENDING' || action.includes('PENDING');
  const isPix = paymentType.includes('PIX') || String(payload.metadata?.payment_method || '').toUpperCase() === 'PIX';
  if (approvedEvent && amount > 0) {
    ensureWallet('platform_treasury');
    ensureWallet(agentId);
    creditActivation = transferCredits({
      from_agent_id: 'platform_treasury',
      to_agent_id: agentId,
      amount,
      reason: isPix ? 'PIX_TOPUP_APPROVED' : 'PAYMENT_TOPUP_APPROVED',
    });
    if (plan === 'BASIC' || plan === 'PRO' || plan === 'ENTERPRISE') {
      subscriptionActivation = activateSubscriptionFromPayment({ agent_id: agentId, plan, payment_id: id, amount });
    }
  }
  if (pendingEvent && !pending.find((p) => p.payment_id === id && p.followup_status !== 'RESOLVED')) {
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
      payment_type: isPix ? 'PIX' : (paymentType || 'UNKNOWN'),
    });
  }
  const paymentIndex = payments.findIndex((p) => p.payment_id === id);
  if (paymentIndex >= 0) {
    payments[paymentIndex] = {
      ...payments[paymentIndex],
      status: approvedEvent ? 'APPROVED' : (pendingEvent ? 'PENDING' : payments[paymentIndex].status),
      updated_at: new Date().toISOString(),
      metadata: {
        ...(payments[paymentIndex].metadata || {}),
        webhook_action: action,
        payment_type: isPix ? 'PIX' : (paymentType || 'UNKNOWN'),
      },
    };
  }
  if (approvedEvent && creditActivation?.ok) {
    notifications.unshift({
      type: 'PIX_APPROVED_CREDIT_ACTIVATED',
      payment_id: id,
      agent_id: agentId,
      amount,
      payment_type: isPix ? 'PIX' : (paymentType || 'UNKNOWN'),
      created_at: new Date().toISOString(),
    });
  } else if (approvedEvent && !creditActivation?.ok) {
    notifications.unshift({
      type: 'PIX_APPROVED_CREDIT_ACTIVATION_FAILED',
      payment_id: id,
      agent_id: agentId,
      amount,
      code: creditActivation?.code || 'ACTIVATION_FAILED',
      created_at: new Date().toISOString(),
    });
  }

  writeMemory({
    webhook_processed_ids: Array.from(processed).slice(-5000),
    financial_events: events,
    payments: payments.slice(0, 5000),
    pending_pix_followups: pending.slice(0, 5000),
    revenue_notifications: notifications.slice(0, 5000),
    webhook_health: 'ACTIVE',
  });
  return { accepted: true, idempotent: false, id, credit_activation: creditActivation, subscription_activation: subscriptionActivation };
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
    if (item.next_retry_at && Date.parse(item.next_retry_at) > now) return item;
    const retryAt = new Date(now + (attempts * 2) * 60_000).toISOString();
    const status = attempts >= 4 ? 'ESCALATED' : 'RETRY_QUEUED';
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
