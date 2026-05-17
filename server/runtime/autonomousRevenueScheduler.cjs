'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { createPixPayment } = require('./paymentRuntime.cjs');
const { ensureWallet, transferCredits } = require('./creditRuntime.cjs');
const { settleCommission } = require('./commissionEngine.cjs');

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
  const queue = getQueue();
  const queued = queue.filter((t) => t.status === 'QUEUED').slice(0, maxTasks);
  const settled = [];
  const blocked = [];

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
      continue;
    }

    task.status = 'SETTLED';
    task.settled_at = new Date().toISOString();
    task.settlement = settlement;
    settled.push(task);
  }

  const next = queue.map((item) => settled.find((s) => s.task_id === item.task_id) || item);
  writeMemory({ autonomous_task_queue: next });

  return {
    scheduler: 'ACTIVE',
    settled_count: settled.length,
    blocked_count: blocked.length,
    settled,
    blocked,
    generated_at: new Date().toISOString(),
  };
}

function autoTopupViaPix({ agent_id, amount = 197 }) {
  ensureWallet(agent_id || 'agent_buyer_1');
  const payment = createPixPayment({
    amount: Number(amount),
    conversion_class: 'READY_TO_PAY',
    cta_source: 'AUTO_TOPUP',
    signal_source: 'CREDIT_LOW',
  });
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

module.exports = { enqueueTask, runSchedulerCycle, autoTopupViaPix, getAutonomousRevenueRuntime };
