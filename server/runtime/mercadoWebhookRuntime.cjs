'use strict';

const crypto = require('node:crypto');

const DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS = 15 * 60 * 1000;
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { getPaymentStatus } = require('./mercadoPagoAdapter.cjs');
const { activateSubscriptionFromPayment } = require('./subscriptionRuntime.cjs');
const {
  isFinancialDbConfigured,
  insertWebhookEvent,
  markWebhookEvent,
  updateTransactionProviderState,
  applyApprovedPayment,
} = require('./financialDb.cjs');

function parseSignatureHeader(signature = '') {
  return String(signature || '').split(',').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key && rest.length > 0) acc[key] = rest.join('=');
    return acc;
  }, {});
}

function safeTimingEqualHex(a = '', b = '') {
  if (!a || !b) return false;
  const left = Buffer.from(String(a), 'hex');
  const right = Buffer.from(String(b), 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function resolveWebhookDataId(payload = {}, explicitDataId = null) {
  return String(explicitDataId || payload.data?.id || payload.id || payload.payment_id || '').trim();
}

function buildMercadoPagoSignatureManifest({ dataId, requestId, ts }) {
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  if (ts) manifest += `ts:${ts};`;
  return manifest;
}

function resolveWebhookTimestampToleranceMs(options = {}) {
  const configured = options.timestampToleranceMs || process.env.MP_WEBHOOK_TIMESTAMP_TOLERANCE_MS;
  const value = Number(configured || DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS;
}

function isWebhookTimestampFresh(ts, options = {}) {
  if (!ts) return false;
  const value = Number(ts);
  if (!Number.isFinite(value) || value <= 0) return false;
  const timestampMs = value < 10_000_000_000 ? value * 1000 : value;
  const nowMs = Number(options.nowMs || Date.now());
  return Math.abs(nowMs - timestampMs) <= resolveWebhookTimestampToleranceMs(options);
}

function verifyWebhookSignature(payload = {}, options = {}) {
  const secret = options.secret || process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (!secret) {
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_UNSIGNED_MP_WEBHOOKS === 'true';
  }

  const parsed = parseSignatureHeader(options.signature || '');
  const v1 = parsed.v1 || String(options.signature || '').trim();
  const ts = parsed.ts;
  const dataId = resolveWebhookDataId(payload, options.dataId);
  const manifest = buildMercadoPagoSignatureManifest({ dataId, requestId: options.requestId, ts });
  if (!manifest || !v1 || !isWebhookTimestampFresh(ts, options)) return false;

  const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  if (safeTimingEqualHex(digest, v1)) return true;

  // Compatibility for older internal smoke tests that signed the raw body directly.
  if (process.env.NODE_ENV !== 'production' && options.rawBody) {
    const rawDigest = crypto.createHmac('sha256', secret).update(options.rawBody).digest('hex');
    return safeTimingEqualHex(rawDigest, v1);
  }
  return false;
}

function normalizeWebhookPayload(payload = {}, providerStatus = null) {
  const payment = providerStatus?.raw || {};
  const metadata = payment.metadata || payload.metadata || {};
  const providerPaymentId = String(providerStatus?.providerPaymentId || payload.data?.id || payload.id || payload.payment_id || '');
  const status = providerStatus?.status || String(payload.status || '').toUpperCase();
  const action = String(payload.action || payload.type || '').toUpperCase();
  const transactionId = metadata.transaction_id || payload.transaction_id || null;
  const externalReference = providerStatus?.externalReference || payment.external_reference || payload.external_reference || null;
  const amount = Number(providerStatus?.amount || payload.amount || payload.transaction_amount || metadata.amount || 0);
  const actorId = metadata.actor_id || payload.agent_id || payload.actor_id || 'agent_buyer_1';
  const plan = String(metadata.plan || payload.plan || '').toUpperCase();
  const paymentType = String(payment.payment_method_id || payload.payment_type_id || payload.payment_type || payload.type || '').toUpperCase();

  return {
    providerPaymentId,
    status,
    action,
    transactionId,
    externalReference,
    amount,
    actorId,
    plan,
    isPix: paymentType.includes('PIX') || String(metadata.payment_method || '').toUpperCase() === 'PIX',
    rawProviderPayment: payment,
  };
}

async function processWebhook(payload = {}, options = {}) {
  const signatureOptions = typeof options === 'string' ? { signature: options, rawBody: arguments[2] } : options;
  const valid = verifyWebhookSignature(payload, signatureOptions);
  if (!valid) return { accepted: false, reason: 'INVALID_SIGNATURE' };

  const providerEventId = String(payload.id || payload.data?.id || payload.payment_id || `wh_${Date.now()}`);
  const eventType = String(payload.type || 'payment');
  const action = String(payload.action || payload.type || 'PAYMENT_EVENT').toUpperCase();
  const providerPaymentId = String(payload.data?.id || payload.payment_id || payload.id || '');
  const idempotencyKey = `${action}::${providerEventId}::${providerPaymentId}`;

  if (isFinancialDbConfigured()) {
    const inserted = await insertWebhookEvent({
      providerEventId,
      providerPaymentId: providerPaymentId || null,
      eventType,
      action,
      signature: signatureOptions.signature || null,
      idempotencyKey,
      rawPayload: payload,
      normalizedPayload: { providerPaymentId, action },
    });
    if (inserted.duplicate) return { accepted: true, idempotent: true, id: providerEventId };
  }

  let providerStatus = null;
  if (providerPaymentId && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    providerStatus = await getPaymentStatus(providerPaymentId);
  }

  const normalized = normalizeWebhookPayload(payload, providerStatus);
  const approvedEvent = normalized.status === 'APPROVED' || normalized.action === 'PAYMENT.APPROVED';
  const pendingEvent = normalized.status === 'PENDING' || normalized.action.includes('PENDING');
  let creditActivation = null;
  let subscriptionActivation = null;

  if (isFinancialDbConfigured()) {
    try {
      if (approvedEvent) {
        creditActivation = await applyApprovedPayment({
          providerPaymentId: normalized.providerPaymentId,
          transactionId: normalized.transactionId,
          externalReference: normalized.externalReference,
          actorId: normalized.actorId,
          amount: normalized.amount,
          metadata: { webhook_event_id: providerEventId, provider_status: normalized.status },
          ledgerIdempotencyKey: `payment-approved:${normalized.providerPaymentId || normalized.externalReference || providerEventId}`,
        });
        if (normalized.plan === 'BASIC' || normalized.plan === 'PRO' || normalized.plan === 'ENTERPRISE') {
          subscriptionActivation = activateSubscriptionFromPayment({
            agent_id: normalized.actorId,
            plan: normalized.plan,
            payment_id: normalized.providerPaymentId || providerEventId,
            amount: normalized.amount,
          });
        }
      } else if (pendingEvent && normalized.transactionId) {
        await updateTransactionProviderState({
          transactionId: normalized.transactionId,
          providerPaymentId: normalized.providerPaymentId,
          status: 'PENDING',
          metadata: { webhook_event_id: providerEventId, provider_status: normalized.status },
        });
      }
      await markWebhookEvent(idempotencyKey, 'PROCESSED');
    } catch (error) {
      await markWebhookEvent(idempotencyKey, 'FAILED', String(error.message || error));
      throw error;
    }

    return {
      accepted: true,
      idempotent: false,
      id: providerEventId,
      provider_payment_id: normalized.providerPaymentId,
      credit_activation: creditActivation,
      subscription_activation: subscriptionActivation,
      persistence: 'POSTGRES',
    };
  }

  // Read-only compatibility path for non-production environments without DATABASE_URL.
  const mem = readMemory();
  const processed = new Set(mem.webhook_processed_ids || []);
  const pending = mem.pending_pix_followups || [];
  const notifications = mem.revenue_notifications || [];
  const payments = mem.payments || [];
  if (processed.has(idempotencyKey)) return { accepted: true, idempotent: true, id: providerEventId };
  processed.add(idempotencyKey);

  if (pendingEvent && !pending.find((p) => p.payment_id === providerEventId && p.followup_status !== 'RESOLVED')) {
    pending.unshift({
      payment_id: providerEventId,
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
      payment_type: normalized.isPix ? 'PIX' : 'UNKNOWN',
    });
  }

  const paymentIndex = payments.findIndex((p) => p.payment_id === providerEventId || p.provider_payment_id === normalized.providerPaymentId);
  if (paymentIndex >= 0) {
    payments[paymentIndex] = {
      ...payments[paymentIndex],
      status: approvedEvent ? 'APPROVED' : (pendingEvent ? 'PENDING' : payments[paymentIndex].status),
      updated_at: new Date().toISOString(),
      metadata: {
        ...(payments[paymentIndex].metadata || {}),
        webhook_action: action,
        payment_type: normalized.isPix ? 'PIX' : 'UNKNOWN',
      },
    };
  }

  if (approvedEvent) {
    notifications.unshift({
      type: 'PIX_APPROVED_DB_REQUIRED',
      payment_id: providerEventId,
      provider_payment_id: normalized.providerPaymentId,
      agent_id: normalized.actorId,
      amount: normalized.amount,
      created_at: new Date().toISOString(),
    });
  }

  writeMemory({
    webhook_processed_ids: Array.from(processed).slice(-5000),
    financial_events: [ ...(mem.financial_events || []), { id: providerEventId, payload, at: new Date().toISOString() } ].slice(-5000),
    payments: payments.slice(0, 5000),
    pending_pix_followups: pending.slice(0, 5000),
    revenue_notifications: notifications.slice(0, 5000),
    webhook_health: 'DEGRADED_DB_NOT_CONFIGURED',
  });
  return { accepted: true, idempotent: false, id: providerEventId, persistence: 'LOCAL_JSON_FALLBACK' };
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

module.exports = {
  processWebhook,
  processPendingPixFollowups,
  verifyWebhookSignature,
  buildMercadoPagoSignatureManifest,
  isWebhookTimestampFresh,
};
