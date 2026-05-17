'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { writeMemory, readMemory } = require('../server/runtime/runtimeMemory.cjs');
const { autoTopupViaPix, runSchedulerCycle, generateSellableTasksFromRadar } = require('../server/runtime/autonomousRevenueScheduler.cjs');
const { processWebhook } = require('../server/runtime/mercadoWebhookRuntime.cjs');
const { getRevenueDashboardMetrics } = require('../server/runtime/revenueDashboardRuntime.cjs');

function resetMemory() {
  writeMemory({
    credit_wallets: {},
    credit_ledger: [],
    payments: [],
    subscriptions: {},
    subscription_events: [],
    pending_pix_followups: [],
    revenue_notifications: [],
    webhook_processed_ids: [],
    commission_settlements: [],
    autonomous_task_queue: [],
    x_radar_signals: [],
  });
}

function run() {
  resetMemory();
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'test_secret_123';

  generateSellableTasksFromRadar({ count: 3, consumer_agent_id: 'agent_buyer_1', execution_fee_rate: 0.06 });
  const topup = autoTopupViaPix({ agent_id: 'agent_buyer_1', amount: 297 });
  assert.ok(topup?.payment?.payment_id, 'topup payment id missing');

  const payload = {
    id: topup.payment.payment_id,
    status: 'approved',
    payment_type_id: 'pix',
    amount: 297,
    metadata: { agent_id: 'agent_buyer_1', plan: 'PRO' },
    action: 'payment.approved',
  };
  const raw = JSON.stringify(payload);
  const digest = crypto.createHmac('sha256', process.env.MERCADO_PAGO_WEBHOOK_SECRET).update(raw).digest('hex');
  const approved = processWebhook(payload, `v1=${digest}`, raw);

  assert.equal(approved.accepted, true, 'approved webhook should be accepted');
  assert.equal(Boolean(approved.credit_activation?.ok), true, 'credit activation should succeed');
  assert.equal(Boolean(approved.subscription_activation?.ok), true, 'subscription activation should succeed');

  const duplicate = processWebhook(payload, `v1=${digest}`, raw);
  assert.equal(Boolean(duplicate.idempotent), true, 'duplicate webhook should be idempotent');

  const invalidSignature = processWebhook(payload, 'v1=invalid', raw);
  assert.equal(invalidSignature.accepted, false, 'invalid signature should be rejected');

  const cycle = runSchedulerCycle({ max_tasks: 3, fail_rate: 0 });
  assert.ok(cycle.settled_count >= 0, 'scheduler result invalid');

  const dashboard = getRevenueDashboardMetrics();
  assert.ok(dashboard.pix_approved_count >= 1, 'dashboard should reflect approved pix');
  assert.ok(dashboard.active_subscriptions >= 1, 'dashboard should reflect active subscription');

  const mem = readMemory();
  assert.ok((mem.credit_ledger || []).length > 0, 'credit ledger should have events');

  console.log('runtime_pix_smoke_test: OK');
}

run();
