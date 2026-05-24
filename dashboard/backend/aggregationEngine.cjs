const { summarize } = require('../../analytics/runtime/metricsKernel.cjs');
const { getOperatorView } = require('../../analytics/operators/controlPlane.cjs');

function buildLiveOverview(){
  const m=summarize(); const o=getOperatorView();
  return {
    at:new Date().toISOString(),
    runtime_health:m.health_score,
    active_workflows:o.active_workflows,
    queue_saturation:m.queue_metrics.saturation_signal,
    execution_velocity:m.workflow_totals.completed,
    alerts:o.alerts
  };
}
function queueHealth(){ const m=summarize(); return { enqueued:m.queue_metrics.enqueued, dispatched:m.queue_metrics.dispatched, saturation:m.queue_metrics.saturation_signal}; }
function revenueStream(){ return { note:'foundation uses runtime events; billing integration pending', realtime_revenue: null }; }
function marketplaceSignals(){ return { top_workflows:[], ranking_signal:'execution_success', health_score: summarize().health_score }; }
module.exports = { buildLiveOverview, queueHealth, revenueStream, marketplaceSignals };
