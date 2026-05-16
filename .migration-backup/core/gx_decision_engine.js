/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX DECISION ENGINE v1.0 — HYBRID ARCHITECTURE DECISION LAYER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Event: GXEON_HYBRID_ARCHITECTURE_DEPLOY
 * Mode: HYBRID_DECISION_EXECUTION_MONETIZATION
 * 
 * Responsibility:
 *   - Analisar oportunidades
 *   - Calcular ROI estimado
 *   - Avaliar risco operacional
 *   - Definir prioridade de execução
 * 
 * Input Topic: gx.signals.raw
 * Output Events: DECISION_APPROVED | DECISION_REJECTED
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Kafka } = require('kafkajs');
const supabase = require('../server/services/supabase');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const DECISION_RULES = {
  min_roi_threshold: 0.15,      // 15% minimum ROI
  max_risk_threshold: 0.7,      // 70% max risk score
  priority_scoring: 'roi_weighted_latency_adjusted',
  
  // Risk calculation weights
  risk_weights: {
    volatility: 0.3,
    liquidity_depth: 0.25,
    gas_cost_ratio: 0.2,
    historical_success: 0.15,
    market_conditions: 0.1
  }
};

const KAFKA_CONFIG = {
  clientId: 'gx-decision-engine',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
};

const TOPICS = {
  input: 'gx.signals.raw',
  output_approved: 'gx.decision.queue',
  output_rejected: 'gx.audit.logs',
  api_input: 'gx.api.requests'
};

