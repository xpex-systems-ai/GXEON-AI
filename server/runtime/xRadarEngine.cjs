'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { ensureWallet, transferCredits } = require('./creditRuntime.cjs');
const { settleCommission } = require('./commissionEngine.cjs');

const CHAINS = ['ethereum', 'arbitrum', 'base'];

function confidenceFromScore(score) {
  if (score >= 85) return 'HIGH';
  if (score >= 70) return 'MEDIUM';
  return 'LOW';
}

function generateSignal(input = {}) {
  const chain = input.chain || CHAINS[Math.floor(Math.random() * CHAINS.length)];
  const score = Math.max(35, Math.min(99, Number(input.score || (60 + Math.random() * 35).toFixed(0))));
  const signal = {
    signal_id: input.signal_id || `xr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    chain,
    source: input.source || 'X_RADAR_MULTI_SOURCE',
    category: input.category || 'MEV',
    confidence_score: score,
    confidence_tier: confidenceFromScore(score),
    expected_roi_pct: Number((3 + Math.random() * 18).toFixed(2)),
    producer_agent_id: input.producer_agent_id || 'signal_producer_1',
    created_at: new Date().toISOString(),
  };

  const mem = readMemory();
  const signals = mem.x_radar_signals || [];
  writeMemory({ x_radar_signals: [signal, ...signals].slice(0, 5000) });
  return signal;
}

function consumePremiumSignal({ consumer_agent_id = 'signal_buyer_1', signal_id, signal_price_credits = 12 } = {}) {
  const mem = readMemory();
  const signals = mem.x_radar_signals || [];
  const signal = signals.find((s) => s.signal_id === signal_id) || signals[0];
  if (!signal) return { ok: false, code: 'NO_SIGNAL_AVAILABLE' };

  ensureWallet(consumer_agent_id);
  ensureWallet(signal.producer_agent_id);

  const settlement = settleCommission({
    task_id: `signal_delivery_${signal.signal_id}`,
    gross_amount: Number(signal_price_credits),
    producer_agent_id: signal.producer_agent_id,
    consumer_agent_id,
    platform_rate: 0.18,
  });

  const transfer = transferCredits({
    from_agent_id: consumer_agent_id,
    to_agent_id: signal.producer_agent_id,
    amount: settlement.producer_net,
    reason: 'PAY_PER_SIGNAL_DELIVERY',
  });

  if (!transfer.ok) return { ok: false, code: transfer.code || 'DELIVERY_BLOCKED', signal };

  const delivery = {
    delivery_id: `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    signal_id: signal.signal_id,
    consumer_agent_id,
    signal_price_credits: Number(signal_price_credits),
    status: 'DELIVERED',
    channel: 'API_PRIVATE',
    created_at: new Date().toISOString(),
  };

  const deliveries = mem.x_radar_deliveries || [];
  writeMemory({ x_radar_deliveries: [delivery, ...deliveries].slice(0, 5000) });

  return { ok: true, signal, settlement, transfer, delivery };
}

function getXRadarMetrics() {
  const mem = readMemory();
  const signals = mem.x_radar_signals || [];
  const deliveries = mem.x_radar_deliveries || [];
  const byConfidence = {
    HIGH: signals.filter((s) => s.confidence_tier === 'HIGH').length,
    MEDIUM: signals.filter((s) => s.confidence_tier === 'MEDIUM').length,
    LOW: signals.filter((s) => s.confidence_tier === 'LOW').length,
  };
  const revenueCredits = deliveries.reduce((acc, d) => acc + Number(d.signal_price_credits || 0), 0);
  return {
    x_radar: 'ACTIVE',
    signals_generated: signals.length,
    signals_delivered: deliveries.length,
    conversion_rate_pct: signals.length > 0 ? Number(((deliveries.length / signals.length) * 100).toFixed(2)) : 0,
    revenue_per_signal_credits: signals.length > 0 ? Number((revenueCredits / signals.length).toFixed(2)) : 0,
    confidence_distribution: byConfidence,
    channels: ['API_PRIVATE', 'TELEGRAM_PRIVATE', 'CORNIX_BRIDGE'],
    generated_at: new Date().toISOString(),
  };
}

module.exports = { generateSignal, consumePremiumSignal, getXRadarMetrics };
