/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON AGENT METERING SERVICE v1.0 — INTERNAL CONSUMPTION BILLING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Pipeline: GXZ1_MODE_2_MONETIZATION_ENFORCEMENT
 * ENF-002: Agent Metering — INTERNAL_CONSUMPTION_BILLING
 * 
 * RULE: EVERY_SIGNAL_CONSUMED_MUST_DEDUCT_CREDIT
 * Targets: task_engine, gelato_scanner, autonolas_agent, mevMatchmaker
 * Log Table: signal_consumption_logs
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');

// Pricing per signal type for internal agents
const AGENT_SIGNAL_PRICING = {
  task_engine: 0.001,        // Task pipeline signals
  gelato_scanner: 0.002,     // Keeper opportunity signals
  autonolas_agent: 0.003,    // AI task resolution signals
  mev_matchmaker: 0.005,    // MEV opportunity signals
  default: 0.001
};

class AgentMeteringService {
  constructor() {
    this.supabase = null;
    this.consumption_buffer = [];
    this.agent_stats = new Map(); // agent_id -> stats
    this.init();
  }

  async init() {
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('⚡ [AGENT_METERING] Service initialized');
    } else {
      console.warn('⚠️ [AGENT_METERING] Supabase not configured - metering in local mode only');
    }

    // Periodic flush to Supabase
    setInterval(() => this.flushBuffer(), 30000); // 30 seconds
  }

  /**
   * Record signal consumption by internal agent
   * ENF-002: Every signal consumed must deduct credit
   */
  async recordConsumption(agentId, signalType, signalData, apiKey = null) {
    const timestamp = new Date().toISOString();
    const cost = AGENT_SIGNAL_PRICING[agentId] || AGENT_SIGNAL_PRICING.default;
    
    // Generate unique consumption ID
    const consumptionId = `cons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record = {
      consumption_id: consumptionId,
      agent_id: agentId,
      signal_type: signalType,
      signal_id: signalData?.signal_id || signalData?.id || 'unknown',
      timestamp: timestamp,
      cost_usd: cost,
      api_key: apiKey,
      signal_metadata: {
        source: signalData?.source || 'unknown',
        chain: signalData?.chain || 'unknown',
        profit_estimate: signalData?.estimated_profit_usd || signalData?.profitUsd || 0,
        confidence: signalData?.confidence || 0
      }
    };

    // Buffer for batch insert
    this.consumption_buffer.push(record);
    
    // Update agent stats
    if (!this.agent_stats.has(agentId)) {
      this.agent_stats.set(agentId, {
        signals_consumed: 0,
        total_cost: 0,
        last_signal_at: null
      });
    }
    const stats = this.agent_stats.get(agentId);
    stats.signals_consumed++;
    stats.total_cost += cost;
    stats.last_signal_at = timestamp;

    // Log for CLI
    console.log(`⚡ [AGENT_METERING] ${agentId} | Signal: ${record.signal_id?.slice(0, 12)} | Cost: $${cost.toFixed(4)}`);

    // If buffer is large, flush immediately
    if (this.consumption_buffer.length >= 50) {
      await this.flushBuffer();
    }

    return record;
  }

  /**
   * Flush consumption buffer to Supabase
   * Log Table: signal_consumption_logs
   */
  async flushBuffer() {
    if (this.consumption_buffer.length === 0) return;
    if (!this.supabase) {
      console.warn('⚠️ [AGENT_METERING] Supabase not available - buffering locally');
      return;
    }

    const records = [...this.consumption_buffer];
    this.consumption_buffer = [];

    try {
      const { error } = await this.supabase
        .from('signal_consumption_logs')
        .insert(records);

      if (error) {
        console.error(`❌ [AGENT_METERING] Flush error: ${error.message}`);
        // Re-add to buffer for retry
        this.consumption_buffer.unshift(...records);
      } else {
        console.log(`⚡ [AGENT_METERING] ${records.length} records persisted to signal_consumption_logs`);
      }
    } catch (err) {
      console.error(`❌ [AGENT_METERING] Exception: ${err.message}`);
      this.consumption_buffer.unshift(...records);
    }
  }

  /**
   * Get metering report for Grafana
   * ENF-005: revenue_per_agent metric
   */
  getMeteringReport() {
    const report = {
      generated_at: new Date().toISOString(),
      agents: {},
      total_signals: 0,
      total_cost_usd: 0,
      buffer_size: this.consumption_buffer.length
    };

    for (const [agentId, stats] of this.agent_stats.entries()) {
      report.agents[agentId] = {
        signals_consumed: stats.signals_consumed,
        total_cost_usd: parseFloat(stats.total_cost.toFixed(4)),
        revenue_per_signal: parseFloat((stats.total_cost / Math.max(1, stats.signals_consumed)).toFixed(4)),
        last_signal_at: stats.last_signal_at
      };
      report.total_signals += stats.signals_consumed;
      report.total_cost_usd += stats.total_cost;
    }

    report.total_cost_usd = parseFloat(report.total_cost_usd.toFixed(4));
    return report;
  }

  /**
   * Get cost for agent
   */
  getAgentCost(agentId) {
    return AGENT_SIGNAL_PRICING[agentId] || AGENT_SIGNAL_PRICING.default;
  }
}

// Singleton instance
const agentMetering = new AgentMeteringService();

module.exports = {
  AgentMeteringService,
  agentMetering,
  AGENT_SIGNAL_PRICING
};
