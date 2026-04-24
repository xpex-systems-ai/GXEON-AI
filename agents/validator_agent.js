#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDATOR AGENT — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Type: validator
 * 
 * Responsibilities:
 * - Receive execution results from execution_agent
 * - Validate correctness, compliance, and quality
 * - Call reporter_agent with validation results
 * - Generate billing event with execution_id, latency, cost, success_flag
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry, REGISTRY_CONFIG } = require('../core/agent_registry');

class ValidatorAgent {
  constructor() {
    this.agent_id = 'validator_agent_001';
    this.name = 'Validator Agent';
    this.type = 'validator';
    this.api_key = process.env.VALIDATOR_AGENT_API_KEY || null;
    
    this.metrics = {
      validations_performed: 0,
      validations_passed: 0,
      validations_failed: 0,
      api_calls_made: 0,
      total_cost_usd: 0,
      next_agent_calls: 0,
      total_latency_ms: 0
    };
    
    this.isRunning = false;
  }

  async initialize() {
    console.log('[VALIDATOR_AGENT] Initializing...');
    
    // Register with agent registry
    const config = registry.registerAgent({
      agent_id: this.agent_id,
      name: this.name,
      type: this.type,
      api_key: this.api_key,
      permissions: ['read', 'execute'],
      metadata: {
        capabilities: ['result_validation', 'compliance_check', 'quality_assurance'],
        previous_agent: 'execution_agent_001',
        next_agent: 'reporter_agent_001',
        validation_rules: ['completeness', 'accuracy', 'compliance']
      }
    });
    
    this.api_key = config.api_key;
    console.log(`[VALIDATOR_AGENT] Registered with API Key: ${this.api_key.substring(0, 16)}...`);
  }

  async start() {
    this.isRunning = true;
    console.log('[VALIDATOR_AGENT] Ready to receive validation tasks');
    
    // In production, this would consume from Kafka
    // Validation tasks arrive via calls from execution agent
  }

  async validate(validationData) {
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`[VALIDATOR_AGENT] Validating execution: ${validationData.execution_context?.execution_id}`);
    
    this.metrics.validations_performed++;
    
    try {
      // Perform validation checks
      const checks = await this.performValidationChecks(validationData);
      
      const latency = Date.now() - startTime;
      this.metrics.total_latency_ms += latency;
      
      const passed = checks.every(c => c.passed);
      
      if (passed) {
        this.metrics.validations_passed++;
        console.log(`[VALIDATOR_AGENT] ✅ Validation passed: ${validationId}`);
      } else {
        this.metrics.validations_failed++;
        console.log(`[VALIDATOR_AGENT] ⚠️  Validation failed: ${validationId}`);
      }
      
      const result = {
        validation_id: validationId,
        execution_id: validationData.execution_context?.execution_id,
        passed: passed,
        checks: checks,
        latency_ms: latency,
        cost_usd: passed ? 0.002 : 0.001,
        timestamp: new Date().toISOString()
      };
      
      // Call reporter agent
      await this.callReporterAgent(result);
      
      return result;
      
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.validations_failed++;
      
      console.error(`[VALIDATOR_AGENT] ❌ Validation error: ${error.message}`);
      
      return {
        validation_id: validationId,
        execution_id: validationData.execution_context?.execution_id,
        passed: false,
        error: error.message,
        latency_ms: latency,
        cost_usd: 0.001,
        timestamp: new Date().toISOString()
      };
    }
  }

  async performValidationChecks(data) {
    const checks = [];
    const execution = data.execution_context;
    
    // Check 1: Completeness
    checks.push({
      name: 'completeness',
      passed: execution && execution.execution_id && execution.result !== undefined,
      details: 'All required fields present'
    });
    
    // Check 2: Latency within bounds
    checks.push({
      name: 'latency',
      passed: execution && execution.latency_ms < 5000,
      details: `Latency: ${execution?.latency_ms}ms (threshold: 5000ms)`
    });
    
    // Check 3: Result quality
    const hasValidResult = execution && execution.result && 
                          Object.keys(execution.result).length > 0;
    checks.push({
      name: 'quality',
      passed: hasValidResult,
      details: hasValidResult ? 'Valid result returned' : 'Empty or invalid result'
    });
    
    // Simulate validation processing
    await this.sleep(400);
    
    return checks;
  }

  async callReporterAgent(validationResult) {
    console.log('[VALIDATOR_AGENT] Calling reporter_agent via gateway...');
    
    const payload = {
      task_type: 'report_validation',
      source_agent: this.agent_id,
      source_type: this.type,
      validation_result: validationResult,
      priority: 'normal',
      billing_context: {
        source: 'validator_agent',
        validation_id: validationResult.validation_id,
        passed: validationResult.passed
      }
    };
    
    // Execute via registry
    const result = await registry.executeViaGateway(this.agent_id, payload);
    
    this.metrics.api_calls_made++;
    
    if (result.success) {
      this.metrics.next_agent_calls++;
      console.log(`[VALIDATOR_AGENT] ✅ Reporter agent called (${result.latency_ms}ms)`);
      
      if (result.data?.billing) {
        this.metrics.total_cost_usd += result.data.billing.estimated_cost_usd || 0.006;
      }
    } else {
      console.error(`[VALIDATOR_AGENT] ❌ Failed to call reporter: ${result.error}`);
    }
    
    return result;
  }

  getMetrics() {
    return {
      agent_id: this.agent_id,
      type: this.type,
      ...this.metrics,
      avg_latency_ms: this.metrics.validations_performed > 0 
        ? (this.metrics.total_latency_ms / this.metrics.validations_performed).toFixed(2)
        : 0,
      timestamp: new Date().toISOString()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    console.log('[VALIDATOR_AGENT] Stopped');
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new ValidatorAgent();
  
  async function main() {
    await registry.initialize();
    await agent.initialize();
    await agent.start();
  }
  
  main().catch(console.error);
  
  process.on('SIGINT', async () => {
    console.log('\n[VALIDATOR_AGENT] SIGINT received');
    await agent.stop();
    await registry.shutdown();
    process.exit(0);
  });
}

module.exports = { ValidatorAgent };
