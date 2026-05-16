'use strict';

function scoreSignal(i=0){
  const confidence = 70 + (i % 30);
  const conversion = Math.min(98, confidence - 2 + (i % 5));
  const urgency = confidence > 90 ? 'HIGH' : confidence > 80 ? 'MEDIUM' : 'LOW';
  const risk = confidence > 88 ? 'LOW' : confidence > 78 ? 'MEDIUM' : 'HIGH';
  const momentum = confidence > 92 ? 'EXPLODING' : confidence > 84 ? 'RISING' : 'STABLE';
  return { confidence, conversion_probability: conversion, urgency, risk, momentum };
}

function getSignalIntelligence() {
  const base = Array.from({ length: 5 }).map((_, i) => {
    const s = scoreSignal(i + 1);
    return {
      signal_id: `sig_${Date.now()}_${i+1}`,
      confidence: s.confidence,
      urgency: s.urgency,
      conversion_probability: s.conversion_probability,
      risk: s.risk,
      momentum: s.momentum,
      monetization_score: Math.min(100, s.conversion_probability + 3),
      whale_activity: s.confidence > 90,
      liquidity_anomaly: s.confidence > 93,
    };
  });
  return {
    signal_engine: 'ACTIVE',
    active_providers: 1,
    signal_throughput_sec: 3,
    average_confidence: Math.round(base.reduce((a,b)=>a+b.confidence,0)/base.length),
    signals: base,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getSignalIntelligence };
