#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌙 TOTAL MONETIZATION SWARM ORCHESTRATOR v2.0
 * Live execution of full monetization ecosystem
 * Author: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * EXECUTION PHASES:
 * 1. DEPLOY → Ensure server is live
 * 2. SEED → Generate 300 agents with PIX
 * 3. BEHAVIOR → Hit free endpoints, trigger paywalls
 * 4. DISCOVERY → Find external bots on GitHub
 * 5. VIRAL → Share code snippets
 * 6. MONITOR → Watch metrics dashboard
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app';

const PHASES = {
  DEPLOY: true,
  SEED: true,
  DISCOVERY: true,
  MONITOR: true
};

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: DEPLOY - Ensure server is live
// ═══════════════════════════════════════════════════════════════════════════
async function phaseDeploy() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 PHASE 1: DEPLOY                                          ║');
  console.log('║     Verify server is live and accessible                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    console.log('🔍 Checking server health...');
    const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
    
    if (response.status === 200) {
      console.log('✅ Server is LIVE');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Timestamp: ${response.data.timestamp}`);
      return { success: true, data: response.data };
    }
  } catch (err) {
    console.log(`⚠️ Server health check failed: ${err.message}`);
    console.log('🔄 Attempting to push latest changes...\n');
    
    // Push to deploy
    try {
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('\n⏳ Waiting for deployment (30s)...');
      await new Promise(r => setTimeout(r, 30000));
      
      // Retry health check
      const retry = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
      if (retry.status === 200) {
        console.log('✅ Server deployed and LIVE');
        return { success: true, data: retry.data };
      }
    } catch (pushErr) {
      console.log(`❌ Deploy failed: ${pushErr.message}`);
      return { success: false, error: pushErr.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: SEED - Generate 300 agents
// ═══════════════════════════════════════════════════════════════════════════
async function phaseSeed() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🌙 PHASE 2: SWARM SEED                                    ║');
  console.log('║     Generate 300 agents + behavior loop                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    console.log('🤖 Executing seed_agents.js...\n');
    execSync('node scripts/seed_agents.js', { stdio: 'inherit' });
    return { success: true };
  } catch (err) {
    console.log(`❌ Seed phase failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: DISCOVERY - Find external bots
// ═══════════════════════════════════════════════════════════════════════════
async function phaseDiscovery() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🔍 PHASE 3: DISCOVERY                                     ║');
  console.log('║     Find trading bots on GitHub for recruitment               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    console.log('🤖 Executing discoveryAgent.js...\n');
    execSync('node server/agents/discoveryAgent.js', { stdio: 'inherit' });
    return { success: true };
  } catch (err) {
    console.log(`⚠️ Discovery phase error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: MONITOR - Real-time dashboard
// ═══════════════════════════════════════════════════════════════════════════
async function phaseMonitor() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     📊 PHASE 4: MONITOR                                       ║');
  console.log('║     Real-time metrics and conversion tracking                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📡 Fetching current metrics...\n');
  
  try {
    // Try to get metrics (may require admin key)
    const response = await axios.get(`${API_BASE}/v1/admin/metrics`, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      const m = response.data.metrics;
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 CURRENT SYSTEM STATE');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`💰 Revenue:`);
      console.log(`   Total: R$ ${m.revenue?.total_brl?.toFixed(2) || '0.00'}`);
      console.log(`   Today: R$ ${m.revenue?.today_brl?.toFixed(2) || '0.00'}`);
      console.log(`   Pending payments: ${m.revenue?.pending_payments || 0}`);
      console.log(`\n👥 Actors:`);
      console.log(`   Total: ${m.actors?.total || 0}`);
      console.log(`   Active: ${m.actors?.active || 0}`);
      console.log(`   Conversion: ${m.actors?.conversion_rate || '0%'}`);
      console.log(`\n📡 Usage:`);
      console.log(`   Total API calls: ${m.usage?.total_api_calls || 0}`);
      console.log(`   Today: ${m.usage?.today_calls || 0}`);
      console.log(`   Paywall hits: ${m.usage?.paywall_hits || 0}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      return { success: true, metrics: m };
    } else {
      console.log(`⚠️ Metrics endpoint returned ${response.status}`);
      console.log('   (Admin key may be required)\n');
      return { success: false, status: response.status };
    }
  } catch (err) {
    console.log(`⚠️ Metrics fetch failed: ${err.message}\n`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SWARM STATUS CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function checkSwarmStatus() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🌙 SWARM HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const checks = {
    health: false,
    freeEndpoint: false,
    registerEndpoint: false
  };
  
  try {
    // Check health
    const health = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    checks.health = health.status === 200;
    console.log(`${checks.health ? '✅' : '❌'} Health endpoint`);
    
    // Check free endpoint
    const free = await axios.get(`${API_BASE}/v1/signals/free`, { timeout: 5000 });
    checks.freeEndpoint = free.status === 200;
    console.log(`${checks.freeEndpoint ? '✅' : '❌'} Free signals endpoint`);
    
    // Check register endpoint (OPTIONS)
    const register = await axios.options(`${API_BASE}/v1/register-agent`, { timeout: 5000, validateStatus: () => true });
    checks.registerEndpoint = register.status !== 404;
    console.log(`${checks.registerEndpoint ? '✅' : '❌'} Register endpoint`);
    
  } catch (err) {
    console.log(`⚠️ Health check error: ${err.message}`);
  }
  
  const allReady = Object.values(checks).every(v => v);
  console.log(`\n${allReady ? '✅' : '⚠️'} System ${allReady ? 'READY' : 'PARTIAL'} for swarm execution\n`);
  
  return allReady;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════
async function orchestrate() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                                 ║');
  console.log('║     🌙 TOTAL MONETIZATION SWARM ORCHESTRATOR v2.0              ║');
  console.log('║                                                                 ║');
  console.log('║     LIVE EXECUTION MODE                                         ║');
  console.log('║     Generate Real External Requests → Convert to PIX           ║');
  console.log('║                                                                 ║');
  console.log('║     Treasury: 0x3955d559055DadB7067054cB6E6f974710345224       ║');
  console.log('║                                                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const results = {};
  
  // Pre-flight check
  const ready = await checkSwarmStatus();
  if (!ready) {
    console.log('⚠️ System not fully ready. Attempting deploy phase...\n');
  }
  
  // Execute phases
  if (PHASES.DEPLOY) {
    results.deploy = await phaseDeploy();
    if (!results.deploy.success) {
      console.log('❌ Deploy phase failed. Aborting swarm.\n');
      process.exit(1);
    }
  }
  
  if (PHASES.SEED) {
    results.seed = await phaseSeed();
  }
  
  if (PHASES.DISCOVERY) {
    results.discovery = await phaseDiscovery();
  }
  
  if (PHASES.MONITOR) {
    results.monitor = await phaseMonitor();
  }
  
  // Final summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🌙 SWARM EXECUTION COMPLETE                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 PHASE RESULTS:');
  Object.entries(results).forEach(([phase, result]) => {
    console.log(`   ${result?.success ? '✅' : '❌'} ${phase.toUpperCase()}: ${result?.success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  console.log('\n🎯 NEXT ACTIONS:');
  console.log('   1. Monitor metrics: GET /v1/admin/metrics');
  console.log('   2. Watch for paywall hits increasing');
  console.log('   3. Wait for first PIX payment confirmation');
  console.log('   4. Track conversion: agents with active status');
  console.log('\n💰 REVENUE TARGET: First external payment confirmed');
  console.log('   Signals: webhook_triggered + actor_status=active + api_usage\n');
  
  return results;
}

// Execute
orchestrate().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message);
  process.exit(1);
});
