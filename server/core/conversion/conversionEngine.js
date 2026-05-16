'use strict';

const { stableHash } = require('../../runtime/persistence.cjs');

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function currency(value) {
  return Number(Number(value || 0).toFixed(2));
}

class ConversionEngine {
  constructor() {
    this.telemetry = [];
    this.opportunities = [];
  }

  scoreLead(lead = {}) {
    const intent = clamp(lead.intent_score ?? lead.intent ?? 50);
    const budget = clamp((Number(lead.budget_usd || 0) / 1000) * 10, 0, 25);
    const urgency = clamp(lead.urgency_score ?? lead.urgency ?? 25, 0, 25);
    const fit = clamp(lead.fit_score ?? lead.fit ?? 50, 0, 100) * 0.25;
    const score = clamp(intent * 0.4 + budget + urgency * 0.25 + fit);
    return {
      id: lead.id || `lead-${stableHash(lead).slice(0, 10)}`,
      score: currency(score),
      tier: score >= 80 ? 'enterprise' : score >= 60 ? 'pro' : score >= 40 ? 'starter' : 'nurture',
      recommended_action: score >= 75 ? 'route_to_revenue_swarm' : score >= 50 ? 'send_conversion_sequence' : 'collect_more_signals'
    };
  }

  rankTaskProfitability(task = {}) {
    const revenue = Number(task.estimated_revenue_usd || task.revenue_usd || 0);
    const cost = Number(task.estimated_cost_usd || task.cost_usd || 0);
    const probability = clamp(task.success_probability ?? task.probability ?? 0.7, 0, 1);
    const latencyPenalty = Math.min(Number(task.latency_ms || 0) / 1000, 20);
    const roi = cost > 0 ? (revenue - cost) / cost : revenue;
    const priority = clamp((roi * 18) + (probability * 60) - latencyPenalty + Math.min(revenue / 10, 20));
    return {
      id: task.id || `task-${stableHash(task).slice(0, 10)}`,
      expected_revenue_usd: currency(revenue),
      expected_cost_usd: currency(cost),
      roi: currency(roi),
      profitability_score: currency(priority),
      priority: priority >= 75 ? 'critical' : priority >= 55 ? 'high' : priority >= 35 ? 'medium' : 'low'
    };
  }

  analyzeExecutionROI(execution = {}) {
    const revenue = Number(execution.revenue_usd || execution.gross_revenue_usd || 0);
    const cost = Number(execution.cost_usd || execution.gas_usd || execution.compute_usd || 0);
    const margin = revenue - cost;
    return {
      id: execution.id || `exec-${stableHash(execution).slice(0, 10)}`,
      revenue_usd: currency(revenue),
      cost_usd: currency(cost),
      margin_usd: currency(margin),
      roi: currency(cost > 0 ? margin / cost : margin),
      profitable: margin >= 0
    };
  }

  detectHighValueOpportunities(inputs = []) {
    const ranked = inputs.map((item) => ({
      ...item,
      lead: this.scoreLead(item.lead || item),
      task: this.rankTaskProfitability(item.task || item)
    })).map((item) => ({
      id: item.id || `opp-${stableHash(item).slice(0, 10)}`,
      type: item.type || 'autonomous_revenue',
      conversion_score: item.lead.score,
      profitability_score: item.task.profitability_score,
      expected_value_usd: currency(Number(item.expected_value_usd || item.task.expected_revenue_usd || 0)),
      confidence: clamp((item.lead.score + item.task.profitability_score) / 200, 0, 1),
      recommended_agent: item.recommended_agent || 'conversion-orchestrator',
      priority: item.task.priority
    })).sort((a, b) => (b.conversion_score + b.profitability_score) - (a.conversion_score + a.profitability_score));

    this.opportunities = ranked.slice(0, 50);
    return this.opportunities;
  }

  recordTelemetry(event = {}) {
    const record = {
      id: event.id || `conversion-${stableHash(event).slice(0, 12)}`,
      type: event.type || 'conversion_telemetry',
      score: event.score ?? this.scoreLead(event).score,
      revenue_usd: currency(event.revenue_usd || 0),
      created_at: event.created_at || new Date().toISOString(),
      metadata: event.metadata || {}
    };
    this.telemetry.unshift(record);
    if (this.telemetry.length > 250) this.telemetry.length = 250;
    return record;
  }

  getMetrics() {
    const revenue = this.telemetry.reduce((sum, item) => sum + Number(item.revenue_usd || 0), 0);
    const avgScore = this.telemetry.length
      ? this.telemetry.reduce((sum, item) => sum + Number(item.score || 0), 0) / this.telemetry.length
      : 0;
    return {
      status: 'ready',
      generated_at: new Date().toISOString(),
      telemetry_events: this.telemetry.length,
      opportunity_count: this.opportunities.length,
      average_conversion_score: currency(avgScore),
      projected_revenue_usd: currency(revenue || this.opportunities.reduce((sum, item) => sum + item.expected_value_usd, 0)),
      swarm_profitability_score: currency(this.opportunities.reduce((sum, item) => sum + item.profitability_score, 0) / Math.max(1, this.opportunities.length))
    };
  }

  getOpportunities() {
    if (!this.opportunities.length) {
      return this.detectHighValueOpportunities([
        { id: 'opp-runtime-dashboard', expected_value_usd: 299, intent_score: 84, fit_score: 91, urgency_score: 75, estimated_revenue_usd: 299, estimated_cost_usd: 18, success_probability: 0.82 },
        { id: 'opp-swarm-persistence', expected_value_usd: 499, intent_score: 79, fit_score: 88, urgency_score: 70, estimated_revenue_usd: 499, estimated_cost_usd: 52, success_probability: 0.76 },
        { id: 'opp-provider-health', expected_value_usd: 149, intent_score: 66, fit_score: 73, urgency_score: 58, estimated_revenue_usd: 149, estimated_cost_usd: 20, success_probability: 0.68 }
      ]);
    }
    return this.opportunities;
  }

  getLeaderboard() {
    return this.getOpportunities().map((item, index) => ({
      rank: index + 1,
      agent: item.recommended_agent,
      opportunity_id: item.id,
      conversion_score: item.conversion_score,
      profitability_score: item.profitability_score,
      expected_value_usd: item.expected_value_usd,
      priority: item.priority
    }));
  }
}

const conversionEngine = new ConversionEngine();

module.exports = {
  ConversionEngine,
  conversionEngine
};
