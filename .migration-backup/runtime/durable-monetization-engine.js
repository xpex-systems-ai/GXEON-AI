/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON DURABLE MONETIZATION ENGINE v2.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Durable billing with:
 * - Idempotent charge operations
 * - Event sourcing for all billing events
 * - Workflow-based billing workflows
 * - Recovery guarantees
 * - Exactly-once payment semantics
 *
 * Replaces: core/gx_monetization_engine.js
 * Guarantees:
 * - No double charges on Kafka replay
 * - No phantom credits
 * - No lost charges
 * - All operations audit-traceable
 */

import { Kafka } from 'kafkajs';
import supabase from '../server/services/supabase.js';
import { agentMetering } from '../server/services/agentMetering.js';
import idempotencyRegistry from './idempotency-registry.js';
import eventSource from './event-source.js';
import workflowEngine, { WORKFLOW_STATES } from './workflow-engine.js';
import { generateWorkflowId, generateBillingId, WorkflowDefinition, ActivityDefinition } from './workflow-utils.js';

const MONETIZATION_CONFIG = {
  enable_revenue_events: true,
  enable_balance_updates: true,
  enable_audit_logging: true,
  billing_mode: 'STRICT',
  fail_closed: true,
  revenue_beneficiary: '0x3955d559055DadB7067054cB6E6f974710345224'
};

const PRICING = {
  execution_base: 0.005,
  decision_processing: 0.001,
  latency_per_ms: 0.00001,
  success_multiplier: 1.0,
  failure_multiplier: 0.5
};

const KAFKA_CONFIG = {
  clientId: 'gx-durable-monetization-engine',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
};

const TOPICS = {
  billing_charge: 'billing.charge',
  audit_trace: 'audit.trace',
  input_legacy: 'gx.execution.results',
  output_legacy: 'gx.billing.events'
};

