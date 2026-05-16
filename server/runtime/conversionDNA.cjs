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

module.exports = { getConversionDNA };
