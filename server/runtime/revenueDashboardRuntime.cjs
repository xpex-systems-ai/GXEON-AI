'use strict';

const { getXRadarMetrics } = require('./xRadarEngine.cjs');
const { getCommissionRuntime } = require('./commissionEngine.cjs');
const { getCreditRuntime } = require('./creditRuntime.cjs');
const { getAutonomousRevenueRuntime } = require('./autonomousRevenueScheduler.cjs');
const { readMemory } = require('./runtimeMemory.cjs');

function getRevenueDashboardMetrics() {
  const x = getXRadarMetrics();
  const c = getCommissionRuntime();
  const cr = getCreditRuntime();
  const a = getAutonomousRevenueRuntime();
  const mem = readMemory();
  const pending = (mem.pending_pix_followups || []).filter((f) => f.followup_status !== 'RESOLVED').length;
  return {
    revenue_dashboard: 'ACTIVE',
    platform_revenue_credits: c.platform_revenue,
    gross_volume_credits: c.gross_volume,
    signals_generated: x.signals_generated,
    signals_delivered: x.signals_delivered,
    revenue_per_signal_credits: x.revenue_per_signal_credits,
    autonomous_tasks_settled: a.settled,
    autonomous_tasks_queued: a.queued,
    wallet_count: cr.wallet_count,
    pending_pix_followups: pending,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getRevenueDashboardMetrics };
