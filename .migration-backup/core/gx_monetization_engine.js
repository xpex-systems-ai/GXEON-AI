/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX MONETIZATION ENGINE v1.0 — HYBRID ARCHITECTURE MONETIZATION LAYER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Event: GXEON_HYBRID_ARCHITECTURE_DEPLOY
 * Mode: HYBRID_DECISION_EXECUTION_MONETIZATION
 * 
 * Responsibility:
 *   - Cobrar por execução
 *   - Registrar billing ledger
 *   - Emitir logs financeiros
 *   - Expor API de consumo externo
 * 
 * Input Topics: billing.charge (from Execution Engine), gx.execution.results (legacy)
 * Output Topics: gx.billing.events (revenue), audit.trace (compliance)
 * Actions:
 *   - write_to_supabase_ledger
 *   - update_user_balance
 *   - emit_revenue_event
 *   - fail_closed_billing (block if billing unavailable)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Kafka } = require('kafkajs');
const supabase = require('../server/services/supabase');
const { agentMetering } = require('../server/services/agentMetering');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const MONETIZATION_CONFIG = {
  enable_revenue_events: true,
  enable_balance_updates: true,
  enable_audit_logging: true,
  billing_mode: 'STRICT', // STRICT = no billing = no data
  fail_closed: true,      // If billing fails, block result
  revenue_beneficiary: '0x3955d559055DadB7067054cB6E6f974710345224'
};

const PRICING = {
  execution_base: 0.005,        // $0.005 per execution
  decision_processing: 0.001,   // $0.001 per decision
  latency_per_ms: 0.00001,    // $0.00001 per ms latency
  
  // Success bonus/penalty
  success_multiplier: 1.0,
  failure_multiplier: 0.5      // Still charge for failed attempts
};

const KAFKA_CONFIG = {
  clientId: 'gx-monetization-engine',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
};

const TOPICS = {
  // New gateway topics
  billing_charge: 'billing.charge',        // Input from execution engine
  audit_trace: 'audit.trace',               // Compliance output
  
  // Legacy topics
  input_legacy: 'gx.execution.results',
  output_legacy: 'gx.billing.events',
  audit_legacy: 'gx.audit.logs'
};

