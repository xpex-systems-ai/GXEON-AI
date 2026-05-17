'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

const PLANS = {
  BASIC: { brl_monthly: 297, included_signals: 200, execution_fee_pct: 0.12 },
  PRO: { brl_monthly: 997, included_signals: 1200, execution_fee_pct: 0.1 },
  ENTERPRISE: { brl_monthly: 4900, included_signals: 10000, execution_fee_pct: 0.08 },
};

function subscribeAgent({ agent_id, plan = 'BASIC' } = {}) {
  if (!agent_id) throw new Error('agent_id is required');
  const selected = PLANS[plan] || PLANS.BASIC;
  const mem = readMemory();
  const subs = mem.subscriptions || {};
  subs[agent_id] = {
    agent_id,
    plan,
    ...selected,
    status: 'ACTIVE',
    started_at: new Date().toISOString(),
  };
  writeMemory({ subscriptions: subs });
  return subs[agent_id];
}

function getSubscriptionCatalog() {
  return { plans: PLANS, generated_at: new Date().toISOString() };
}

module.exports = { subscribeAgent, getSubscriptionCatalog };
