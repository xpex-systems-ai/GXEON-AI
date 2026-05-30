'use strict';

const { generateSignal, getXRadarMetrics } = require('./xRadarEngine.cjs');

function runXRadarScanCycle(input = {}) {
  const scans = Math.max(1, Math.min(Number(input.scans || 5), 30));
  const categories = ['MEV', 'LIQUIDITY', 'BOUNTY', 'KEEPER', 'GELATO'];
  const created = [];

  for (let i = 0; i < scans; i += 1) {
    created.push(generateSignal({
      category: categories[i % categories.length],
      source: 'X_RADAR_AUTONOMOUS_SCANNER',
    }));
  }

  return {
    scanner: 'ACTIVE',
    scans_executed: scans,
    signals_created: created.length,
    sample: created.slice(0, 5),
    metrics: getXRadarMetrics(),
    generated_at: new Date().toISOString(),
  };
}


async function runXRadarRevenueCycle(input = {}) {
  const scans = Math.max(1, Math.min(Number(input.scans || 3), 10));
  const minScore = Math.max(1, Math.min(Number(input.min_score || 80), 99));
  const scan = runXRadarScanCycle({ scans });
  const monetized = [];
  const blocked = [];

  for (const signal of scan.sample.filter((item) => Number(item.confidence_score || 0) >= minScore)) {
    try {
      const { createRadarMonetizationCheckout } = require('./revenueEngineRuntime.cjs');
      monetized.push(await createRadarMonetizationCheckout({
        ...input,
        signal,
        actor_id: input.actor_id || input.consumer_agent_id || 'radar_buyer_1',
        payer_email: input.payer_email,
        amount: input.amount,
      }));
    } catch (error) {
      blocked.push({ signal_id: signal.signal_id, code: error.code || 'RADAR_PIX_CHECKOUT_FAILED', error: String(error.message || error) });
    }
  }

  return {
    radar_revenue_cycle: 'ACTIVE',
    scans_executed: scan.scans_executed,
    signals_created: scan.signals_created,
    min_score: minScore,
    pix_checkouts_created: monetized.length,
    blocked_count: blocked.length,
    monetized,
    blocked,
    metrics: scan.metrics,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { runXRadarScanCycle, runXRadarRevenueCycle };
