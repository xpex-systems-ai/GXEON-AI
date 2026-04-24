#!/usr/bin/env node

/**
 * GXEON Hybrid Architecture Deployment Script
 * 
 * Usage: node scripts/deploy_hybrid_architecture.js [environment]
 * Environment: local (default) | staging | production
 */

const { GXHybridOrchestrator } = require('../core/gx_hybrid_orchestrator');

const environment = process.argv[2] || 'local';

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║          GXEON HYBRID ARCHITECTURE DEPLOYMENT SCRIPT                     ║');
console.log(`║          Environment: ${environment.toUpperCase().padEnd(45)} ║`);
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log();

// Environment-specific configuration
const configs = {
  local: {
    kafka_brokers: 'localhost:9092',
    log_level: 'debug'
  },
  staging: {
    kafka_brokers: process.env.KAFKA_STAGING_BROKERS || 'kafka-staging:9092',
    log_level: 'info'
  },
  production: {
    kafka_brokers: process.env.KAFKA_PROD_BROKERS || 'kafka-1.prod:9092,kafka-2.prod:9092',
    log_level: 'warn'
  }
};

const config = configs[environment];
if (!config) {
  console.error(`Unknown environment: ${environment}`);
  console.error('Valid environments: local, staging, production');
  process.exit(1);
}

// Set environment variables
process.env.KAFKA_BROKERS = config.kafka_brokers;
process.env.LOG_LEVEL = config.log_level;

console.log('Configuration:');
console.log(`  Kafka Brokers: ${config.kafka_brokers}`);
console.log(`  Log Level: ${config.log_level}`);
console.log();

// Validate dependencies
try {
  require('kafkajs');
  require('../core/gx_hybrid_orchestrator');
  require('../server/services/supabase');
  console.log('✓ Dependencies validated');
} catch (error) {
  console.error('✗ Missing dependencies:', error.message);
  console.error('  Run: npm install kafkajs');
  process.exit(1);
}

// Deploy
async function deploy() {
  try {
    const orchestrator = new GXHybridOrchestrator();
    await orchestrator.deploy();
    
    // Keep process alive
    console.log();
    console.log('Deployment complete. Press Ctrl+C to shutdown.');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