// ═══════════════════════════════════════════════════════════════════════════
// MONETIZATION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
class GXMonetizationEngine {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG);
    this.consumer = this.kafka.consumer({ 
      groupId: 'gx-monetization-engine-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.producer = this.kafka.producer();
    this.metrics = {
      executions_billed: 0,
      revenue_usd: 0,
      balance_updates: 0,
      billing_failures: 0,
      avg_billing_latency_ms: 0
    };
  }

  async initialize() {
    console.log('[GX_MONETIZATION_ENGINE] Initializing...');
    
    await this.consumer.connect();
    await this.producer.connect();
    
    // Subscribe to billing.charge from execution engine
    await this.consumer.subscribe({ topics: [TOPICS.billing_charge, TOPICS.input_legacy] });
    
    console.log('[GX_MONETIZATION_ENGINE] Connected to Kafka');
    console.log(`[GX_MONETIZATION_ENGINE] Subscribed to: ${TOPICS.billing_charge}, ${TOPICS.input_legacy}`);
    
    // Start consuming
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const billingStart = Date.now();
        
        try {
          const event = JSON.parse(message.value.toString());
          
          if (event.event_type !== 'EXECUTION_RESULT') {
            console.log(`[GX_MONETIZATION_ENGINE] Skipping: ${event.event_type}`);
            return;
          }
          
          // Fail-closed check: Validate event has required billing metadata
          if (!event.execution_id) {
            console.error(`[GX_MONETIZATION_ENGINE] ❌ BLOCKED: Missing execution_id`);
            await this.publishBlockedEvent(event, 'MISSING_EXECUTION_ID');
            return;
          }
          
          console.log(`[GX_MONETIZATION_ENGINE] Billing ${event.execution_id}`);
          
          // Calculate billing
          const billing = this.calculateBilling(event);
          
          // Execute billing actions
          const billingResult = await this.executeBilling(event, billing);
          
          // FAIL-CLOSED: If billing failed and fail_closed is enabled, block result
          if (!billingResult.success && MONETIZATION_CONFIG.fail_closed) {
            console.error(`[GX_MONETIZATION_ENGINE] ❌ FAIL-CLOSED: Billing failed for ${event.execution_id}`);
            await this.publishBlockedEvent(event, 'BILLING_FAILED');
            return;
          }
          
          // Publish revenue event
          await this.publishRevenueEvent(event, billing, billingResult);
          
          // Update metrics
          this.updateMetrics(billing, Date.now() - billingStart, billingResult.success);
          
          console.log(`[GX_MONETIZATION_ENGINE] ✅ Billed: ${event.execution_id} ($${billing.total_usd.toFixed(4)})`);
          
        } catch (error) {
          console.error('[GX_MONETIZATION_ENGINE] Billing error:', error);
          await this.handleBillingError(message, error);
        }
      }
    });
    
    console.log('[GX_MONETIZATION_ENGINE] Ready');
  }

  calculateBilling(event) {
    const execution = event.result;
    
    // Base execution fee
    let total = PRICING.execution_base;
    
    // Add latency cost
    if (execution?.latency_ms) {
      total += execution.latency_ms * PRICING.latency_per_ms;
    }
    
    // Add decision processing fee
    total += PRICING.decision_processing;
    
    // Apply success/failure multiplier
    const multiplier = event.success ? PRICING.success_multiplier : PRICING.failure_multiplier;
    total *= multiplier;
    
    return {
      total_usd: total,
      breakdown: {
        execution_base: PRICING.execution_base,
        latency_cost: (execution?.latency_ms || 0) * PRICING.latency_per_ms,
        decision_fee: PRICING.decision_processing,
        success_multiplier: multiplier
      },
      execution_metadata: {
        latency_ms: execution?.latency_ms,
        attempts: execution?.attempt,
        success: event.success,
        task_type: execution?.result?.task_type || 'generic'
      }
    };
  }

  async executeBilling(event, billing) {
    const billingId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract user/api info from event
    const userId = event.result?.result?.user_id || 
                   event.decision_metadata?.user_id || 
                   event.user?.id ||
                   'system';
    
    const apiKeyId = event.user?.api_key_id || 
                     event.metadata?.api_key_id || 
                     userId;
    
    // Determine billing mode from event metadata
    const isExternal = event.metadata?.is_external || 
                       event.metadata?.traffic_type === 'EXTERNAL_AGENT' ||
                       event.billing?.mode === 'REAL';
    
    // Skip real billing for internal test requests
    if (!isExternal && event.metadata?.billing_mode === 'TEST_ONLY') {
      console.log(`[GX_MONETIZATION_ENGINE] ℹ️  TEST_ONLY request - skipping real billing: ${event.execution_id}`);
      return {
        success: true,
        billing_id: billingId,
        mode: 'TEST_ONLY',
        note: 'No billing for internal test requests'
      };
    }
    
    try {
      // Step 1: Write to billing ledger (with all required fields for revenue trace)
      await this.writeToLedger(billingId, event, billing, userId, apiKeyId);
      
      // Step 2: Update user balance (only for external/real billing)
      if (MONETIZATION_CONFIG.enable_balance_updates && userId !== 'system') {
        await this.updateUserBalance(userId, billing.total_usd);
      }
      
      // Step 3: Record agent metering
      await this.recordAgentConsumption(event, billing);
      
      // Step 4: Emit audit log
      if (MONETIZATION_CONFIG.enable_audit_logging) {
        await this.emitAuditLog(billingId, event, billing);
      }
      
      return {
        success: true,
        billing_id: billingId,
        amount_charged: billing.total_usd,
        user_id: userId
      };
      
    } catch (error) {
      console.error('[GX_MONETIZATION_ENGINE] Billing execution failed:', error);
      
      // STRICT mode: if billing fails, we still log it as a failure
      await this.logBillingFailure(billingId, event, billing, error);
      
      this.metrics.billing_failures++;
      
      return {
        success: false,
        billing_id: billingId,
        error: error.message
      };
    }
  }

  async writeToLedger(billingId, event, billing, userId, apiKeyId) {
    // REQUIRED FIELDS for revenue trace:
    // api_key_id, cost, latency, success_flag, execution_id
    
    const ledgerEntry = {
      // Primary identifiers
      billing_id: billingId,
      execution_id: event.execution_id,
      request_id: event.request_id,
      decision_id: event.decision_id,
      
      // Revenue trace required fields
      api_key_id: apiKeyId,
      cost: billing.total_usd,
      cost_usd: billing.total_usd,
      latency: billing.execution_metadata.latency_ms || 0,
      latency_ms: billing.execution_metadata.latency_ms || 0,
      success_flag: event.success === true,
      success: event.success,
      
      // Billing details
      amount_usd: billing.total_usd,
      breakdown: billing.breakdown,
      
      // Metadata
      timestamp: new Date().toISOString(),
      user_id: userId,
      traffic_type: event.metadata?.traffic_type || 'UNKNOWN',
      is_external: event.metadata?.is_external || false,
      billing_mode: event.metadata?.billing_mode || 'REAL',
      
      // Execution metadata
      execution_metadata: billing.execution_metadata,
      task_type: billing.execution_metadata.task_type,
      
      // Status
      status: 'completed',
      ledger_table: 'gx_billing_ledger',
      
      // Revenue beneficiary
      beneficiary: MONETIZATION_CONFIG.revenue_beneficiary
    };
    
    const { error } = await supabase
      .from('gx_billing_ledger')
      .insert(ledgerEntry);
    
    if (error) {
      throw new Error(`Ledger write failed: ${error.message}`);
    }
    
    console.log(`[GX_MONETIZATION_ENGINE] 💰 Ledger write: ${billingId} | API Key: ${apiKeyId} | $${billing.total_usd.toFixed(4)}`);
    
    return ledgerEntry;
  }

  async updateUserBalance(userId, amount) {
    // Deduct from user balance
    const { error } = await supabase
      .rpc('deduct_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_operation: 'EXECUTION_FEE',
        p_request_id: `billing_${Date.now()}`
      });
    
    if (error) {
      console.error('[GX_MONETIZATION_ENGINE] Balance update failed:', error);
      // Don't throw - we logged to ledger, balance can be reconciled later
    } else {
      this.metrics.balance_updates++;
    }
  }

  async recordAgentConsumption(event, billing) {
    const taskType = event.result?.result?.task_type || 'generic';
    const executionId = event.execution_id;
    
    try {
      await agentMetering.recordConsumption(
        taskType,
        'execution',
        {
          execution_id: executionId,
          billing_id: `bill_${Date.now()}`,
          cost_usd: billing.total_usd
        },
        event.user_id || 'system'
      );
    } catch (err) {
      console.error('[GX_MONETIZATION_ENGINE] Agent metering failed:', err);
    }
  }

  async emitAuditLog(billingId, event, billing) {
    const auditEntry = {
      event_type: 'BILLING_COMPLETED',
      billing_id: billingId,
      execution_id: event.execution_id,
      timestamp: new Date().toISOString(),
      amount_usd: billing.total_usd,
      status: 'success',
      metadata: {
        breakdown: billing.breakdown,
        execution: billing.execution_metadata
      }
    };
    
    // Send to Kafka audit topic
    await this.producer.send({
      topic: TOPICS.audit_trace,
      messages: [{
        key: billingId,
        value: JSON.stringify(auditEntry)
      }]
    });
    
    // Also log to Supabase
    await supabase
      .from('gx_audit_log')
      .insert(auditEntry);
  }

  async publishRevenueEvent(event, billing, billingResult) {
    if (!MONETIZATION_CONFIG.enable_revenue_events) return;
    
    const revenueEvent = {
      event_type: 'REVENUE_EVENT',
      timestamp: new Date().toISOString(),
      billing_id: billingResult.billing_id,
      execution_id: event.execution_id,
      decision_id: event.decision_id,
      revenue: {
        amount_usd: billing.total_usd,
        currency: 'USD',
        source: 'execution_fee'
      },
      breakdown: billing.breakdown,
      beneficiary: MONETIZATION_CONFIG.revenue_beneficiary,
      metadata: {
        success: billingResult.success,
        task_type: billing.execution_metadata.task_type,
        execution_success: event.success
      }
    };
    
    await this.producer.send({
      topic: TOPICS.output_legacy,
      messages: [{
        key: billingResult.billing_id,
        value: JSON.stringify(revenueEvent),
        headers: {
          'content-type': 'application/json',
          'x-revenue-amount': String(billing.total_usd)
        }
      }]
    });
  }

  async publishBlockedEvent(event, reason) {
    const blockedEvent = {
      event_type: 'EXECUTION_BLOCKED',
      timestamp: new Date().toISOString(),
      execution_id: event.execution_id || 'unknown',
      decision_id: event.decision_id,
      block_reason: reason,
      fail_closed: MONETIZATION_CONFIG.fail_closed,
      metadata: {
        original_event: event,
        billing_status: 'BLOCKED',
        retry_allowed: false
      }
    };
    
    // Publish to audit trace
    await this.producer.send({
      topic: TOPICS.audit_trace,
      messages: [{
        key: `blocked_${Date.now()}`,
        value: JSON.stringify(blockedEvent),
        headers: {
          'x-blocked': 'true',
          'x-reason': reason
        }
      }]
    });
    
    // Log to Supabase
    await supabase
      .from('gx_blocked_executions')
      .insert(blockedEvent);
    
    console.log(`[GX_MONETIZATION_ENGINE] 🚫 Published BLOCKED event: ${event.execution_id} (${reason})`);
  }

  async handleBillingError(message, error) {
    try {
      const rawEvent = JSON.parse(message.value.toString());
      
      await supabase
        .from('gx_error_log')
        .insert({
          service: 'gx_monetization_engine',
          timestamp: new Date().toISOString(),
          error_message: error.message,
          stack: error.stack,
          event_data: rawEvent,
          severity: 'CRITICAL' // Billing errors are critical
        });
      
      // Send to audit topic for tracking
      await this.producer.send({
        topic: TOPICS.audit_trace,
        messages: [{
          key: `error_${Date.now()}`,
          value: JSON.stringify({
            event_type: 'BILLING_ERROR',
            timestamp: new Date().toISOString(),
            error: error.message,
            original_event: rawEvent
          })
        }]
      });
      
    } catch (err) {
      console.error('[GX_MONETIZATION_ENGINE] Failed to log billing error:', err);
    }
  }

  async logBillingFailure(billingId, event, billing, error) {
    await supabase
      .from('gx_billing_ledger')
      .insert({
        billing_id: billingId,
        execution_id: event.execution_id,
        timestamp: new Date().toISOString(),
        amount_usd: billing.total_usd,
        status: 'failed',
        error: error.message,
        retry_required: true
      });
  }

  updateMetrics(billing, latencyMs, success) {
    this.metrics.executions_billed++;
    
    if (success) {
      this.metrics.revenue_usd += billing.total_usd;
    }
    
    // Update rolling average
    const total = this.metrics.executions_billed;
    const current = this.metrics.avg_billing_latency_ms;
    this.metrics.avg_billing_latency_ms = ((current * (total - 1)) + latencyMs) / total;
  }

  getMetrics() {
    return {
      ...this.metrics,
      revenue_usd: parseFloat(this.metrics.revenue_usd.toFixed(4)),
      timestamp: new Date().toISOString()
    };
  }

  // External API for consumption tracking
  async getRevenueReport(startTime, endTime) {
    const { data, error } = await supabase
      .from('gx_billing_ledger')
      .select('*')
      .gte('timestamp', startTime)
      .lte('timestamp', endTime)
      .eq('status', 'completed');
    
    if (error) throw error;
    
    const totalRevenue = data?.reduce((sum, entry) => sum + (entry.amount_usd || 0), 0) || 0;
    
    return {
      period: { start: startTime, end: endTime },
      total_revenue_usd: totalRevenue,
      transaction_count: data?.length || 0,
      average_transaction_usd: data?.length ? totalRevenue / data.length : 0
    };
  }

  async getUserBalance(userId) {
    const { data, error } = await supabase
      .from('gxeon_users')
      .select('balance_credits')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data?.balance_credits || 0;
  }

  async shutdown() {
    console.log('[GX_MONETIZATION_ENGINE] Shutting down...');
    console.log('[GX_MONETIZATION_ENGINE] Final metrics:', this.getMetrics());
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('[GX_MONETIZATION_ENGINE] Disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AND RUN
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { GXMonetizationEngine, MONETIZATION_CONFIG, PRICING };

// Run if called directly
if (require.main === module) {
  const engine = new GXMonetizationEngine();
  
  engine.initialize().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[GX_MONETIZATION_ENGINE] SIGINT received');
    await engine.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[GX_MONETIZATION_ENGINE] SIGTERM received');
    await engine.shutdown();
    process.exit(0);
  });
}
