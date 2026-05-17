'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

function getWallets() {
  const mem = readMemory();
  return mem.credit_wallets || {};
}

function setWallets(wallets) {
  writeMemory({ credit_wallets: wallets });
}

function ensureWallet(agentId) {
  const wallets = getWallets();
  if (!wallets[agentId]) {
    wallets[agentId] = {
      agent_id: agentId,
      balance: 0,
      credit_limit: 1000,
      total_spent: 0,
      total_earned: 0,
      updated_at: new Date().toISOString(),
    };
    setWallets(wallets);
  }
  return getWallets()[agentId];
}

function upsertWallet({ agent_id, credit_limit = 1000, initial_balance = 0 }) {
  if (!agent_id) throw new Error('agent_id is required');
  const wallets = getWallets();
  const current = wallets[agent_id] || ensureWallet(agent_id);
  wallets[agent_id] = {
    ...current,
    credit_limit: Math.max(0, Number(credit_limit)),
    balance: Math.max(0, Number(initial_balance ?? current.balance)),
    updated_at: new Date().toISOString(),
  };
  setWallets(wallets);
  return wallets[agent_id];
}

function transferCredits({ from_agent_id, to_agent_id, amount, reason = 'A2A_TASK_EXECUTION' }) {
  if (!from_agent_id || !to_agent_id) throw new Error('from_agent_id and to_agent_id are required');
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('amount must be > 0');
  const wallets = getWallets();
  const from = wallets[from_agent_id] || ensureWallet(from_agent_id);
  const to = wallets[to_agent_id] || ensureWallet(to_agent_id);

  if (from.balance + from.credit_limit < value) {
    return { ok: false, code: 'CREDIT_LIMIT_EXCEEDED', from, to };
  }

  from.balance = Number((from.balance - value).toFixed(2));
  from.total_spent = Number((from.total_spent + value).toFixed(2));
  from.updated_at = new Date().toISOString();

  to.balance = Number((to.balance + value).toFixed(2));
  to.total_earned = Number((to.total_earned + value).toFixed(2));
  to.updated_at = new Date().toISOString();

  wallets[from_agent_id] = from;
  wallets[to_agent_id] = to;

  const mem = readMemory();
  const ledger = mem.credit_ledger || [];
  const event = {
    event_id: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from_agent_id,
    to_agent_id,
    amount: Number(value.toFixed(2)),
    reason,
    created_at: new Date().toISOString(),
  };

  writeMemory({
    credit_wallets: wallets,
    credit_ledger: [event, ...ledger].slice(0, 5000),
  });

  return { ok: true, event, from: wallets[from_agent_id], to: wallets[to_agent_id] };
}

function getCreditRuntime() {
  const mem = readMemory();
  const wallets = mem.credit_wallets || {};
  const ledger = mem.credit_ledger || [];
  const walletCount = Object.keys(wallets).length;
  const volume = ledger.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  return {
    credit_runtime: 'ACTIVE',
    wallet_count: walletCount,
    ledger_events: ledger.length,
    total_volume: Number(volume.toFixed(2)),
    wallets,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { ensureWallet, upsertWallet, transferCredits, getCreditRuntime };
