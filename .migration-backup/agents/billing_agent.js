#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BILLING AGENT — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Type: billing
 * 
 * Responsibilities:
 * - Monitor all billing events from swarm agents
 * - Aggregate billing data per agent
 * - Verify ledger writes to gx_billing_ledger
 * - Emit Kafka events to gx_external_usage_stream
 * - Calculate swarm-wide costs and revenue
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry, REGISTRY_CONFIG } = require('../core/agent_registry');
const { Kafka } = require('kafkajs');
const supabase = require('../server/services/supabase');

class BillingAgent {
  constructor() {
    this.agent_id = 'billing_agent_001';
    this.name = 'Billing Agent';
    this.type = 'billing';
    this.api_key = process.env.BILLING_AGENT_API_KEY || null;
    
    this.metrics = {
      billing_events_received: 0,
      ledger_verifications: 0,
      ledger_verification_failures: 0,
      kafka_events_emitted: 0,
      total_billed_usd: 0,
      api_calls_made: 0
    };
    
    this.kafka = new Kafka({
      clientId: this.agent_id,
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'billing-agent' });
    
    this.billingBuffer = []; // Buffer for batch processing
    this.isRunning = false;
    
    // Required fields for revenue trace
    this.requiredFields = ['api_key_id', 'cost', 'latency', 'success_flag', 'execution_id'];
  }

  async initialize() {
    console.log('[BILLING_AGENT] Initializing...');
    
    // Register with agent registry
    const config = registry.registerAgent({
      agent_id: this.agent_id,
      name: this.name,
      type: this.type,
      api_key: this.api_key,
      permissions: ['read', 'write'],
      metadata: {
        capabilities: ['billing_monitoring', 'ledger_verification', 'kafka_emitting'],
        ledger_table: 'gx_billing_ledger',
        external_usage_topic: 'gx_external_usage_stream'
      }
    });
    
    this.api_key = config.api_key;
    
    // Connect to Kafka
    await this.producer.connect();
    await this.consumer.connect();
    
    // Subscribe to billing events
    await this.consumer.subscribe({ topics: ['swarm.billing', 'billing.charge'] });
    
    console.log(`[BILLING_AGENT] Registered with API Key: ${this.api_key.substring(0, 16)}...`);
    console.log('[BILLING_AGENT] Kafka connected');
  }

  async start() {
    this.isRunning = true;
    console.log('[BILLING_AGENT] Starting billing monitoring...');
    
    // Start consuming billing events
    this.startConsumer();
    
    // Start periodic ledger verification
    setInterval(() => {
      this.verifyLedgerWrites();
    }, 30000);
    
    // Start periodic external usage stream emission
    setInterval(() => {
      this.emitExternalUsageBatch();
    }, 15000);
  }

