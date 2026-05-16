'use strict';

function getConversionDNA() {
  const classes = ['HOT','WARM','COLD','VIRAL','WHALE','EXPLOSIVE'];
  const opportunities = classes.map((cls, i) => ({
    id: `opp_${i+1}`,
    runtime_class: cls,
    cta_intelligence: 72 + i*4,
    revenue_probability: 68 + i*5,
    operator_score: 70 + i*4,
    monetization_pressure: i > 3 ? 'HIGH' : i > 1 ? 'MEDIUM' : 'LOW',
    urgency_psych_score: 65 + i*5,
    behavioral_trigger: cls === 'EXPLOSIVE' ? 'IMMEDIATE_PUSH' : 'SMART_NUDGE',
  }));
  return {
    conversion_runtime: 'ACTIVE',
    conversion_efficiency: 88,
    opportunities,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getConversionDNA, getMonetizationDNA };


function getMonetizationDNA() {
  const classes = ['READY_TO_PAY','HIGH_INTENT','WHALE_PAYMENT','ABANDON_RISK','VIRAL_BUYER'];
  const sessions = classes.map((cls, i) => ({
    id: `mon_${i+1}`,
    class: cls,
    payment_probability: 72 + i*5,
    checkout_urgency: 68 + i*6,
    cta_rank: 90 - i*7,
    high_value_priority: i < 2,
  }));
  return {
    conversion_dna: 'MONETIZING',
    monetization_efficiency: 86,
    sessions,
    generated_at: new Date().toISOString(),
  };
}
