/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX HYBRID ORCHESTRATOR v1.0 — HYBRID ARCHITECTURE COORDINATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Event: GXEON_HYBRID_ARCHITECTURE_DEPLOY
 * Mode: HYBRID_DECISION_EXECUTION_MONETIZATION
 * 
 * Orchestrates the three-layer hybrid architecture:
 *   - Decision Layer (gx_decision_engine)
 *   - Execution Layer (gx_execution_engine)
 *   - Monetization Layer (gx_monetization_engine)
 * 
 * Responsibilities:
 *   - Create Kafka topics
 *   - Deploy services in sequence
 *   - Monitor health of all layers
 *   - Handle graceful shutdown
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Kafka, Admin } = require('kafkajs');
const { GXDecisionEngine } = require('./gx_decision_engine');
const { GXExecutionEngine } = require('./gx_execution_engine');
const { GXMonetizationEngine } = require('./gx_monetization_engine');

// ═══════════════════════════════════════════════════════════════════════════
// KAFKA TOPIC CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const KAFKA_TOPICS = {
  // Input topics
  input: [
    {
      topic: 'gx.signals.raw',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '86400000' }, // 24 hours
        { name: 'cleanup.policy', value: 'delete' }
      ]
    },
    {
      topic: 'gx.api.requests',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '86400000' }
      ]
    }
  ],
  
  // Processing topics
  processing: [
    {
      topic: 'gx.decision.queue',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '604800000' }, // 7 days
        { name: 'min.insync.replicas', value: '1' }
      ]
    },
    {
      topic: 'gx.execution.queue',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '604800000' }
      ]
    }
  ],
  
  // Output topics
  output: [
    {
      topic: 'gx.execution.results',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '2592000000' }, // 30 days
        { name: 'cleanup.policy', value: 'compact' }
      ]
    },
    {
      topic: 'gx.billing.events',
      partitions: 6,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '31536000000' } // 1 year - financial records
      ]
    },
    {
      topic: 'gx.audit.logs',
      partitions: 3,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '31536000000' } // 1 year
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
class GXHybridOrchestrator {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'gx-hybrid-orchestrator',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    this.admin = this.kafka.admin();
    this.engines = {
      decision: null,
      execution: null,
      monetization: null
    };
    this.healthStatus = {
      kafka: false,
      decision: false,
      execution: false,
      monetization: false
    };
  }

  async deploy() {
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║       GX HYBRID ARCHITECTURE DEPLOYMENT v1.0                             ║');
    console.log('║       Mode: HYBRID_DECISION_EXECUTION_MONETIZATION                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log();

    try {
      // Step 1: Create Kafka topics
      await this.step1_createKafkaTopics();
      
      // Step 2: Deploy Decision Service
      await this.step2_deployDecisionService();
      
      // Step 3: Deploy Execution Service
      await this.step3_deployExecutionService();
      
      // Step 4: Deploy Billing Service
      await this.step4_deployBillingService();
      
      // Step 5: Enable Observability
      await this.step5_enableObservability();
      
      console.log();
      console.log('╔══════════════════════════════════════════════════════════════════════════╗');
      console.log('║       ✓ HYBRID ARCHITECTURE FULLY DEPLOYED                               ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════╝');
      
      // Print status
      this.printDeploymentStatus();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      console.error('[GX_ORCHESTRATOR] Deployment failed:', error);
      await this.emergencyShutdown();
      throw error;
    }
  }

  async step1_createKafkaTopics() {
    console.log('[STEP 1] Creating Kafka topics...');
    
    await this.admin.connect();
    
    const existingTopics = await this.admin.listTopics();
    console.log(`[STEP 1] Existing topics: ${existingTopics.length}`);
    
    const allTopics = [
      ...KAFKA_TOPICS.input,
      ...KAFKA_TOPICS.processing,
      ...KAFKA_TOPICS.output
    ];
    
    for (const topicConfig of allTopics) {
      if (existingTopics.includes(topicConfig.topic)) {
        console.log(`[STEP 1]   Topic exists: ${topicConfig.topic}`);
        continue;
      }
      
      try {
        await this.admin.createTopics({
          topics: [topicConfig],
          waitForLeaders: true,
          timeout: 30000
        });
        console.log(`[STEP 1]   ✓ Created: ${topicConfig.topic} (${topicConfig.partitions} partitions)`);
      } catch (error) {
        console.error(`[STEP 1]   ✗ Failed to create ${topicConfig.topic}:`, error.message);
        throw error;
      }
    }
    
    console.log(`[STEP 1] ✓ All ${allTopics.length} topics ready`);
    console.log();
  }

  async step2_deployDecisionService() {
    console.log('[STEP 2] Deploying Decision Engine...');
    
    this.engines.decision = new GXDecisionEngine();
    await this.engines.decision.initialize();
    
    this.healthStatus.decision = true;
    console.log('[STEP 2] ✓ Decision Engine deployed');
    console.log('         Input: gx.signals.raw, gx.api.requests');
    console.log('         Output: DECISION_APPROVED → gx.decision.queue');
    console.log('                  DECISION_REJECTED → gx.audit.logs');
    console.log();
  }

  async step3_deployExecutionService() {
    console.log('[STEP 3] Deploying Execution Engine...');
    
    this.engines.execution = new GXExecutionEngine();
    await this.engines.execution.initialize();
    
    this.healthStatus.execution = true;
    console.log('[STEP 3] ✓ Execution Engine deployed');
    console.log('         Input: gx.decision.queue');
    console.log('         Output: EXECUTION_RESULT → gx.execution.results');
    console.log('         Constraints: 8000ms timeout, 2 retries, idempotency');
    console.log();
  }

  async step4_deployBillingService() {
    console.log('[STEP 4] Deploying Monetization Engine...');
    
    this.engines.monetization = new GXMonetizationEngine();
    await this.engines.monetization.initialize();
    
    this.healthStatus.monetization = true;
    console.log('[STEP 4] ✓ Monetization Engine deployed');
    console.log('         Input: gx.execution.results');
    console.log('         Actions: write_to_supabase_ledger, update_user_balance, emit_revenue_event');
    console.log('         Billing: $0.005 base + latency cost per execution');
    console.log();
  }

  async step5_enableObservability() {
    console.log('[STEP 5] Enabling observability...');
    
    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectAndLogMetrics();
    }, 30000); // Every 30 seconds
    
    console.log('[STEP 5] ✓ Observability enabled');
    console.log('         Metrics: revenue_per_execution, decision_latency_ms, execution_success_rate, billing_consistency');
    console.log('         Interval: 30 seconds');
    console.log();
  }

  collectAndLogMetrics() {
    const decisionMetrics = this.engines.decision?.getMetrics() || {};
    const executionMetrics = this.engines.execution?.getMetrics() || {};
    const monetizationMetrics = this.engines.monetization?.getMetrics() || {};
    
    console.log('[METRICS] ════════════════════════════════════════════════════════════');
    console.log(`[METRICS] Decision Layer:`);
    console.log(`[METRICS]   Processed: ${decisionMetrics.decisions_processed || 0} | Approved: ${decisionMetrics.decisions_approved || 0} | Rejected: ${decisionMetrics.decisions_rejected || 0}`);
    console.log(`[METRICS]   Avg Latency: ${decisionMetrics.avg_decision_latency_ms?.toFixed(2) || 0}ms | Approval Rate: ${decisionMetrics.approval_rate || '0%'}`);
    console.log(`[METRICS] Execution Layer:`);
    console.log(`[METRICS]   Attempted: ${executionMetrics.executions_attempted || 0} | Succeeded: ${executionMetrics.executions_succeeded || 0} | Failed: ${executionMetrics.executions_failed || 0}`);
    console.log(`[METRICS]   Avg Latency: ${executionMetrics.avg_execution_latency_ms?.toFixed(2) || 0}ms | Success Rate: ${executionMetrics.success_rate || '0%'}`);
    console.log(`[METRICS]   Retries: ${executionMetrics.executions_retried || 0} | Fallbacks: ${executionMetrics.fallback_activations || 0}`);
    console.log(`[METRICS] Monetization Layer:`);
    console.log(`[METRICS]   Billed: ${monetizationMetrics.executions_billed || 0} | Revenue: $${monetizationMetrics.revenue_usd?.toFixed(4) || '0.0000'}`);
    console.log(`[METRICS]   Balance Updates: ${monetizationMetrics.balance_updates || 0} | Failures: ${monetizationMetrics.billing_failures || 0}`);
    console.log(`[METRICS]   Avg Billing Latency: ${monetizationMetrics.avg_billing_latency_ms?.toFixed(2) || 0}ms`);
    console.log('[METRICS] ════════════════════════════════════════════════════════════');
  }

  startHealthMonitoring() {
    this.healthInterval = setInterval(() => {
      this.checkHealth();
    }, 60000); // Every minute
  }

  async checkHealth() {
    // Simple health check - could be expanded
    const allHealthy = Object.values(this.healthStatus).every(status => status === true);
    
    if (!allHealthy) {
      console.warn('[HEALTH_CHECK] Some components are unhealthy:', this.healthStatus);
    }
  }

  printDeploymentStatus() {
    console.log();
    console.log('Deployment Status:');
    console.log('  ✓ Kafka Topics: ' + Object.values(KAFKA_TOPICS).flat().length + ' topics');
    console.log('  ✓ Decision Engine: ' + (this.healthStatus.decision ? 'ONLINE' : 'OFFLINE'));
    console.log('  ✓ Execution Engine: ' + (this.healthStatus.execution ? 'ONLINE' : 'OFFLINE'));
    console.log('  ✓ Monetization Engine: ' + (this.healthStatus.monetization ? 'ONLINE' : 'OFFLINE'));
    console.log();
    console.log('Data Flow:');
    console.log('  gx.signals.raw → gx_decision_engine → gx.decision.queue');
    console.log('  gx.decision.queue → gx_execution_engine → gx.execution.results');
    console.log('  gx.execution.results → gx_monetization_engine → gx.billing.events');
    console.log();
    console.log('Safety:');
    console.log('  • Fail Closed: ENABLED');
    console.log('  • No Orphan Execution: ENABLED');
    console.log('  • Require Decision Gate: ENABLED');
    console.log();
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n[GX_ORCHESTRATOR] ${signal} received - initiating graceful shutdown...`);
      
      // Stop metrics collection
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      if (this.healthInterval) clearInterval(this.healthInterval);
      
      // Final metrics dump
      this.collectAndLogMetrics();
      
      // Shutdown engines in reverse order
      console.log('[GX_ORCHESTRATOR] Shutting down engines...');
      
      if (this.engines.monetization) {
        await this.engines.monetization.shutdown();
      }
      
      if (this.engines.execution) {
        await this.engines.execution.shutdown();
      }
      
      if (this.engines.decision) {
        await this.engines.decision.shutdown();
      }
      
      await this.admin.disconnect();
      
      console.log('[GX_ORCHESTRATOR] ✓ All engines shut down successfully');
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async emergencyShutdown() {
    console.log('[GX_ORCHESTRATOR] EMERGENCY SHUTDOWN');
    
    try {
      if (this.engines.monetization) await this.engines.monetization.shutdown();
    } catch (e) {}
    
    try {
      if (this.engines.execution) await this.engines.execution.shutdown();
    } catch (e) {}
    
    try {
      if (this.engines.decision) await this.engines.decision.shutdown();
    } catch (e) {}
    
    try {
      await this.admin.disconnect();
    } catch (e) {}
  }

  // API for external interaction
  async getSystemStatus() {
    return {
      timestamp: new Date().toISOString(),
      health: this.healthStatus,
      engines: {
        decision: this.engines.decision?.getMetrics() || null,
        execution: this.engines.execution?.getMetrics() || null,
        monetization: this.engines.monetization?.getMetrics() || null
      },
      topics: KAFKA_TOPICS
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AND RUN
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { GXHybridOrchestrator, KAFKA_TOPICS };

// Run if called directly
if (require.main === module) {
  const orchestrator = new GXHybridOrchestrator();
  
  orchestrator.deploy().catch(error => {
    console.error('[GX_ORCHESTRATOR] Fatal error:', error);
    process.exit(1);
  });
}
