/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXZ1 MARKET ECONOMY LAYER v1.0 — EXTERNAL DATA MARKETPLACE API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Module: GXZ1_MARKET_ECONOMY_LAYER
 * Mode: REVENUE_INFRASTRUCTURE
 * 
 * External-facing API for third-party agents to consume and pay for signals
 * Transforms internal signals into subscription-based revenue streams
 * 
 * CRITICAL_RULES:
 *   RULE_1: ALL_EXTERNAL_CONSUMPTION_MUST_BE_PAID
 *   RULE_2: ALL_AGENTS_ARE_METERED_ENTITIES
 *   RULE_3: ALL_SIGNALS_ARE_COMMERCIALLY_PRICED
 *   RULE_4: NO_FREE_STREAMS_EXIST
 *   RULE_5: REVENUE_IS_A_SYSTEM_EVENT
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { billingGate, gxeonBillingGateMiddleware, SIGNAL_PRICING } = require('../middleware/gxeonBillingGate');
const { agentMetering } = require('../services/agentMetering');
const supabase = require('../services/supabase');

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TIER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SUBSCRIPTION_TIERS = {
  basic: {
    monthly_price: 49,
    signals_per_minute: 60,
    features: ['new_pools_feed', 'basic_alerts'],
    streams: ['new_pools']
  },
  pro: {
    monthly_price: 299,
    signals_per_minute: 300,
    features: ['all_basic', 'smart_money_feed', 'mempool_alerts', 'api_access'],
    streams: ['new_pools', 'smart_money', 'mempool']
  },
  enterprise: {
    monthly_price: 999,
    signals_per_minute: 0, // Unlimited
    features: ['all_pro', 'dedicated_stream', 'custom_filters', 'priority_support', 'webhooks'],
    streams: ['new_pools', 'smart_money', 'mempool', 'whale_flow', 'custom']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT MARKETPLACE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
const AGENT_TYPES = {
  signal_consumer_bot: {
    billing: 'per_signal',
    description: 'Consumes real-time signals for trading decisions'
  },
  execution_agent: {
    billing: 'per_task',
    description: 'Executes on-chain tasks and transactions'
  },
  arbitrage_agent: {
    billing: 'per_opportunity',
    description: 'Detects and executes arbitrage opportunities'
  },
  analytics_agent: {
    billing: 'subscription',
    description: 'Historical data analysis and reporting'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/signals/feed — Paid Stream
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/feed', gxeonBillingGateMiddleware('default'), async (req, res) => {
  try {
    const { type = 'all', limit = 50 } = req.query;
    
    // Fetch signals from Supabase
    let query = supabase
      .from('radar_liquidity_pools')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 100));
    
    if (type !== 'all') {
      query = query.eq('status', type);
    }
    
    const { data: signals, error } = await query;
    
    if (error) throw error;

    // Log consumption for agent metering
    await agentMetering.recordConsumption(
      'external_api_consumer',
      type,
      { signal_count: signals?.length || 0 },
      req.headers['x-gxeon-key']
    );

    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        signals_returned: signals?.length || 0,
        pricing: `per_signal: $${SIGNAL_PRICING.default}`,
        billing_event: req.billing_event
      },
      data: {
        signals: signals || [],
        stream_type: 'paid_feed',
        next_poll: '/v1/signals/feed?cursor=next'
      }
    });
    
  } catch (error) {
    console.error('[MARKETPLACE] Feed error:', error);
    res.status(500).json({
      success: false,
      error: 'FEED_ERROR',
      message: 'Signal feed unavailable'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/signals/smart-money — Pro Stream ($0.03)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/smart-money', gxeonBillingGateMiddleware('smart_money'), async (req, res) => {
  try {
    const { limit = 100, min_amount = 5000 } = req.query;
    
    const { data: flows, error } = await supabase
      .from('radar_smart_money_flows')
      .select('*')
      .gte('amount_usd', parseFloat(min_amount))
      .order('detected_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 200));
    
    if (error) throw error;

    // Meter this consumption
    await agentMetering.recordConsumption(
      'external_smart_money_consumer',
      'smart_money',
      { flow_count: flows?.length || 0 },
      req.headers['x-gxeon-key']
    );

    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        pricing: `per_signal: $${SIGNAL_PRICING.smart_money}`,
        min_filter_usd: parseFloat(min_amount),
        flows_returned: flows?.length || 0,
        billing_event: req.billing_event
      },
      data: {
        flows: flows || [],
        stream_type: 'pro_stream',
        total_value_flowed: flows?.reduce((sum, f) => sum + (f.amount_usd || 0), 0) || 0
      }
    });
    
  } catch (error) {
    console.error('[MARKETPLACE] Smart money error:', error);
    res.status(500).json({
      success: false,
      error: 'SMART_MONEY_ERROR',
      message: 'Smart money feed unavailable'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/signals/new-pools — Basic Stream ($0.05)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/new-pools', gxeonBillingGateMiddleware('new_pool'), async (req, res) => {
  try {
    const { limit = 50, min_liquidity = 10000, chain = 'all' } = req.query;
    
    let query = supabase
      .from('radar_liquidity_pools')
      .select('*')
      .gte('liquidity_usd', parseFloat(min_liquidity))
      .order('detected_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 100));
    
    if (chain !== 'all') {
      query = query.eq('chain_id', getChainId(chain));
    }
    
    const { data: pools, error } = await query;
    
    if (error) throw error;

    // Meter consumption
    await agentMetering.recordConsumption(
      'external_new_pools_consumer',
      'new_pool',
      { pool_count: pools?.length || 0 },
      req.headers['x-gxeon-key']
    );

    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        pricing: `per_signal: $${SIGNAL_PRICING.new_pool}`,
        min_liquidity_filter: parseFloat(min_liquidity),
        pools_returned: pools?.length || 0,
        billing_event: req.billing_event
      },
      data: {
        pools: pools || [],
        stream_type: 'basic_stream',
        total_liquidity: pools?.reduce((sum, p) => sum + (p.liquidity_usd || 0), 0) || 0
      }
    });
    
  } catch (error) {
    console.error('[MARKETPLACE] New pools error:', error);
    res.status(500).json({
      success: false,
      error: 'NEW_POOLS_ERROR',
      message: 'New pools feed unavailable'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/agents/execute — Agent Marketplace (per_execution)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/agents/execute', gxeonBillingGateMiddleware('mev_opportunity'), async (req, res) => {
  try {
    const { agent_type, task_config } = req.body;
    
    // Validate agent type
    if (!AGENT_TYPES[agent_type]) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AGENT_TYPE',
        valid_types: Object.keys(AGENT_TYPES)
      });
    }
    
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log agent execution request
    await agentMetering.recordConsumption(
      agent_type,
      'agent_execution',
      { 
        execution_id: executionId,
        task_config: task_config 
      },
      req.headers['x-gxeon-key']
    );

    // Queue task for processing (async)
    const { error: queueError } = await supabase
      .from('agent_execution_queue')
      .insert({
        execution_id: executionId,
        agent_type,
        task_config,
        status: 'queued',
        requested_by: req.billing_event?.user_id,
        billing_event_id: req.billing_event?.transaction_id,
        queued_at: new Date().toISOString()
      });
    
    if (queueError) throw queueError;

    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        pricing: `per_execution: $${SIGNAL_PRICING.mev_opportunity}`,
        agent_type,
        billing_event: req.billing_event
      },
      data: {
        execution_id: executionId,
        status: 'queued',
        estimated_completion: '2-5 minutes',
        status_check: `/v1/agents/status/${executionId}`
      }
    });
    
  } catch (error) {
    console.error('[MARKETPLACE] Agent execution error:', error);
    res.status(500).json({
      success: false,
      error: 'AGENT_EXECUTION_ERROR',
      message: 'Agent execution failed to queue'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/marketplace/status — Check execution status
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/agents/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const { data, error } = await supabase
      .from('agent_execution_queue')
      .select('*')
      .eq('execution_id', executionId)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        error: 'EXECUTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        execution_id: executionId,
        status: data.status,
        agent_type: data.agent_type,
        result: data.result,
        completed_at: data.completed_at,
        queued_at: data.queued_at
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'STATUS_CHECK_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/marketplace/tiers — Get subscription info
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/marketplace/tiers', async (req, res) => {
  res.json({
    success: true,
    data: {
      tiers: SUBSCRIPTION_TIERS,
      agent_types: AGENT_TYPES,
      signal_pricing: SIGNAL_PRICING,
      billing_model: 'HYBRID: per_signal + subscription + execution_fee'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINT: /v1/marketplace/revenue — Revenue metrics (Grafana)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/marketplace/revenue', async (req, res) => {
  try {
    const apiKey = req.headers['x-gxeon-key'];
    
    // Validate admin access (would check for admin tier)
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }
    
    const report = agentMetering.getMeteringReport();
    const gateMetrics = billingGate.getMetrics();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        billing_gate_metrics: gateMetrics,
        agent_consumption: report,
        revenue_pipeline: {
          flow: [
            'signal_generated',
            'signal_priced',
            'billing_event_created',
            'api_gateway_validates_payment',
            'signal_delivered_to_client',
            'consumption_logged',
            'revenue_sent_to_supabase',
            'grafana_dashboard_updated'
          ],
          status: 'active'
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'REVENUE_METRICS_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function getChainId(chainName) {
  const chains = {
    ethereum: 1,
    arbitrum: 42161,
    polygon: 137,
    base: 8453
  };
  return chains[chainName.toLowerCase()] || 1;
}

module.exports = router;
module.exports.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
module.exports.AGENT_TYPES = AGENT_TYPES;
