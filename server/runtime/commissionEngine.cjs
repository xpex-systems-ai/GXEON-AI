'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

function settleCommission({ task_id, gross_amount, platform_rate = 0.15, producer_agent_id = 'agent_producer', consumer_agent_id = 'agent_consumer' }) {
  const gross = Number(gross_amount || 0);
  const rate = Math.max(0.12, Math.min(0.2, Number(platform_rate || 0.15)));
  if (!Number.isFinite(gross) || gross <= 0) throw new Error('gross_amount must be > 0');

  const platformFee = Number((gross * rate).toFixed(2));
  const netPayout = Number((gross - platformFee).toFixed(2));

  const event = {
    settlement_id: `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    task_id: task_id || `task_${Date.now()}`,
    consumer_agent_id,
    producer_agent_id,
    gross_amount: gross,
    platform_rate: rate,
    platform_fee: platformFee,
    producer_net: netPayout,
    created_at: new Date().toISOString(),
  };

  const mem = readMemory();
  const settlements = mem.commission_settlements || [];
  writeMemory({ commission_settlements: [event, ...settlements].slice(0, 5000) });
  return event;
}

function getCommissionRuntime() {
  const mem = readMemory();
  const settlements = mem.commission_settlements || [];
  const gross = settlements.reduce((a, s) => a + Number(s.gross_amount || 0), 0);
  const fee = settlements.reduce((a, s) => a + Number(s.platform_fee || 0), 0);

  return {
    commission_engine: 'ACTIVE',
    settlements_count: settlements.length,
    gross_volume: Number(gross.toFixed(2)),
    platform_revenue: Number(fee.toFixed(2)),
    settlements: settlements.slice(0, 200),
    generated_at: new Date().toISOString(),
  };
}

module.exports = { settleCommission, getCommissionRuntime };