  async startConsumer() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await this.handleBillingEvent(event);
        } catch (error) {
          console.error('[BILLING_AGENT] Event parse error:', error.message);
        }
      }
    });
  }

  async handleBillingEvent(event) {
    this.metrics.billing_events_received++;
    
    console.log(`[BILLING_AGENT] Received billing event: ${event.event_type}`);
    
    // Validate required fields for revenue trace
    const hasRequiredFields = this.requiredFields.every(field => 
      event[field] !== undefined || 
      (event.billing_context && event.billing_context[field] !== undefined)
    );
    
    if (!hasRequiredFields) {
      console.warn(`[BILLING_AGENT] ⚠️  Billing event missing required fields`);
    }
    
    // Buffer for batch processing
    this.billingBuffer.push({
      ...event,
      received_at: new Date().toISOString()
    });
    
    // Update metrics
    if (event.cost_usd) {
      this.metrics.total_billed_usd += event.cost_usd;
    }
  }

  async verifyLedgerWrites() {
    console.log('[BILLING_AGENT] Verifying ledger writes...');
    
    try {
      // Query recent entries from gx_billing_ledger
      const { data, error } = await supabase
        .from('gx_billing_ledger')
        .select('execution_id, api_key_id, cost, latency, success_flag')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('[BILLING_AGENT] Ledger verification error:', error.message);
        this.metrics.ledger_verification_failures++;
        return;
      }
      
      // Verify required fields are present
      const validEntries = data.filter(entry => {
        return entry.execution_id && 
               entry.api_key_id && 
               entry.cost !== undefined &&
               entry.latency !== undefined &&
               entry.success_flag !== undefined;
      });
      
      this.metrics.ledger_verifications++;
      
      console.log(`[BILLING_AGENT] ✅ Ledger verified: ${validEntries.length}/${data.length} entries have all required fields`);
      
    } catch (error) {
      console.error('[BILLING_AGENT] Ledger verification failed:', error.message);
      this.metrics.ledger_verification_failures++;
    }
  }

  async emitExternalUsageBatch() {
    if (this.billingBuffer.length === 0) return;
    
    const batch = this.billingBuffer.splice(0, this.billingBuffer.length);
    
    // Aggregate by api_key_id
    const aggregated = this.aggregateByApiKey(batch);
    
    for (const [apiKeyId, data] of Object.entries(aggregated)) {
      const event = {
        event_type: 'SWARM_EXTERNAL_USAGE',
        timestamp: new Date().toISOString(),
        api_key_id: apiKeyId,
        agent_count: data.agents.size,
        total_requests: data.count,
        total_cost_usd: data.totalCost,
        avg_latency_ms: Math.round(data.totalLatency / data.count),
        success_rate: (data.successCount / data.count * 100).toFixed(1),
        cycle_complete: true,
        swarm_version: '1.0.0'
      };
      
      try {
        await this.producer.send({
          topic: 'gx_external_usage_stream',
          messages: [{
            key: apiKeyId,
            value: JSON.stringify(event),
            headers: {
              'x-swarm-event': 'true',
              'x-cycle-complete': 'true'
            }
          }]
        });
        
        this.metrics.kafka_events_emitted++;
        console.log(`[BILLING_AGENT] 📤 External usage emitted for ${apiKeyId}: ${data.count} requests, $${data.totalCost.toFixed(4)}`);
        
      } catch (error) {
        console.error('[BILLING_AGENT] Kafka emit error:', error.message);
      }
    }
  }

  aggregateByApiKey(batch) {
    const aggregated = {};
    
    for (const event of batch) {
      const apiKeyId = event.api_key_id || 
                       event.billing_context?.api_key_id || 
                       'unknown';
      
      if (!aggregated[apiKeyId]) {
        aggregated[apiKeyId] = {
          count: 0,
          totalCost: 0,
          totalLatency: 0,
          successCount: 0,
          agents: new Set()
        };
      }
      
      const agg = aggregated[apiKeyId];
      agg.count++;
      agg.totalCost += event.cost_usd || 0;
      agg.totalLatency += event.latency_ms || 0;
      agg.successCount += event.success ? 1 : 0;
      agg.agents.add(event.agent_id);
    }
    
    return aggregated;
  }

  async verifySpecificBilling(executionId) {
    try {
      const { data, error } = await supabase
        .from('gx_billing_ledger')
        .select('*')
        .eq('execution_id', executionId)
        .single();
      
      if (error || !data) {
        return { found: false, error: error?.message };
      }
      
      // Verify all required fields
      const missingFields = this.requiredFields.filter(field => data[field] === undefined);
      
      return {
        found: true,
        complete: missingFields.length === 0,
        missing_fields: missingFields,
        data: data
      };
      
    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  getMetrics() {
    return {
      agent_id: this.agent_id,
      type: this.type,
      ...this.metrics,
      buffer_size: this.billingBuffer.length,
      required_fields: this.requiredFields,
      timestamp: new Date().toISOString()
    };
  }

  async stop() {
    this.isRunning = false;
    
    // Emit any remaining buffered events
    await this.emitExternalUsageBatch();
    
    await this.producer.disconnect();
    await this.consumer.disconnect();
    console.log('[BILLING_AGENT] Stopped');
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new BillingAgent();
  
  async function main() {
    await registry.initialize();
    await agent.initialize();
    await agent.start();
  }
  
  main().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[BILLING_AGENT] SIGINT received');
    await agent.stop();
    await registry.shutdown();
    process.exit(0);
  });
}

module.exports = { BillingAgent };
