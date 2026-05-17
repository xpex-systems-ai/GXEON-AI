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

module.exports = { runXRadarScanCycle };
