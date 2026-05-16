'use strict';

function getOperatorAlerts() {
  return {
    runtime: 'ONLINE',
    alerts: [
      { level: 'CRITICAL', type: 'EXPLOSIVE_SIGNAL', message: 'High-conversion whale activity detected', confidence: 94 },
      { level: 'WARNING', type: 'PROVIDER_INSTABILITY', message: 'Provider retry cadence elevated, recovery active', confidence: 82 },
      { level: 'INFO', type: 'SIGNAL_SPIKE', message: 'Signal throughput above baseline', confidence: 78 },
    ],
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getOperatorAlerts };