// ═══════════════════════════════════════════════════════════════════════════
// DECISION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
class GXDecisionEngine {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG);
    this.consumer = this.kafka.consumer({ 
      groupId: 'gx-decision-engine-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.producer = this.kafka.producer();
    this.metrics = {
      decisions_processed: 0,
      decisions_approved: 0,
      decisions_rejected: 0,
      avg_decision_latency_ms: 0,
      rejection_reasons: {}
    };
  }

  async initialize() {
    console.log('[GX_DECISION_ENGINE] Initializing...');
    
    await this.consumer.connect();
    await this.producer.connect();
    
    // Subscribe to input topics
    await this.consumer.subscribe({ topics: [TOPICS.input, TOPICS.api_input] });
    
    console.log('[GX_DECISION_ENGINE] Connected to Kafka');
    console.log(`[GX_DECISION_ENGINE] Subscribed to: ${TOPICS.input}, ${TOPICS.api_input}`);
    
    // Start consuming
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const startTime = Date.now();
        
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`[GX_DECISION_ENGINE] Processing ${event.event_id || 'unknown'}`);
          
          const decision = await this.makeDecision(event);
          
          // Log to Supabase
          await this.logDecision(event, decision, Date.now() - startTime);
          
          // Update metrics
          this.updateMetrics(decision, Date.now() - startTime);
          
        } catch (error) {
          console.error('[GX_DECISION_ENGINE] Processing error:', error);
          await this.logError(message, error);
        }
      }
    });
    
    console.log('[GX_DECISION_ENGINE] Ready');
  }

  async makeDecision(event) {
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate ROI
    const roi = this.calculateROI(event);
    
    // Calculate Risk Score
    const riskScore = this.calculateRiskScore(event);
    
    // Calculate Priority
    const priority = this.calculatePriority(roi, riskScore, event);
    
    // Decision gate
    const approved = roi >= DECISION_RULES.min_roi_threshold && 
                     riskScore <= DECISION_RULES.max_risk_threshold;
    
    const decision = {
      decision_id: decisionId,
      original_event: event,
      timestamp: new Date().toISOString(),
      roi: {
        estimated: roi,
        confidence: this.calculateConfidence(event),
        breakdown: this.getROIBreakdown(event)
      },
      risk: {
        score: riskScore,
        breakdown: this.getRiskBreakdown(event),
        assessment: riskScore <= DECISION_RULES.max_risk_threshold ? 'ACCEPTABLE' : 'HIGH'
      },
      priority: priority,
      decision: approved ? 'APPROVED' : 'REJECTED',
      reason: approved ? null : this.getRejectionReason(roi, riskScore),
      execution_constraints: approved ? {
        timeout_ms: 8000,
        retry_policy: 2,
        idempotency_key: `exec_${decisionId}`
      } : null
    };
    
    // Publish to appropriate topic
    if (approved) {
      await this.producer.send({
        topic: TOPICS.output_approved,
        messages: [{
          key: decisionId,
          value: JSON.stringify({
            event_type: 'DECISION_APPROVED',
            ...decision
          }),
          headers: {
            'content-type': 'application/json',
            'x-decision-priority': String(priority)
          }
        }]
      });
      console.log(`[GX_DECISION_ENGINE] ✅ APPROVED: ${decisionId} (ROI: ${(roi*100).toFixed(2)}%, Risk: ${(riskScore*100).toFixed(1)}%)`);
    } else {
      await this.producer.send({
        topic: TOPICS.output_rejected,
        messages: [{
          key: decisionId,
          value: JSON.stringify({
            event_type: 'DECISION_REJECTED',
            ...decision
          })
        }]
      });
      console.log(`[GX_DECISION_ENGINE] ❌ REJECTED: ${decisionId} (${decision.reason})`);
    }
    
    return decision;
  }

  calculateROI(event) {
    if (!event.estimated_profit_usd || !event.estimated_cost_usd) {
      return 0;
    }
    
    const profit = parseFloat(event.estimated_profit_usd);
    const cost = parseFloat(event.estimated_cost_usd) || 1;
    
    return (profit - cost) / cost;
  }

  calculateRiskScore(event) {
    const weights = DECISION_RULES.risk_weights;
    
    // Calculate individual risk factors (0-1 scale)
    const volatilityRisk = this.normalizeRisk(event.volatility_score, 0.5);
    const liquidityRisk = this.normalizeRisk(event.liquidity_usd, 10000, true); // inverse
    const gasRisk = this.normalizeRisk(event.gas_cost_usd / event.estimated_profit_usd, 0.2);
    const historicalRisk = 1 - (event.historical_success_rate || 0.5);
    const marketRisk = this.getMarketConditionRisk(event.chain);
    
    // Weighted sum
    const riskScore = 
      (volatilityRisk * weights.volatility) +
      (liquidityRisk * weights.liquidity_depth) +
      (gasRisk * weights.gas_cost_ratio) +
      (historicalRisk * weights.historical_success) +
      (marketRisk * weights.market_conditions);
    
    return Math.min(riskScore, 1.0);
  }

  calculatePriority(roi, riskScore, event) {
    // ROI-weighted, latency-adjusted priority scoring
    const basePriority = roi * 100; // 0-100 base
    const riskAdjustment = (1 - riskScore) * 20; // +0 to +20 for low risk
    const urgencyBonus = event.urgent ? 30 : 0;
    const liquidityBonus = Math.min(event.liquidity_usd / 100000, 10); // +0 to +10
    
    const finalPriority = basePriority + riskAdjustment + urgencyBonus + liquidityBonus;
    return Math.min(Math.round(finalPriority), 100);
  }

  calculateConfidence(event) {
    // Confidence based on data quality
    let confidence = 0.5;
    
    if (event.confidence_score) confidence = event.confidence_score;
    if (event.data_sources && event.data_sources.length > 2) confidence += 0.1;
    if (event.verified) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  normalizeRisk(value, threshold, inverse = false) {
    if (inverse) {
      return Math.max(0, Math.min(1, 1 - (value / threshold)));
    }
    return Math.max(0, Math.min(1, value / threshold));
  }

  getMarketConditionRisk(chain) {
    // Would query market conditions service
    const marketConditions = {
      ethereum: 0.3,
      arbitrum: 0.2,
      polygon: 0.25,
      base: 0.35
    };
    return marketConditions[chain] || 0.3;
  }

  getROIBreakdown(event) {
    return {
      estimated_profit: event.estimated_profit_usd,
      estimated_cost: event.estimated_cost_usd,
      gas_cost: event.gas_cost_usd,
      slippage_estimate: event.slippage_usd || 0,
      fee_estimate: event.fee_usd || 0
    };
  }

  getRiskBreakdown(event) {
    return {
      volatility: event.volatility_score || 0.5,
      liquidity_depth: event.liquidity_usd || 0,
      gas_ratio: event.gas_cost_usd / (event.estimated_profit_usd || 1),
      historical_success: event.historical_success_rate || 0.5,
      market_conditions: this.getMarketConditionRisk(event.chain)
    };
  }

  getRejectionReason(roi, riskScore) {
    if (roi < DECISION_RULES.min_roi_threshold && riskScore > DECISION_RULES.max_risk_threshold) {
      return 'INSUFFICIENT_ROI_AND_HIGH_RISK';
    }
    if (roi < DECISION_RULES.min_roi_threshold) {
      return `INSUFFICIENT_ROI: ${(roi*100).toFixed(2)}% < ${(DECISION_RULES.min_roi_threshold*100)}%`;
    }
    return `HIGH_RISK: ${(riskScore*100).toFixed(1)}% > ${(DECISION_RULES.max_risk_threshold*100)}%`;
  }

  async logDecision(event, decision, latencyMs) {
    try {
      const { error } = await supabase
        .from('gx_decision_log')
        .insert({
          decision_id: decision.decision_id,
          event_id: event.event_id || event.id,
          event_type: event.event_type || 'signal',
          timestamp: decision.timestamp,
          roi: decision.roi.estimated,
          risk_score: decision.risk.score,
          priority: decision.priority,
          decision: decision.decision,
          reason: decision.reason,
          latency_ms: latencyMs,
          metadata: {
            roi_breakdown: decision.roi.breakdown,
            risk_breakdown: decision.risk.breakdown,
            original_event: event
          }
        });
      
      if (error) {
        console.error('[GX_DECISION_ENGINE] Supabase log error:', error);
      }
    } catch (err) {
      console.error('[GX_DECISION_ENGINE] Failed to log decision:', err);
    }
  }

  async logError(message, error) {
    try {
      await supabase
        .from('gx_error_log')
        .insert({
          service: 'gx_decision_engine',
          timestamp: new Date().toISOString(),
          error_message: error.message,
          stack: error.stack,
          raw_message: message.value.toString()
        });
    } catch (err) {
      console.error('[GX_DECISION_ENGINE] Failed to log error:', err);
    }
  }

  updateMetrics(decision, latencyMs) {
    this.metrics.decisions_processed++;
    
    if (decision.decision === 'APPROVED') {
      this.metrics.decisions_approved++;
    } else {
      this.metrics.decisions_rejected++;
      const reason = decision.reason || 'UNKNOWN';
      this.metrics.rejection_reasons[reason] = (this.metrics.rejection_reasons[reason] || 0) + 1;
    }
    
    // Update rolling average latency
    const total = this.metrics.decisions_processed;
    const current = this.metrics.avg_decision_latency_ms;
    this.metrics.avg_decision_latency_ms = ((current * (total - 1)) + latencyMs) / total;
  }

  getMetrics() {
    return {
      ...this.metrics,
      approval_rate: this.metrics.decisions_processed > 0 
        ? (this.metrics.decisions_approved / this.metrics.decisions_processed * 100).toFixed(2) + '%'
        : '0%',
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('[GX_DECISION_ENGINE] Shutting down...');
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('[GX_DECISION_ENGINE] Disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AND RUN
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { GXDecisionEngine, DECISION_RULES };

// Run if called directly
if (require.main === module) {
  const engine = new GXDecisionEngine();
  
  engine.initialize().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[GX_DECISION_ENGINE] SIGINT received');
    console.log('[GX_DECISION_ENGINE] Final metrics:', engine.getMetrics());
    await engine.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[GX_DECISION_ENGINE] SIGTERM received');
    await engine.shutdown();
    process.exit(0);
  });
}
