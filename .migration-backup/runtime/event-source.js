/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON EVENT SOURCE v1.0 - REPLAY-SAFE FINANCIAL OPERATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Core event sourcing for GXEON OS:
 *
 * Guarantees:
 * - All state mutations are event-sourced
 * - Events are immutable and append-only
 * - System can be replayed from event stream
 * - Financial operations are audit-traceable
 * - Exactly-once event processing with deduplication
 *
 * Event Domains:
 * - BILLING_* : All billing and payment events
 * - WORKFLOW_* : Workflow state transitions
 * - CREDIT_* : Credit operations
 * - PAYMENT_* : Payment events
 * - SIGNAL_* : Signal marketplace events
 * - RECOVERY_* : System recovery events
 */

import supabase from '../server/services/supabase.js';
import idempotencyRegistry from './idempotency-registry.js';

export class EventSource {
  constructor() {
    this.eventHandlers = new Map();
    this.subscribers = [];
  }

  /**
   * Record immutable event
   *
   * Guarantees:
   * - Events are append-only
   * - Events cannot be deleted or modified
   * - Each event has unique correlation trace
   */
  async recordEvent(domain, eventType, data, options = {}) {
    const {
      workflowId,
      correlationId,
      traceId,
      idempotencyKey,
      causationId,
      timestamp = new Date().toISOString()
    } = options;

    // Generate IDs if not provided
    const finalCorrelationId = correlationId || `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalTraceId = traceId || `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalIdempotencyKey = idempotencyKey || `${domain}_${eventType}_${finalCorrelationId}`;

    const event = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      domain,
      event_type: eventType,
      data,
      correlation_id: finalCorrelationId,
      trace_id: finalTraceId,
      causation_id: causationId || null,
      workflow_id: workflowId || null,
      idempotency_key: finalIdempotencyKey,
      timestamp,
      version: 1,
      status: 'RECORDED'
    };

