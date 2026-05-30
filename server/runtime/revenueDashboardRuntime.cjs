'use strict';

const { getXRadarMetrics } = require('./xRadarEngine.cjs');
const { getCommissionRuntime } = require('./commissionEngine.cjs');
const { getCreditRuntime } = require('./creditRuntime.cjs');
const { getAutonomousRevenueRuntime } = require('./autonomousRevenueScheduler.cjs');
const { readMemory } = require('./runtimeMemory.cjs');
const { getRevenueAnalytics } = require('./revenueEngineRuntime.cjs');

function getRevenueDashboardMetrics() {
  const x = getXRadarMetrics();
  const c = getCommissionRuntime();
  const cr = getCreditRuntime();
  const a = getAutonomousRevenueRuntime();
  const mem = readMemory();
  const pending = (mem.pending_pix_followups || []).filter((f) => f.followup_status !== 'RESOLVED').length;
  const notifications = (mem.revenue_notifications || []).length;
  const payments = mem.payments || [];
  const subs = Object.values(mem.subscriptions || {});
  const pixApproved = payments.filter((p) => p.status === 'APPROVED').length;
  const pixPending = payments.filter((p) => p.status === 'PENDING').length;
  const pixGmv = payments.filter((p) => p.status === 'APPROVED').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const mrr = subs.filter((s) => s.status === 'ACTIVE').reduce((acc, s) => acc + Number(s.brl_monthly || 0), 0);
  const conversionRate = (pixApproved + pixPending) > 0 ? Number(((pixApproved / (pixApproved + pixPending)) * 100).toFixed(2)) : 0;
  const revenueEngine = getRevenueAnalytics().metrics;
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
    pix_approved_count: pixApproved,
    pix_pending_count: pixPending,
    pix_approved_gmv_brl: Number(pixGmv.toFixed(2)),
    revenue_engine_status: 'REVENUE_READY',
    checkout_views: revenueEngine.checkout_views,
    pix_generated: revenueEngine.pix_generated,
    pix_paid: revenueEngine.pix_paid,
    revenue_today_brl: revenueEngine.revenue_today,
    revenue_month_brl: revenueEngine.revenue_month,
    ltv_brl: revenueEngine.ltv,
    cac_brl: revenueEngine.cac,
    marketplace_revenue_brl: revenueEngine.marketplace_revenue,
    active_subscriptions: subs.filter((s) => s.status === 'ACTIVE').length,
    mrr_brl: Number(mrr.toFixed(2)),
    pix_conversion_rate_pct: conversionRate,
    pending_pix_followups: pending,
    revenue_notifications: notifications,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getRevenueDashboardMetrics };