export class DurableMonetizationEngine {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG);
    this.consumer = this.kafka.consumer({
      groupId: 'gx-durable-monetization-engine-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.producer = this.kafka.producer();
    this.metrics = {
      executions_billed: 0,
      revenue_usd: 0,
      balance_updates: 0,
      billing_failures: 0,
      duplicates_prevented: 0,
      avg_billing_latency_ms: 0
    };
  }

  async initialize() {
    console.log('[DurableMonetizationEngine] Initializing durable billing system...');

    await this.consumer.connect();
    await this.producer.connect();

    // Subscribe to billing topics
    await this.consumer.subscribe({ topics: [TOPICS.billing_charge, TOPICS.input_legacy] });

    console.log('[DurableMonetizationEngine] Connected to Kafka');

    // Start consuming with durable processing
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const billingStart = Date.now();

        try {
          const event = JSON.parse(message.value.toString());

          if (event.event_type !== 'EXECUTION_RESULT') {
            console.log(`[DurableMonetizationEngine] Skipping: ${event.event_type}`);
            return;
          }

          // Create idempotency key from execution ID
          const idempotencyKey = `billing_${event.execution_id}`;

          // Execute billing exactly once
          await idempotencyRegistry.executeOnce(idempotencyKey, async () => {
            await this.processBillingEvent(event);
          });

          // Update metrics
          this.updateMetrics(null, Date.now() - billingStart, true);

        } catch (error) {
          console.error('[DurableMonetizationEngine] Billing error:', error);
          await this.handleBillingError(message, error);
        }
      }
    });

    console.log('[DurableMonetizationEngine] Ready');
  }

  /**
   * Process billing event with full durability
   * Guarantees: Idempotent, recoverable, audit-traceable
   */
  async processBillingEvent(event) {
    console.log(`[DurableMonetizationEngine] Processing billing for execution: ${event.execution_id}`);

    // Validate required fields
    if (!event.execution_id) {
      throw new Error('BLOCKED: Missing execution_id');
    }

    const userId = event.result?.result?.user_id ||
                   event.decision_metadata?.user_id ||
                   event.user?.id ||
                   'system';

    const apiKeyId = event.user?.api_key_id ||
                     event.metadata?.api_key_id ||
                     userId;

    const isExternal = event.metadata?.is_external ||
                       event.metadata?.traffic_type === 'EXTERNAL_AGENT' ||
                       event.billing?.mode === 'REAL';

    // Skip test-only billing
    if (!isExternal && event.metadata?.billing_mode === 'TEST_ONLY') {
      console.log(`[DurableMonetizationEngine] TEST_ONLY request - skipping billing`);
      return;
    }

    // Create billing workflow
    const billingWorkflowId = await this.createBillingWorkflow(
      event,
      userId,
      apiKeyId,
      isExternal
    );

    // Execute workflow (automatically handles recovery)
    const workflow = await workflowEngine.executeWorkflow(billingWorkflowId);

    if (workflow.state === WORKFLOW_STATES.COMPLETED) {
      console.log(`[DurableMonetizationEngine] ✅ Billing completed: ${event.execution_id}`);
    } else if (workflow.state === WORKFLOW_STATES.FAILED) {
      throw new Error(`Billing workflow failed: ${workflow.error}`);
    }
  }

  /**
   * Create billing workflow (multi-step billing process)
   */
  async createBillingWorkflow(event, userId, apiKeyId, isExternal) {
    const billingId = generateBillingId();
    const billing = this.calculateBilling(event);

    // Define billing workflow
    const definition = new WorkflowDefinition('billing_workflow', 1)
      .addActivity(
        new ActivityDefinition('validate_billing', 'sync')
          .withHandler(() => this.validateBilling(event, billing))
          .build()
      )
      .addActivity(
        new ActivityDefinition('write_to_ledger', 'async')
          .withHandler(() => this.writeToDurableLedger(billingId, event, billing, userId, apiKeyId))
          .withCompensation(() => this.compensateLedgerWrite(billingId))
          .build()
      )
      .addActivity(
        new ActivityDefinition('update_user_balance', 'async')
          .withHandler(() => this.updateUserBalanceDurable(userId, billing.total_usd))
          .withCompensation(() => this.compensateBalanceUpdate(userId, billing.total_usd))
          .build()
      )
      .addActivity(
        new ActivityDefinition('record_agent_consumption', 'async')
          .withHandler(() => this.recordAgentConsumptionDurable(event, billing))
          .build()
      )
      .addActivity(
        new ActivityDefinition('emit_audit_log', 'async')
          .withHandler(() => this.emitAuditLogDurable(billingId, event, billing))
          .build()
      )
      .withMaxRetries(3)
      .withTimeout(30000)
      .build();

    // Create workflow
    const workflow = await workflowEngine.createWorkflow(definition, {
      execution_id: event.execution_id,
      idempotency_key: `billing_${event.execution_id}`,
      user_id: userId,
      api_key_id: apiKeyId,
      billing_id: billingId
    });

    return workflow.workflow_id;
  }

  /**
   * Calculate billing amount
   */
  calculateBilling(event) {
    const execution = event.result;

    let total = PRICING.execution_base;

    if (execution?.latency_ms) {
      total += execution.latency_ms * PRICING.latency_per_ms;
    }

    total += PRICING.decision_processing;

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

  /**
   * Validate billing data before processing
   */
  async validateBilling(event, billing) {
    if (!event.execution_id) throw new Error('Missing execution_id');
    if (!billing.total_usd || billing.total_usd <= 0) throw new Error('Invalid amount');
    return { valid: true };
  }

  /**
   * Write to durable billing ledger with event sourcing
   */
  async writeToDurableLedger(billingId, event, billing, userId, apiKeyId) {
    const ledgerEntry = {
      billing_id: billingId,
      execution_id: event.execution_id,
      request_id: event.request_id,
      decision_id: event.decision_id,
      api_key_id: apiKeyId,
      cost: billing.total_usd,
      cost_usd: billing.total_usd,
      latency_ms: billing.execution_metadata.latency_ms || 0,
      success_flag: event.success === true,
      amount_usd: billing.total_usd,
      breakdown: billing.breakdown,
      timestamp: new Date().toISOString(),
      user_id: userId,
      traffic_type: event.metadata?.traffic_type || 'UNKNOWN',
      is_external: event.metadata?.is_external || false,
      status: 'completed',
      beneficiary: MONETIZATION_CONFIG.revenue_beneficiary
    };

    // Write to ledger (durable)
    const { error } = await supabase
      .from('gx_billing_ledger')
      .insert(ledgerEntry);

    if (error) {
      throw new Error(`Ledger write failed: ${error.message}`);
    }

    // Record event
    await eventSource.recordBillingCharge({
      execution_id: event.execution_id,
      user_id: userId,
      api_key_id: apiKeyId,
      amount_usd: billing.total_usd,
      breakdown: billing.breakdown,
      task_type: billing.execution_metadata.task_type,
      latency_ms: billing.execution_metadata.latency_ms,
      success: event.success
    }, {
      idempotencyKey: `billing_${event.execution_id}`
    });

    console.log(`[DurableMonetizationEngine] 💰 Ledger write: ${billingId} | $${billing.total_usd.toFixed(4)}`);

    return ledgerEntry;
  }

  /**
   * Compensation for ledger write
   */
  async compensateLedgerWrite(billingId) {
    console.log(`[DurableMonetizationEngine] Compensating ledger write: ${billingId}`);
    // Mark as COMPENSATED in ledger
    await supabase
      .from('gx_billing_ledger')
      .update({ status: 'COMPENSATED' })
      .eq('billing_id', billingId);
  }

  /**
   * Update user balance with durability
   */
  async updateUserBalanceDurable(userId, amount) {
    if (userId === 'system') return;

    const { error } = await supabase
      .rpc('deduct_credits_atomic_durable', {
        p_user_id: userId,
        p_amount: amount,
        p_operation: 'EXECUTION_FEE',
        p_request_id: `billing_${Date.now()}`
      });

    if (error) {
      console.error('[DurableMonetizationEngine] Balance update failed:', error);
      throw error;
    }

    // Record event
    await eventSource.recordCreditDeducted({
      user_id: userId,
      amount,
      reason: 'EXECUTION_FEE',
      reference_id: `billing_${Date.now()}`
    });
  }

  /**
   * Compensation for balance update
   */
  async compensateBalanceUpdate(userId, amount) {
    if (userId === 'system') return;

    console.log(`[DurableMonetizationEngine] Compensating balance update for ${userId}: +${amount}`);

    // Reverse the deduction
    const { error } = await supabase
      .rpc('add_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: 'COMPENSATION_FOR_FAILED_BILLING'
      });

    if (error) {
      console.error('[DurableMonetizationEngine] Compensation failed:', error);
    }
  }

  /**
   * Record agent consumption
   */
  async recordAgentConsumptionDurable(event, billing) {
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
      console.error('[DurableMonetizationEngine] Agent metering failed:', err);
      throw err;
    }
  }

  /**
   * Emit audit log
   */
  async emitAuditLogDurable(billingId, event, billing) {
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

    // Send to Kafka
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

    // Record event
    await eventSource.recordEvent('BILLING', 'BILLING_AUDIT_LOGGED', auditEntry);
  }

  /**
   * Handle billing errors with durability
   */
  async handleBillingError(message, error) {
    try {
      const rawEvent = JSON.parse(message.value.toString());

      await supabase
        .from('gx_error_log')
        .insert({
          service: 'gx_durable_monetization_engine',
          timestamp: new Date().toISOString(),
          error_message: error.message,
          stack: error.stack,
          event_data: rawEvent,
          severity: 'CRITICAL'
        });

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
      console.error('[DurableMonetizationEngine] Failed to log error:', err);
    }
  }

  updateMetrics(billing, latencyMs, success) {
    this.metrics.executions_billed++;

    if (success && billing) {
      this.metrics.revenue_usd += billing.total_usd;
    }

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

  async shutdown() {
    console.log('[DurableMonetizationEngine] Shutting down...');
    console.log('[DurableMonetizationEngine] Final metrics:', this.getMetrics());
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('[DurableMonetizationEngine] Disconnected');
  }
}

export default new DurableMonetizationEngine();
