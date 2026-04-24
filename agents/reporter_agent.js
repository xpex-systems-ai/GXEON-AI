#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REPORTER AGENT — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Type: reporter
 * 
 * Responsibilities:
 * - Receive validation results from validator_agent
 * - Generate final swarm execution reports
 * - Log complete A2A chain results
 * - Trigger gx_external_usage_stream event after full cycle
 * - Generate billing event with execution_id, latency, cost, success_flag
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry, REGISTRY_CONFIG } = require('../core/agent_registry');
const { Kafka } = require('kafkajs');

class ReporterAgent {
  constructor() {
    this.agent_id = 'reporter_agent_001';
    this.name = 'Reporter Agent';
    this.type = 'reporter';
    this.api_key = process.env.REPORTER_AGENT_API_KEY || null;
    
    this.metrics = {
      reports_generated: 0,
      cycles_completed: 0,
      api_calls_made: 0,
      total_cost_usd: 0,
      total_latency_ms: 0
    };
    
    this.kafka = new Kafka({
      clientId: this.agent_id,
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    this.producer = this.kafka.producer();
    
    this.cycleHistory = [];
    this.isRunning = false;
  }

  async initialize() {
    console.log('[REPORTER_AGENT] Initializing...');
    
    // Register with agent registry
    const config = registry.registerAgent({
      agent_id: this.agent_id,
      name: this.name,
      type: this.type,
      api_key: this.api_key,
      permissions: ['read', 'write'],
      metadata: {
        capabilities: ['report_generation', 'cycle_tracking', 'final_logging'],
        previous_agent: 'validator_agent_001',
        is_terminal_agent: true
      }
    });
    
    this.api_key = config.api_key;
    
    // Connect to Kafka
    await this.producer.connect();
    
    console.log(`[REPORTER_AGENT] Registered with API Key: ${this.api_key.substring(0, 16)}...`);
    console.log('[REPORTER_AGENT] Kafka producer connected');
  }

  async start() {
    this.isRunning = true;
    console.log('[REPORTER_AGENT] Ready to receive reports');
  }

  async generateReport(validationResult) {
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`[REPORTER_AGENT] Generating report for cycle: ${validationResult.execution_id}`);
    
    try {
      // Compile full A2A chain data
      const report = {
        report_id: reportId,
        timestamp: new Date().toISOString(),
        swarm_version: '1.0.0',
        cycle_id: `cycle_${Date.now()}`,
        
        // A2A Chain
        chain: {
          scraper: { agent_id: 'scraper_agent_001', status: 'completed' },
          execution: { 
            agent_id: 'execution_agent_001', 
            status: 'completed',
            execution_id: validationResult.execution_id,
            latency_ms: validationResult.latency_ms
          },
          validator: { 
            agent_id: 'validator_agent_001', 
            status: 'completed',
            validation_id: validationResult.validation_id,
            passed: validationResult.passed
          },
          reporter: { agent_id: this.agent_id, status: 'generating' }
        },
        
        // Validation results
        validation: validationResult,
        
        // Billing summary
        billing: {
          total_estimated_cost: 0.024, // 4 agents * 0.006
          currency: 'USD',
          ledger_table: 'gx_billing_ledger'
        },
        
        // Status
        status: validationResult.passed ? 'SUCCESS' : 'VALIDATION_FAILED'
      };
      
      const latency = Date.now() - startTime;
      this.metrics.total_latency_ms += latency;
      
      // Store in history
      this.cycleHistory.push(report);
      if (this.cycleHistory.length > 100) {
        this.cycleHistory.shift();
      }
      
      this.metrics.reports_generated++;
      
      // Emit cycle complete event
      await this.emitCycleComplete(report);
      
      console.log(`[REPORTER_AGENT] ✅ Report generated: ${reportId}`);
      console.log(`[REPORTER_AGENT] 📊 Cycle status: ${report.status}`);
      
      // Return with billing data
      return {
        report_id: reportId,
        execution_id: validationResult.execution_id,
        latency_ms: latency,
        cost_usd: 0.006,
        success: validationResult.passed,
        report: report
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error(`[REPORTER_AGENT] ❌ Report generation failed: ${error.message}`);
      
      return {
        report_id: reportId,
        execution_id: validationResult.execution_id,
        latency_ms: latency,
        cost_usd: 0.003,
        success: false,
        error: error.message
      };
    }
  }

  async emitCycleComplete(report) {
    const event = {
      event_type: 'SWARM_CYCLE_COMPLETE',
      timestamp: new Date().toISOString(),
      cycle_id: report.cycle_id,
      swarm_version: report.swarm_version,
      
      // Chain summary
      agents_involved: [
        'scraper_agent_001',
        'execution_agent_001',
        'validator_agent_001',
        'reporter_agent_001'
      ],
      
      // Billing summary
      billing_summary: {
        total_cost_usd: report.billing.total_estimated_cost,
        ledger_table: 'gx_billing_ledger',
        required_fields_present: ['execution_id', 'latency_ms', 'cost_usd', 'success']
      },
      
      // Status
      final_status: report.status,
      validation_passed: report.validation.passed,
      
      // Metadata for external usage stream
      external_usage: {
        should_emit: true,
        topic: 'gx_external_usage_stream',
        api_key_ids: ['scraper_agent_001', 'execution_agent_001', 'validator_agent_001', 'reporter_agent_001']
      }
    };
    
    try {
      // Emit to swarm coordination
      await this.producer.send({
        topic: 'swarm.coordination',
        messages: [{
          key: report.cycle_id,
          value: JSON.stringify(event),
          headers: {
            'x-swarm-cycle': 'complete',
            'x-cycle-status': report.status
          }
        }]
      });
      
      // Also emit to external usage stream
      await this.producer.send({
        topic: 'gx_external_usage_stream',
        messages: [{
          key: report.cycle_id,
          value: JSON.stringify({
            event_type: 'SWARM_CYCLE_EXTERNAL_USAGE',
            timestamp: event.timestamp,
            cycle_id: report.cycle_id,
            agents_count: 4,
            total_cost_usd: report.billing.total_estimated_cost,
            final_status: report.status,
            validation_passed: report.validation.passed,
            billing_mode: 'REAL',
            ledger_table: 'gx_billing_ledger'
          }),
          headers: {
            'x-external': 'true',
            'x-swarm': 'true',
            'x-cycle-complete': 'true'
          }
        }]
      });
      
      this.metrics.cycles_completed++;
      console.log(`[REPORTER_AGENT] 📤 Cycle complete events emitted: ${report.cycle_id}`);
      
    } catch (error) {
      console.error('[REPORTER_AGENT] Kafka emit error:', error.message);
    }
  }

  getCycleHistory(limit = 10) {
    return this.cycleHistory.slice(-limit);
  }

  getMetrics() {
    return {
      agent_id: this.agent_id,
      type: this.type,
      ...this.metrics,
      avg_latency_ms: this.metrics.reports_generated > 0
        ? (this.metrics.total_latency_ms / this.metrics.reports_generated).toFixed(2)
        : 0,
      history_size: this.cycleHistory.length,
      timestamp: new Date().toISOString()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    await this.producer.disconnect();
    console.log('[REPORTER_AGENT] Stopped');
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new ReporterAgent();
  
  async function main() {
    await registry.initialize();
    await agent.initialize();
    await agent.start();
  }
  
  main().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[REPORTER_AGENT] SIGINT received');
    await agent.stop();
    await registry.shutdown();
    process.exit(0);
  });
}

module.exports = { ReporterAgent };
