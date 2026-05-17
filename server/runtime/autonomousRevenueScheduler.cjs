'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { createPixPayment } = require('./paymentRuntime.cjs');
const { ensureWallet, transferCredits } = require('./creditRuntime.cjs');
const { settleCommission } = require('./commissionEngine.cjs');
const { generateSignal } = require('./xRadarEngine.cjs');

function getQueue() {
  const mem = readMemory();
  return mem.autonomous_task_queue || [];
}

function enqueueTask(task = {}) {
  const q = getQueue();
  const item = {
    task_id: task.task_id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    signal_id: task.signal_id || `sig_${Date.now()}`,
    price_credits: Math.max(1, Number(task.price_credits || 25)),
    producer_agent_id: task.producer_agent_id || 'agent_executor_1',
    consumer_agent_id: task.consumer_agent_id || 'agent_buyer_1',
    status: 'QUEUED',
    created_at: new Date().toISOString(),
  };
  writeMemory({ autonomous_task_queue: [item, ...q].slice(0, 2000) });
  return item;
}

function runSchedulerCycle(input = {}) {
  const maxTasks = Math.max(1, Math.min(Number(input.max_tasks || 5), 50));
  const failRate = Math.max(0, Math.min(Number(input.fail_rate || 0), 0.9));
  const queue = getQueue();
  const queued = queue.filter((t) => t.status === 'QUEUED').slice(0, maxTasks);
  const settled = [];
  const blocked = [];
  const refunded = [];

  for (const task of queued) {
    ensureWallet(task.consumer_agent_id);
    ensureWallet(task.producer_agent_id);

    const settlement = settleCommission({
      task_id: task.task_id,
      gross_amount: task.price_credits,
      producer_agent_id: task.producer_agent_id,
      consumer_agent_id: task.consumer_agent_id,
      platform_rate: 0.15,
    });

    const transfer = transferCredits({
      from_agent_id: task.consumer_agent_id,
      to_agent_id: task.producer_agent_id,
      amount: settlement.producer_net,
      reason: 'AUTONOMOUS_TASK_SETTLEMENT',
    });

    if (!transfer.ok) {
      blocked.push({ task_id: task.task_id, reason: transfer.code || 'UNKNOWN' });
      task.status = 'BLOCKED';
      task.blocked_at = new Date().toISOString();
      continue;
    }

    const failedExecution = Math.random() < failRate;
    if (failedExecution) {
      const refund = transferCredits({
        from_agent_id: task.producer_agent_id,
        to_agent_id: task.consumer_agent_id,
        amount: settlement.producer_net,
        reason: 'AUTONOMOUS_TASK_REFUND',
      });
      task.status = 'FAILED';
      task.failed_at = new Date().toISOString();
      task.refund = refund;
      refunded.push({ task_id: task.task_id, refund_ok: refund.ok });
    } else {
      task.status = 'SETTLED';
      task.settled_at = new Date().toISOString();
      task.settlement = settlement;
      settled.push(task);
    }
  }

  const next = queue.map((item) => settled.find((s) => s.task_id === item.task_id) || item);
  writeMemory({ autonomous_task_queue: next });

  return {
    scheduler: 'ACTIVE',
    settled_count: settled.length,
    blocked_count: blocked.length,
    refunded_count: refunded.length,
    settled,
    blocked,
    refunded,
    generated_at: new Date().toISOString(),
  };
}

function generateSellableTasksFromRadar(input = {}) {
  const count = Math.max(1, Math.min(Number(input.count || 5), 30));
  const basePrice = Math.max(5, Number(input.base_price_credits || 20));
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const signal = generateSignal({ category: input.category || 'MEV' });
    const price = Number((basePrice + (signal.confidence_score / 10)).toFixed(2));
    created.push(enqueueTask({
      signal_id: signal.signal_id,
      price_credits: price,
      producer_agent_id: signal.producer_agent_id,
      consumer_agent_id: input.consumer_agent_id || 'agent_buyer_1',
    }));
  }
  return { generator: 'ACTIVE', tasks_generated: created.length, tasks: created, generated_at: new Date().toISOString() };
}

function autoTopupViaPix({ agent_id, amount = 197 }) {
  ensureWallet(agent_id || 'agent_buyer_1');
  const payment = createPixPayment({
    amount: Number(amount),
    conversion_class: 'READY_TO_PAY',
    cta_source: 'AUTO_TOPUP',
    signal_source: 'CREDIT_LOW',
  });
  const mem = readMemory();
  const pending = mem.pending_pix_followups || [];
  pending.unshift({
    payment_id: payment.payment_id,
    agent_id: agent_id || 'agent_buyer_1',
    channels: [],
    contact: {},
    followup_status: 'QUEUED',
    created_at: new Date().toISOString(),
    source: 'AUTO_TOPUP',
  });
  writeMemory({ pending_pix_followups: pending.slice(0, 5000) });
  return { topup: 'PENDING_PIX', agent_id: agent_id || 'agent_buyer_1', payment };
}

function getAutonomousRevenueRuntime() {
  const q = getQueue();
  return {
    autonomous_revenue_runtime: 'ACTIVE',
    queued: q.filter((t) => t.status === 'QUEUED').length,
    settled: q.filter((t) => t.status === 'SETTLED').length,
    failed: q.filter((t) => t.status === 'FAILED').length,
    queue: q.slice(0, 200),
    generated_at: new Date().toISOString(),
  };
}

module.exports = { enqueueTask, runSchedulerCycle, autoTopupViaPix, getAutonomousRevenueRuntime, generateSellableTasksFromRadar };
