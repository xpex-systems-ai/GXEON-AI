'use strict';

const crypto = require('node:crypto');
const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

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
  const id = payload.id || payload.data?.id || `wh_${Date.now()}`;
  if (processed.has(id)) return { accepted: true, idempotent: true, id };

  processed.add(id);
  const events = [ ...(mem.financial_events || []), { id, payload, at: new Date().toISOString() } ].slice(-5000);
  writeMemory({ webhook_processed_ids: Array.from(processed).slice(-5000), financial_events: events, webhook_health: 'ACTIVE' });
  return { accepted: true, idempotent: false, id };
}

module.exports = { processWebhook };
