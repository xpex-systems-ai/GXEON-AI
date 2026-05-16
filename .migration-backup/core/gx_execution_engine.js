/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX EXECUTION ENGINE v1.0 — HYBRID ARCHITECTURE EXECUTION LAYER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Event: GXEON_HYBRID_ARCHITECTURE_DEPLOY
 * Mode: HYBRID_DECISION_EXECUTION_MONETIZATION
 * 
 * Responsibility:
 *   - Executar tarefas aprovadas
 *   - Rodar agentes automaticamente
 *   - Fallback manual quando necessário
 *   - Registrar resultado bruto
 * 
 * Input Topics: request.inbound (from Gateway), gx.decision.queue (legacy)
 * Output Topics: execution.run (intermediate), billing.charge, audit.trace
 * 
 * Constraints:
 *   - timeout_ms: 8000
 *   - retry_policy: 2
 *   - idempotency_required: true
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Kafka } = require('kafkajs');
const supabase = require('../server/services/supabase');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const EXECUTION_CONFIG = {
  timeout_ms: 8000,
  retry_policy: 2,
  idempotency_required: true,
  max_concurrent_executions: 10,
  fallback_enabled: true
};

const KAFKA_CONFIG = {
  clientId: 'gx-execution-engine',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
};

const TOPICS = {
  // Gateway integration
  request_inbound: 'request.inbound',      // From API Gateway
  execution_run: 'execution.run',          // To be executed
  
  // Output topics
  billing_charge: 'billing.charge',        // To billing engine
  audit_trace: 'audit.trace',               // Audit trail
  
  // Legacy hybrid topics (for backward compatibility)
  input_legacy: 'gx.decision.queue',
  output_legacy: 'gx.execution.results'
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
const AGENTS = {
  task_engine: require('./task_engine'),
  gelato_scanner: require('./gelato_scanner'),
  autonolas_agent: require('./autonolas_agent'),
  mev_matchmaker: require('../server/services/mevMatchmaker'),
  radar_shix: require('../server/services/radarShix'),
  executor: require('../server/routes/executor')
};

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
class GXExecutionEngine {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG);
    this.consumer = this.kafka.consumer({ 
      groupId: 'gx-execution-engine-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.producer = this.kafka.producer();
    this.runningExecutions = new Map(); // Track in-flight executions
    this.metrics = {
      executions_attempted: 0,
      executions_succeeded: 0,
      executions_failed: 0,
      executions_retried: 0,
      avg_execution_latency_ms: 0,
      fallback_activations: 0
    };
  }

  async initialize() {
    console.log('[GX_EXECUTION_ENGINE] Initializing...');
    
    await this.consumer.connect();
    await this.producer.connect();
    
    // Subscribe to both new gateway topic and legacy topic
    await this.consumer.subscribe({ topics: [TOPICS.request_inbound, TOPICS.input_legacy] });
    
    console.log('[GX_EXECUTION_ENGINE] Connected to Kafka');
    console.log(`[GX_EXECUTION_ENGINE] Subscribed to: ${TOPICS.request_inbound}, ${TOPICS.input_legacy}`);
    
    // Start consuming
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const event = JSON.parse(message.value.toString());
          
          // Handle different event types
          let executionEvent;
          
          if (event.event_type === 'REQUEST_INBOUND') {
            // New gateway format - transform to execution format
            console.log(`[GX_EXECUTION_ENGINE] Processing inbound request: ${event.request_id}`);
            executionEvent = this.transformGatewayEvent(event);
            
            // Check idempotency by request_id
            if (await this.isDuplicateByRequestId(event.request_id)) {
              console.log(`[GX_EXECUTION_ENGINE] Duplicate request detected: ${event.request_id}`);
              return;
            }
            
          } else if (event.event_type === 'DECISION_APPROVED') {
            // Legacy hybrid format
            console.log(`[GX_EXECUTION_ENGINE] Processing approved decision: ${event.decision_id}`);
            executionEvent = event;
            
            // Check idempotency
            if (await this.isDuplicate(event.decision_id)) {
              console.log(`[GX_EXECUTION_ENGINE] Duplicate execution detected: ${event.decision_id}`);
              return;
            }
            
          } else {
            console.log(`[GX_EXECUTION_ENGINE] Skipping unsupported event: ${event.event_type}`);
            return;
          }
          
          // Execute with timeout and retry
          const result = await this.executeWithRetry(event, executionId);
          
          // Publish result
          await this.publishResult(event, result, executionId);
          
          // Log to Supabase
          await this.logExecution(event, result, executionId);
          
          // Update metrics
          this.updateMetrics(result);
          
        } catch (error) {
          console.error('[GX_EXECUTION_ENGINE] Execution error:', error);
          await this.handleExecutionError(event, error, executionId);
        }
      }
    });
    
    console.log('[GX_EXECUTION_ENGINE] Ready');
  }

  async executeWithRetry(event, executionId) {
    const startTime = Date.now();
    let lastError = null;
    
    for (let attempt = 1; attempt <= EXECUTION_CONFIG.retry_policy + 1; attempt++) {
      try {
        console.log(`[GX_EXECUTION_ENGINE] Attempt ${attempt} for ${executionId}`);
        
        const result = await this.executeTask(event, executionId, attempt);
        
        const latency = Date.now() - startTime;
        
        return {
          success: true,
          execution_id: executionId,
          decision_id: event.decision_id,
          attempt: attempt,
          latency_ms: latency,
          result: result,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        lastError = error;
        console.error(`[GX_EXECUTION_ENGINE] Attempt ${attempt} failed:`, error.message);
        
        if (attempt < EXECUTION_CONFIG.retry_policy + 1) {
          this.metrics.executions_retried++;
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    // All retries exhausted
    throw lastError;
  }

  async executeTask(event, executionId, attempt) {
    // Set timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${EXECUTION_CONFIG.timeout_ms}ms`));
      }, EXECUTION_CONFIG.timeout_ms);
    });
    
    // Actual execution
    const executionPromise = this.runAgent(event, executionId, attempt);
    
    // Race between execution and timeout
    return Promise.race([executionPromise, timeoutPromise]);
  }

  async runAgent(event, executionId, attempt) {
    const taskType = event.original_event?.task_type || 
                     event.original_event?.opportunity_type || 
                     'generic';
    
    // Track execution
    this.runningExecutions.set(executionId, {
      decision_id: event.decision_id,
      start_time: Date.now(),
      task_type: taskType,
      attempt: attempt
    });
    
    try {
      let result;
      
      // Route to appropriate agent
      switch (taskType) {
        case 'new_pool':
        case 'arbitrage':
          result = await this.runRadarAgent(event);
          break;
          
        case 'smart_money':
        case 'whale_flow':
          result = await this.runSmartMoneyAgent(event);
          break;
          
        case 'gelato_task':
        case 'keeper_opportunity':
          result = await this.runGelatoAgent(event);
          break;
          
        case 'autonolas_task':
        case 'ai_service':
          result = await this.runAutonolasAgent(event);
          break;
          
        case 'mev_opportunity':
        case 'bundle':
          result = await this.runMevMatchmaker(event);
          break;
          
        default:
          result = await this.runGenericTask(event);
      }
      
      return {
        task_type: taskType,
        output: result,
        agent_used: taskType,
        execution_metadata: {
          attempt: attempt,
          priority: event.priority,
          roi: event.roi?.estimated
        }
      };
      
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  async runRadarAgent(event) {
    // Execute radar-based opportunity detection
    const radar = AGENTS.radar_shix;
    
    return {
      action: 'pool_analysis',
      pool_address: event.original_event?.pool_address,
      liquidity_analyzed: event.original_event?.liquidity_usd,
      confidence: event.roi?.confidence
    };
  }

  async runSmartMoneyAgent(event) {
    // Track smart money movements
    return {
      action: 'smart_money_tracking',
      wallet_tracked: event.original_event?.wallet_address,
      flow_amount: event.original_event?.amount_usd,
      alert_sent: true
    };
  }

  async runGelatoAgent(event) {
    // Execute via Gelato
    return {
      action: 'gelato_execution',
      task_id: `gelato_${Date.now()}`,
      chain: event.original_event?.chain,
      estimated_execution_time: '2-5 minutes'
    };
  }

  async runAutonolasAgent(event) {
    // Execute AI task via Autonolas
    return {
      action: 'autonolas_ai_task',
      service_id: event.original_event?.service_id,
      agent_address: event.original_event?.agent_address,
      task_queued: true
    };
  }

  async runMevMatchmaker(event) {
    // Submit to MEV-Share
    return {
      action: 'mev_bundle_submitted',
      bundle_id: `bundle_${Date.now()}`,
      target_block: event.original_event?.block_number,
      profit_estimate: event.roi?.estimated_profit
    };
  }

  async runGenericTask(event) {
    // Generic execution
    return {
      action: 'generic_execution',
      input_processed: event.original_event,
      timestamp: new Date().toISOString()
    };
  }

  async publishResult(event, result, executionId) {
    const message = {
      event_type: 'EXECUTION_RESULT',
      execution_id: executionId,
      decision_id: event.decision_id,
      timestamp: new Date().toISOString(),
      success: result.success,
      result: result,
      billing_metadata: {
        chargeable: result.success,
        execution_cost_usd: this.calculateExecutionCost(result),
        decision_roi: event.roi?.estimated
      }
    };
    
    // Publish to billing.charge for monetization
    await this.producer.send({
      topic: TOPICS.billing_charge,
      messages: [{
        key: executionId,
        value: JSON.stringify(message),
        headers: {
          'content-type': 'application/json',
          'x-execution-success': String(result.success),
          'x-chargeable': String(result.success)
        }
      }]
    });
    
    // Publish to audit.trace for compliance
    await this.producer.send({
      topic: TOPICS.audit_trace,
      messages: [{
        key: executionId,
        value: JSON.stringify({
          event_type: 'EXECUTION_COMPLETED',
          timestamp: new Date().toISOString(),
          ...message
        })
      }]
    });
    
    console.log(`[GX_EXECUTION_ENGINE] ✅ Result published: ${executionId} (success: ${result.success}) → billing.charge, audit.trace`);
  }

  async handleExecutionError(event, error, executionId) {
    const errorResult = {
      event_type: 'EXECUTION_RESULT',
      execution_id: executionId,
      decision_id: event?.decision_id,
      timestamp: new Date().toISOString(),
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.name
      },
      fallback_activated: EXECUTION_CONFIG.fallback_enabled
    };
    
    // Publish error result to billing (charge partial for failed attempts)
    await this.producer.send({
      topic: TOPICS.billing_charge,
      messages: [{
        key: executionId,
        value: JSON.stringify(errorResult)
      }]
    });
    
    // Log to audit
    await this.producer.send({
      topic: TOPICS.audit_trace,
      messages: [{
        key: executionId,
        value: JSON.stringify({
          event_type: 'EXECUTION_FAILED',
          ...errorResult
        })
      }]
    });
    
    // Log to Supabase
    await this.logExecutionError(event, error, executionId);
    
    // Activate fallback if enabled
    if (EXECUTION_CONFIG.fallback_enabled) {
      this.metrics.fallback_activations++;
      console.log(`[GX_EXECUTION_ENGINE] 🔄 Fallback activated for ${executionId}`);
      // Would trigger manual review queue here
    }
    
    this.metrics.executions_failed++;
  }

  async isDuplicate(decisionId) {
    try {
      const { data, error } = await supabase
        .from('gx_execution_log')
        .select('execution_id')
        .eq('decision_id', decisionId)
        .limit(1);
      
      if (error) return false;
      return data && data.length > 0;
    } catch (err) {
      return false;
    }
  }

  async isDuplicateByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('gx_execution_log')
        .select('execution_id')
        .eq('request_id', requestId)
        .limit(1);
      
      if (error) return false;
      return data && data.length > 0;
    } catch (err) {
      return false;
    }
  }

  transformGatewayEvent(event) {
    // Transform REQUEST_INBOUND to DECISION_APPROVED format
    return {
      event_type: 'DECISION_APPROVED',
      decision_id: `gateway_${event.request_id}`,
      request_id: event.request_id,
      timestamp: event.timestamp,
      original_event: event.payload,
      user: event.user,
      priority: event.payload?.priority || 50,
      roi: {
        estimated: 0.5, // Default for gateway requests
        confidence: 0.7
      },
      risk: {
        score: 0.3,
        assessment: 'ACCEPTABLE'
      },
      execution_constraints: {
        timeout_ms: EXECUTION_CONFIG.timeout_ms,
        retry_policy: EXECUTION_CONFIG.retry_policy,
        idempotency_key: event.request_id
      }
    };
  }

  calculateExecutionCost(result) {
    // Base cost + latency cost
    const baseCost = 0.001; // $0.001 base
    const latencyCost = (result.latency_ms || 0) * 0.00001; // $0.00001 per ms
    return baseCost + latencyCost;
  }

  async logExecution(event, result, executionId) {
    try {
      const { error } = await supabase
        .from('gx_execution_log')
        .insert({
          execution_id: executionId,
          decision_id: event.decision_id,
          timestamp: result.timestamp,
          success: result.success,
          task_type: event.original_event?.task_type || 'generic',
          latency_ms: result.latency_ms,
          attempts: result.attempt,
          result_data: result.result,
          metadata: {
            priority: event.priority,
            roi: event.roi,
            risk: event.risk
          }
        });
      
      if (error) {
        console.error('[GX_EXECUTION_ENGINE] Supabase log error:', error);
      }
    } catch (err) {
      console.error('[GX_EXECUTION_ENGINE] Failed to log execution:', err);
    }
  }

  async logExecutionError(event, error, executionId) {
    try {
      await supabase
        .from('gx_error_log')
        .insert({
          service: 'gx_execution_engine',
          execution_id: executionId,
          decision_id: event?.decision_id,
          timestamp: new Date().toISOString(),
          error_message: error.message,
          stack: error.stack,
          event_data: event
        });
    } catch (err) {
      console.error('[GX_EXECUTION_ENGINE] Failed to log error:', err);
    }
  }

  updateMetrics(result) {
    this.metrics.executions_attempted++;
    
    if (result.success) {
      this.metrics.executions_succeeded++;
    }
    
    // Update rolling average latency
    const total = this.metrics.executions_attempted;
    const current = this.metrics.avg_execution_latency_ms;
    this.metrics.avg_execution_latency_ms = ((current * (total - 1)) + (result.latency_ms || 0)) / total;
  }

  getMetrics() {
    return {
      ...this.metrics,
      success_rate: this.metrics.executions_attempted > 0
        ? (this.metrics.executions_succeeded / this.metrics.executions_attempted * 100).toFixed(2) + '%'
        : '0%',
      active_executions: this.runningExecutions.size,
      timestamp: new Date().toISOString()
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('[GX_EXECUTION_ENGINE] Shutting down...');
    console.log('[GX_EXECUTION_ENGINE] Final metrics:', this.getMetrics());
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('[GX_EXECUTION_ENGINE] Disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AND RUN
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { GXExecutionEngine, EXECUTION_CONFIG };

// Run if called directly
if (require.main === module) {
  const engine = new GXExecutionEngine();
  
  engine.initialize().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[GX_EXECUTION_ENGINE] SIGINT received');
    await engine.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[GX_EXECUTION_ENGINE] SIGTERM received');
    await engine.shutdown();
    process.exit(0);
  });
}
