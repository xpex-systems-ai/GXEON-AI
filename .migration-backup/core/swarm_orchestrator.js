#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SWARM ORCHESTRATOR — A2A Chain Controller v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Purpose: Coordinate automated A2A chain without manual intervention
 * 
 * Chain Flow:
 *   scraper_agent → execution_agent → validator_agent → reporter_agent
 * 
 * All calls go through /v1/a2a/execute with proper API keys
 * Every execution generates billing event with required fields
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry } = require('./agent_registry');
const { ScraperAgent } = require('../agents/scraper_agent');
const { ExecutionAgent } = require('../agents/execution_agent');
const { ValidatorAgent } = require('../agents/validator_agent');
const { BillingAgent } = require('../agents/billing_agent');
const { ReporterAgent } = require('../agents/reporter_agent');
const { Kafka } = require('kafkajs');

class SwarmOrchestrator {
  constructor() {
    this.agents = new Map();
    this.isRunning = false;
    this.cycleCount = 0;
    
    this.metrics = {
      cycles_initiated: 0,
      cycles_completed: 0,
      cycles_failed: 0,
      total_billing_usd: 0,
      a2a_calls_made: 0
    };
    
    this.kafka = new Kafka({
      clientId: 'swarm-orchestrator',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    this.producer = this.kafka.producer();
    
    // A2A Chain definition
    this.chain = [
      { id: 'scraper_agent_001', type: 'scraper', next: 'execution_agent_001' },
      { id: 'execution_agent_001', type: 'execution', next: 'validator_agent_001' },
      { id: 'validator_agent_001', type: 'validator', next: 'reporter_agent_001' },
      { id: 'reporter_agent_001', type: 'reporter', next: null }
    ];
  }

  async initialize() {
    console.log('[SWARM_ORCHESTRATOR] Initializing Swarm A2A v1.0...');
    
    // Initialize registry
    await registry.initialize();
    
    // Initialize all agents
    await this.initializeAgents();
    
    // Connect to Kafka
    await this.producer.connect();
    
    console.log('[SWARM_ORCHESTRATOR] ✅ All agents initialized');
    console.log('[SWARM_ORCHESTRATOR] Chain: scraper → execution → validator → reporter');
  }

  async initializeAgents() {
    // Initialize Scraper Agent
    const scraper = new ScraperAgent();
    await scraper.initialize();
    this.agents.set('scraper_agent_001', scraper);
    
    // Initialize Execution Agent
    const executor = new ExecutionAgent();
    await executor.initialize();
    this.agents.set('execution_agent_001', executor);
    
    // Initialize Validator Agent
    const validator = new ValidatorAgent();
    await validator.initialize();
    this.agents.set('validator_agent_001', validator);
    
    // Initialize Billing Agent
    const billing = new BillingAgent();
    await billing.initialize();
    this.agents.set('billing_agent_001', billing);
    
    // Initialize Reporter Agent
    const reporter = new ReporterAgent();
    await reporter.initialize();
    this.agents.set('reporter_agent_001', reporter);
  }

  async start() {
    this.isRunning = true;
    console.log('[SWARM_ORCHESTRATOR] Starting A2A chain automation...');
    
    // Start all agents
    for (const [id, agent] of this.agents) {
      if (agent.start) {
        await agent.start();
      }
    }
    
    // Start automated cycle
    this.runAutomatedCycles();
    
    // Start metrics reporting
    setInterval(() => {
      this.reportMetrics();
    }, 30000);
  }

  async runAutomatedCycles() {
    while (this.isRunning) {
      try {
        await this.executeChainCycle();
        this.cycleCount++;
        
        // Wait between cycles
        await this.sleep(15000); // 15 seconds between cycles
        
      } catch (error) {
        console.error('[SWARM_ORCHESTRATOR] Cycle error:', error.message);
        this.metrics.cycles_failed++;
        await this.sleep(5000);
      }
    }
  }

  async executeChainCycle() {
    const cycleId = `cycle_${Date.now()}`;
    console.log(`\n[SWARM_ORCHESTRATOR] ═══════════════════════════════════════════`);
    console.log(`[SWARM_ORCHESTRATOR] Starting A2A Chain Cycle: ${cycleId}`);
    console.log(`[SWARM_ORCHESTRATOR] ═══════════════════════════════════════════\n`);
    
    this.metrics.cycles_initiated++;
    
    const cycleData = {
      cycle_id: cycleId,
      start_time: new Date().toISOString(),
      steps: [],
      billing_total: 0
    };
    
    try {
      // Step 1: Scraper Agent (triggers the chain)
      console.log('[SWARM_ORCHESTRATOR] Step 1/4: Scraper Agent...');
      const scraper = this.agents.get('scraper_agent_001');
      
      // Scraper scrapes data and calls execution agent via gateway
      const scrapeData = await scraper.performScrape();
      
      cycleData.steps.push({
        agent: 'scraper_agent_001',
        action: 'scrape',
        status: 'completed',
        items: scrapeData.items.length
      });
      
      this.metrics.a2a_calls_made++;
      
      // Step 2: Execution Agent (called by scraper via gateway)
      // The scraper agent's callExecutionAgent method already triggers this
      // But we simulate it here for the orchestrator tracking
      console.log('[SWARM_ORCHESTRATOR] Step 2/4: Execution Agent...');
      
      const executor = this.agents.get('execution_agent_001');
      const execResult = await executor.executeTask({
        task_type: 'process_scraped_data',
        payload: scrapeData
      });
      
      cycleData.steps.push({
        agent: 'execution_agent_001',
        action: 'execute',
        status: execResult.success ? 'completed' : 'failed',
        execution_id: execResult.execution_id,
        latency_ms: execResult.latency_ms,
        cost_usd: execResult.cost_usd
      });
      
      if (execResult.cost_usd) {
        cycleData.billing_total += execResult.cost_usd;
      }
      
      this.metrics.a2a_calls_made++;
      this.metrics.total_billing_usd += execResult.cost_usd || 0;
      
      // Step 3: Validator Agent
      console.log('[SWARM_ORCHESTRATOR] Step 3/4: Validator Agent...');
      
      const validator = this.agents.get('validator_agent_001');
      const valResult = await validator.validate({
        execution_context: execResult
      });
      
      cycleData.steps.push({
        agent: 'validator_agent_001',
        action: 'validate',
        status: valResult.passed ? 'passed' : 'failed',
        validation_id: valResult.validation_id,
        latency_ms: valResult.latency_ms,
        cost_usd: valResult.cost_usd
      });
      
      if (valResult.cost_usd) {
        cycleData.billing_total += valResult.cost_usd;
      }
      
      this.metrics.a2a_calls_made++;
      this.metrics.total_billing_usd += valResult.cost_usd || 0;
      
      // Step 4: Reporter Agent
      console.log('[SWARM_ORCHESTRATOR] Step 4/4: Reporter Agent...');
      
      const reporter = this.agents.get('reporter_agent_001');
      const reportResult = await reporter.generateReport(valResult);
      
      cycleData.steps.push({
        agent: 'reporter_agent_001',
        action: 'report',
        status: reportResult.success ? 'completed' : 'failed',
        report_id: reportResult.report_id,
        latency_ms: reportResult.latency_ms,
        cost_usd: reportResult.cost_usd
      });
      
      if (reportResult.cost_usd) {
        cycleData.billing_total += reportResult.cost_usd;
      }
      
      this.metrics.a2a_calls_made++;
      this.metrics.total_billing_usd += reportResult.cost_usd || 0;
      
      // Cycle complete
      cycleData.end_time = new Date().toISOString();
      cycleData.status = 'COMPLETED';
      
      this.metrics.cycles_completed++;
      
      console.log(`\n[SWARM_ORCHESTRATOR] ✅ Cycle ${cycleId} COMPLETED`);
      console.log(`[SWARM_ORCHESTRATOR]    Steps: ${cycleData.steps.length}`);
      console.log(`[SWARM_ORCHESTRATOR]    Total billing: $${cycleData.billing_total.toFixed(4)}`);
      console.log(`[SWARM_ORCHESTRATOR]    Status: ${valResult.passed ? 'VALIDATED' : 'VALIDATION_FAILED'}`);
      
      // Emit cycle complete event
      await this.emitCycleComplete(cycleData);
      
    } catch (error) {
      cycleData.end_time = new Date().toISOString();
      cycleData.status = 'FAILED';
      cycleData.error = error.message;
      
      this.metrics.cycles_failed++;
      
      console.error(`\n[SWARM_ORCHESTRATOR] ❌ Cycle ${cycleId} FAILED: ${error.message}`);
      
      await this.emitCycleFailed(cycleData, error);
    }
    
    return cycleData;
  }

  async emitCycleComplete(cycleData) {
    const event = {
      event_type: 'SWARM_CYCLE_COMPLETE',
      timestamp: new Date().toISOString(),
      cycle_id: cycleData.cycle_id,
      swarm_version: '1.0.0',
      
      // Chain summary
      chain: {
        agents: ['scraper', 'execution', 'validator', 'reporter'],
        step_count: cycleData.steps.length,
        duration_ms: new Date(cycleData.end_time) - new Date(cycleData.start_time)
      },
      
      // Billing summary with required fields
      billing: {
        total_cost_usd: cycleData.billing_total,
        ledger_table: 'gx_billing_ledger',
        required_fields: ['api_key_id', 'cost', 'latency', 'success_flag', 'execution_id'],
        billing_mode: 'REAL'
      },
      
      // External usage stream trigger
      external_usage: {
        topic: 'gx_external_usage_stream',
        emitted: true,
        agent_count: 4,
        cycle_complete: true
      },
      
      status: cycleData.status
    };
    
    try {
      // Emit to swarm coordination topic
      await this.producer.send({
        topic: 'swarm.coordination',
        messages: [{
          key: cycleData.cycle_id,
          value: JSON.stringify(event)
        }]
      });
      
      // Emit to external usage stream
      await this.producer.send({
        topic: 'gx_external_usage_stream',
        messages: [{
          key: cycleData.cycle_id,
          value: JSON.stringify({
            event_type: 'SWARM_CYCLE_EXTERNAL_USAGE',
            timestamp: event.timestamp,
            cycle_id: cycleData.cycle_id,
            swarm_version: '1.0.0',
            agents_involved: 4,
            total_cost_usd: cycleData.billing_total,
            billing_mode: 'REAL',
            ledger_table: 'gx_billing_ledger',
            status: 'cycle_complete'
          }),
          headers: {
            'x-external': 'true',
            'x-swarm': 'true',
            'x-cycle-complete': 'true'
          }
        }]
      });
      
      console.log(`[SWARM_ORCHESTRATOR] 📤 Events emitted to Kafka`);
      
    } catch (error) {
      console.error('[SWARM_ORCHESTRATOR] Kafka emit error:', error.message);
    }
  }

  async emitCycleFailed(cycleData, error) {
    const event = {
      event_type: 'SWARM_CYCLE_FAILED',
      timestamp: new Date().toISOString(),
      cycle_id: cycleData.cycle_id,
      error: error.message,
      failed_step: cycleData.steps.length,
      status: 'FAILED'
    };
    
    try {
      await this.producer.send({
        topic: 'swarm.coordination',
        messages: [{
          key: cycleData.cycle_id,
          value: JSON.stringify(event)
        }]
      });
    } catch (kafkaError) {
      console.error('[SWARM_ORCHESTRATOR] Kafka emit error:', kafkaError.message);
    }
  }

  reportMetrics() {
    console.log('\n[SWARM_ORCHESTRATOR] ════ METRICS ════');
    console.log(`  Cycles initiated:   ${this.metrics.cycles_initiated}`);
    console.log(`  Cycles completed:   ${this.metrics.cycles_completed}`);
    console.log(`  Cycles failed:      ${this.metrics.cycles_failed}`);
    console.log(`  A2A calls made:     ${this.metrics.a2a_calls_made}`);
    console.log(`  Total billed:       $${this.metrics.total_billing_usd.toFixed(4)}`);
    console.log('═══════════════════════════════════════\n');
  }

  getMetrics() {
    return {
      ...this.metrics,
      cycle_count: this.cycleCount,
      timestamp: new Date().toISOString(),
      chain: this.chain.map(c => ({ id: c.id, type: c.type }))
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    
    console.log('[SWARM_ORCHESTRATOR] Stopping all agents...');
    
    // Stop all agents
    for (const [id, agent] of this.agents) {
      if (agent.stop) {
        await agent.stop();
      }
    }
    
    await this.producer.disconnect();
    await registry.shutdown();
    
    console.log('[SWARM_ORCHESTRATOR] Shutdown complete');
  }
}

// Run if called directly
if (require.main === module) {
  const orchestrator = new SwarmOrchestrator();
  
  async function main() {
    await orchestrator.initialize();
    await orchestrator.start();
  }
  
  main().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[SWARM_ORCHESTRATOR] SIGINT received');
    await orchestrator.stop();
    process.exit(0);
  });
}

module.exports = { SwarmOrchestrator };