    // Use idempotency registry to prevent duplicate events
    try {
      const result = await idempotencyRegistry.executeOnce(
        finalIdempotencyKey,
        async () => {
          // Insert event (append-only)
          const { error, data: insertedData } = await supabase
            .from('gx_event_source')
            .insert(event)
            .select();

          if (error) {
            throw new Error(`Event recording failed: ${error.message}`);
          }

          const recorded = insertedData?.[0];

          console.log(
            `[EventSource] Event recorded: ${domain}.${eventType} | ` +
            `ID: ${recorded.event_id} | Correlation: ${finalCorrelationId}`
          );

          // Emit to subscribers
          await this.notifySubscribers(recorded);

          return recorded;
        }
      );

      return result;
    } catch (error) {
      console.error(`[EventSource] Failed to record event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record BILLING_CHARGE event
   */
  async recordBillingCharge(billingData, options = {}) {
    return this.recordEvent(
      'BILLING',
      'BILLING_CHARGE',
      {
        execution_id: billingData.execution_id,
        user_id: billingData.user_id,
        api_key_id: billingData.api_key_id,
        amount_usd: billingData.amount_usd,
        breakdown: billingData.breakdown,
        task_type: billingData.task_type,
        latency_ms: billingData.latency_ms,
        success: billingData.success
      },
      {
        ...options,
        idempotencyKey: `billing_${billingData.execution_id}:${options.idempotencyKey || ''}`
      }
    );
  }

  /**
   * Record PAYMENT_PROCESSED event
   */
  async recordPaymentProcessed(paymentData, options = {}) {
    return this.recordEvent(
      'PAYMENT',
      'PAYMENT_PROCESSED',
      {
        payment_id: paymentData.payment_id,
        user_id: paymentData.user_id,
        amount_usd: paymentData.amount_usd,
        gateway: paymentData.gateway, // stripe, mercadopago, pix
        status: paymentData.status,
        reference_id: paymentData.reference_id
      },
      {
        ...options,
        idempotencyKey: `payment_${paymentData.payment_id}`
      }
    );
  }

  /**
   * Record CREDIT_DEDUCTED event
   */
  async recordCreditDeducted(creditData, options = {}) {
    return this.recordEvent(
      'CREDIT',
      'CREDIT_DEDUCTED',
      {
        user_id: creditData.user_id,
        amount: creditData.amount,
        reason: creditData.reason,
        reference_id: creditData.reference_id
      },
      {
        ...options,
        idempotencyKey: `credit_deduct_${creditData.user_id}:${creditData.reference_id}`
      }
    );
  }

  /**
   * Record WORKFLOW_STATE_CHANGED event
   */
  async recordWorkflowStateChange(workflowId, fromState, toState, options = {}) {
    return this.recordEvent(
      'WORKFLOW',
      'WORKFLOW_STATE_CHANGED',
      {
        workflow_id: workflowId,
        from_state: fromState,
        to_state: toState
      },
      {
        ...options,
        workflowId,
        idempotencyKey: `workflow_${workflowId}:${toState}:${Date.now()}`
      }
    );
  }

  /**
   * Record RECOVERY_INITIATED event
   */
  async recordRecoveryInitiated(recoveryData, options = {}) {
    return this.recordEvent(
      'RECOVERY',
      'RECOVERY_INITIATED',
      {
        resource_type: recoveryData.resource_type,
        resource_id: recoveryData.resource_id,
        failure_reason: recoveryData.failure_reason,
        recovery_strategy: recoveryData.recovery_strategy
      },
      options
    );
  }

  /**
   * Query events by correlation ID (trace a transaction)
   */
  async getEventsByCorrelation(correlationId) {
    const { data, error } = await supabase
      .from('gx_event_source')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Correlation query failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Query events by workflow ID
   */
  async getEventsByWorkflow(workflowId) {
    const { data, error } = await supabase
      .from('gx_event_source')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Workflow events query failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Query events by domain and type
   */
  async getEventsByType(domain, eventType, options = {}) {
    const { startTime, endTime, limit = 1000 } = options;

    let query = supabase
      .from('gx_event_source')
      .select('*')
      .eq('domain', domain)
      .eq('event_type', eventType);

    if (startTime) {
      query = query.gte('timestamp', startTime);
    }

    if (endTime) {
      query = query.lte('timestamp', endTime);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Event query failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Replay events for a specific resource
   * Guarantees: Deterministic replay from event stream
   */
  async replayEvents(resourceId, resourceType, handler) {
    const events = resourceType === 'workflow'
      ? await this.getEventsByWorkflow(resourceId)
      : await this.getEventsByCorrelation(resourceId);

    let state = {};
    const eventLog = [];

    for (const event of events) {
      try {
        const newState = await handler(state, event);
        state = newState || state;
        eventLog.push({ event_id: event.event_id, status: 'REPLAYED' });
      } catch (error) {
        console.error(`Replay error for event ${event.event_id}:`, error);
        eventLog.push({ event_id: event.event_id, status: 'FAILED', error: error.message });
      }
    }

    console.log(
      `[EventSource] Replayed ${eventLog.length} events for ` +
      `${resourceType} ${resourceId}`
    );

    return { state, eventLog };
  }

  /**
   * Subscribe to events by domain/type
   */
  subscribe(domain, eventType, handler) {
    const subscription = { domain, eventType, handler };
    this.subscribers.push(subscription);

    console.log(`[EventSource] Subscription added: ${domain}.${eventType}`);

    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscription);
      console.log(`[EventSource] Subscription removed: ${domain}.${eventType}`);
    };
  }

  /**
   * Notify all subscribers of new event
   */
  async notifySubscribers(event) {
    const matching = this.subscribers.filter(
      sub => sub.domain === event.domain && sub.eventType === event.event_type
    );

    for (const subscription of matching) {
      try {
        await subscription.handler(event);
      } catch (error) {
        console.error(`Subscriber handler failed:`, error);
      }
    }
  }

  /**
   * Get audit trail for financial transaction
   * (complete trace from charge to completion)
   */
  async getAuditTrail(executionId) {
    const { data, error } = await supabase
      .from('gx_event_source')
      .select('*')
      .or(`data->>'execution_id'.eq.${executionId}`)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Audit trail query failed: ${error.message}`);
    }

    return {
      execution_id: executionId,
      events: data || [],
      total_events: data?.length || 0,
      timeline: data?.map(e => ({
        timestamp: e.timestamp,
        domain: e.domain,
        event_type: e.event_type,
        status: e.status
      })) || []
    };
  }

  /**
   * Get system event statistics
   */
  async getStats(hoursSince = 24) {
    const since = new Date(Date.now() - hoursSince * 3600000).toISOString();

    const { data, error } = await supabase
      .from('gx_event_source')
      .select('domain, event_type, count', { count: 'exact' })
      .gte('timestamp', since);

    if (error) {
      throw new Error(`Stats query failed: ${error.message}`);
    }

    const stats = {};
    data?.forEach(row => {
      if (!stats[row.domain]) {
        stats[row.domain] = {};
      }
      stats[row.domain][row.event_type] = row.count;
    });

    return {
      period_hours: hoursSince,
      since: since,
      events_by_domain: stats,
      timestamp: new Date().toISOString()
    };
  }
}

export default new EventSource();
