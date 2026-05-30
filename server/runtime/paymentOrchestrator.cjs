'use strict';

const { createPixPayment } = require('./paymentRuntime.cjs');

async function executeAutonomousPixRun(input = {}) {
  const count = Math.max(1, Math.min(Number(input.count || 3), 50));
  const baseAmount = Math.max(1, Number(input.base_amount || 97));
  const classes = ['HOT', 'HIGH_INTENT', 'READY_TO_PAY', 'WHALE_PAYMENT', 'VIRAL_BUYER'];

  const created = [];
  for (let i = 0; i < count; i += 1) {
    const conversion_class = classes[i % classes.length];
    const amount = Number((baseAmount + (i * 7.5)).toFixed(2));
    created.push(await createPixPayment({
      ...input,
      amount,
      conversion_class,
      external_reference: input.external_reference ? `${input.external_reference}_${i}` : undefined,
      cta_source: input.cta_source || 'AUTONOMOUS_AGENT_RUNTIME',
      signal_source: input.signal_source || 'RADAR_SHIX',
    }));
  }

  return {
    orchestration: 'ACTIVE',
    mode: 'AUTONOMOUS_PIX_GENERATION',
    generated: created.length,
    payments: created,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { executeAutonomousPixRun };
