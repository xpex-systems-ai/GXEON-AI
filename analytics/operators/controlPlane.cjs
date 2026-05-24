const { summarize } = require('../runtime/metricsKernel.cjs');

function getOperatorView() {
  const s = summarize();
  return {
    active_workflows: s.workflow_totals.running,
    failed_workflows: s.workflow_totals.failed,
    dead_lettered: s.workflow_totals.dead_lettered,
    queue_saturation: s.queue_metrics.saturation_signal,
    retry_storm: s.workflow_totals.retrying_workflows > 10,
    health_score: s.health_score,
    alerts: buildAlerts(s)
  };
}

function buildAlerts(s) {
  const a = [];
  if (s.queue_metrics.saturation_signal > 50) a.push('QUEUE_SATURATION_HIGH');
  if (s.workflow_totals.dead_lettered > 0) a.push('DEAD_LETTER_PRESENT');
  if (s.health_score < 70) a.push('RUNTIME_HEALTH_DEGRADED');
  return a;
}

module.exports = { getOperatorView };
