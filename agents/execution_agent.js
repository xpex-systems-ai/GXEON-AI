#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXECUTION AGENT — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Type: execution
 * 
 * Responsibilities:
 * - Receive tasks from scraper_agent
 * - Execute operations (on-chain, off-chain)
 * - Call validator_agent for verification
 * - Generate billing event with execution_id, latency, cost, success_flag
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry, REGISTRY_CONFIG } = require('../core/agent_registry');
const { Kafka } = require('kafkajs');

class ExecutionAgent {
  constructor() {
    this.agent_id = 'execution_agent_001';
    this.name = 'Execution Agent';
    this.type = 'execution';
    this.api_key = process.env.EXECUTION_AGENT_API_KEY || null;
    
    this.metrics = {
      tasks_received: 0,
      executions_completed: 0,
      executions_failed: 0,
      api_calls_made: 0,
      total_cost_usd: 0,
      next_agent_calls: 0,
      total_latency_ms: 0
    };
    
    this.kafka = new Kafka({
      clientId: this.agent_id,
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    this.producer = this.kafka.producer();
    
    this.isRunning = false;
  }

  async initialize() {
    console.log('[EXECUTION_AGENT] Initializing...');
    
    // Register with agent registry
    const config = registry.registerAgent({
      agent_id: this.agent_id,
      name: this.name,
      type: this.type,
      api_key: this.api_key,
      permissions: ['read', 'execute', 'write'],
      metadata: {
        capabilities: ['task_execution', 'onchain_ops', 'async_processing'],
        previous_agent: 'scraper_agent_001',
        next_agent: 'validator_agent_001'
      }
    });
    
    this.api_key = config.api_key;
    
    // Connect to Kafka
    await this.producer.connect();
    
    console.log(`[EXECUTION_AGENT] Registered with API Key: ${this.api_key.substring(0, 16)}...`);
    console.log('[EXECUTION_AGENT] Kafka producer connected');
  }

  async start() {
    this.isRunning = true;
    console.log('[EXECUTION_AGENT] Ready to receive tasks');
    
    // In real implementation, this would consume from Kafka
    // For now, simulate receiving tasks via polling
    setInterval(() => {
      this.checkForTasks();
    }, 5000);
  }

  async checkForTasks() {
    // In production, this consumes from Kafka topic
    // For demo, tasks arrive via direct calls from scraper agent
  }

  async executeTask(taskData) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`[EXECUTION_AGENT] Executing task: ${executionId}`);
    
    this.metrics.tasks_received++;
    
    try {
      // Perform execution based on task type
      let result;
      
      switch (taskData.task_type) {
        case 'process_scraped_data':
          result = await this.processScrapedData(taskData.payload);
          break;
        case 'execute_onchain':
          result = await this.executeOnChain(taskData.payload);
          break;
        case 'api_call':
          result = await this.executeApiCall(taskData.payload);
          break;
        default:
          result = { success: true, message: 'Generic execution' };
      }
      
      const latency = Date.now() - startTime;
      this.metrics.executions_completed++;
      this.metrics.total_latency_ms += latency;
      
      console.log(`[EXECUTION_AGENT] ✅ Execution complete: ${executionId} (${latency}ms)`);
      
      // Call validator agent
      await this.callValidatorAgent({
        execution_id: executionId,
        source_task: taskData,
        result: result,
        latency_ms: latency
      });
      
      // Return billing data
      return {
        execution_id: executionId,
        latency_ms: latency,
        cost_usd: 0.006,
        success: true,
        result: result
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.executions_failed++;
      
      console.error(`[EXECUTION_AGENT] ❌ Execution failed: ${executionId} - ${error.message}`);
      
      return {
        execution_id: executionId,
        latency_ms: latency,
        cost_usd: 0.003, // Partial cost for failed execution
        success: false,
        error: error.message
      };
    }
  }

  async processScrapedData(data) {
    // Process data from scraper
    console.log(`[EXECUTION_AGENT] Processing ${data.items.length} scraped items`);
    
    // Simulate processing
    await this.sleep(800);
    
    return {
      processed_items: data.items.length,
      opportunities_found: data.items.filter(i => i.estimated_profit > 0.01).length,
      timestamp: new Date().toISOString()
    };
  }

  async executeOnChain(payload) {
    // Simulate on-chain execution
    console.log('[EXECUTION_AGENT] Executing on-chain operation...');
    await this.sleep(1200);
    
    return {
      tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      block_number: 12345678,
      gas_used: 150000,
      status: 'confirmed'
    };
  }

  async executeApiCall(payload) {
    // Simulate API execution
    console.log('[EXECUTION_AGENT] Executing API call...');
    await this.sleep(300);
    
    return {
      status_code: 200,
      response_size: 1024,
      api_endpoint: payload.endpoint || '/api/v1/data'
    };
  }

  async callValidatorAgent(executionData) {
    console.log('[EXECUTION_AGENT] Calling validator_agent via gateway...');
    
    const payload = {
      task_type: 'validate_execution',
      source_agent: this.agent_id,
      source_type: this.type,
      execution_context: executionData,
      priority: 'high',
      billing_context: {
        source: 'execution_agent',
        execution_id: executionData.execution_id,
        latency_ms: executionData.latency_ms
      }
    };
    
    // Execute via registry
    const result = await registry.executeViaGateway(this.agent_id, payload);
    
    this.metrics.api_calls_made++;
    
    if (result.success) {
      this.metrics.next_agent_calls++;
      console.log(`[EXECUTION_AGENT] ✅ Validator agent called (${result.latency_ms}ms)`);
      
      if (result.data?.billing) {
        this.metrics.total_cost_usd += result.data.billing.estimated_cost_usd || 0.006;
      }
    } else {
      console.error(`[EXECUTION_AGENT] ❌ Failed to call validator: ${result.error}`);
    }
    
    return result;
  }

  getMetrics() {
    return {
      agent_id: this.agent_id,
      type: this.type,
      ...this.metrics,
      avg_latency_ms: this.metrics.executions_completed > 0 
        ? (this.metrics.total_latency_ms / this.metrics.executions_completed).toFixed(2)
        : 0,
      timestamp: new Date().toISOString()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    await this.producer.disconnect();
    console.log('[EXECUTION_AGENT] Stopped');
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new ExecutionAgent();
  
  async function main() {
    await registry.initialize();
    await agent.initialize();
    await agent.start();
  }
  
  main().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[EXECUTION_AGENT] SIGINT received');
    await agent.stop();
    await registry.shutdown();
    process.exit(0);
  });
}

module.exports = { ExecutionAgent };
