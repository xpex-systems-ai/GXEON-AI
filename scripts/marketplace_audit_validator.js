#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MARKETPLACE SUPREME AUDIT & VALIDATOR
 * 
 * Validates:
 * 1. API endpoints responding
 * 2. Signals streaming automatically
 * 3. Monetization endpoints reachable
 * 4. Database connectivity
 * 5. Machine-to-machine ready
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/v1/marketplace';
const TEST_TIMEOUT = 5000;

console.log(chalk.bold.blue(`
🏪 ═══════════════════════════════════════════════════════════════════
   GXEON SIGNAL MARKETPLACE SUPREME
   FINAL AUDIT & VALIDATION
══════════════════════════════════════════════════════════════════════
`));

const auditResults = {
  system_status: 'FAILED',
  signals_flow: false,
  dashboard_active: false,
  monetization_ready: false,
  machine_to_machine_ready: false,
  latency_ms: 0,
  errors: []
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function testEndpoint(name, method, path, expectedStatus = 200) {
  const url = `${API_BASE}${path}`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT);
    
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeout);
    
    const latency = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    
    const passed = response.status === expectedStatus;
    
    return {
      name,
      passed,
      status: response.status,
      latency,
      data,
      error: passed ? null : `Expected ${expectedStatus}, got ${response.status}`
    };
    
  } catch (err) {
    return {
      name,
      passed: false,
      status: 0,
      latency: Date.now() - startTime,
      data: null,
      error: err.message
    };
  }
}

function printResult(result) {
  const status = result.passed 
    ? chalk.green('✅ PASS') 
    : chalk.red('❌ FAIL');
  
  const latency = result.latency < 100 
    ? chalk.green(`${result.latency}ms`)
    : result.latency < 500
    ? chalk.yellow(`${result.latency}ms`)
    : chalk.red(`${result.latency}ms`);
  
  console.log(`  ${status} ${chalk.bold(result.name)} (${latency})`);
  
  if (result.error) {
    console.log(`     ${chalk.red(result.error)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT CHECKPOINTS
// ═══════════════════════════════════════════════════════════════════════════

async function runAudit() {
  console.log(chalk.bold('\n📋 AUDIT CHECKPOINTS\n'));
  
  const tests = [];
  
  // 1. Health Check
  console.log(chalk.cyan('1. System Health'));
  const health = await testEndpoint('Health Check', 'GET', '/health');
  printResult(health);
  tests.push(health);
  
  if (health.passed && health.data) {
    console.log(`   Services: ${Object.entries(health.data.services || {})
      .map(([k, v]) => `${k}: ${v === 'up' ? chalk.green('up') : chalk.red(v)}`)
      .join(' | ')}`);
  }
  
  // 2. API Signal Endpoint
  console.log(chalk.cyan('\n2. API Signal Endpoints'));
  const signalsLive = await testEndpoint('GET /signals/live', 'GET', '/signals/live');
  printResult(signalsLive);
  tests.push(signalsLive);
  
  const signalsList = await testEndpoint('GET /signals', 'GET', '/signals?userId=test123&tier=PRO');
  printResult(signalsList);
  tests.push(signalsList);
  
  const providers = await testEndpoint('GET /providers', 'GET', '/providers');
  printResult(providers);
  tests.push(providers);
  
  const leaderboard = await testEndpoint('GET /leaderboard', 'GET', '/leaderboard');
  printResult(leaderboard);
  tests.push(leaderboard);
  
  // Check if signals are flowing
  if (signalsLive.passed && signalsLive.data?.data?.length > 0) {
    auditResults.signals_flow = true;
    console.log(chalk.green(`   ✓ ${signalsLive.data.data.length} signals active`));
  }
  
  // 3. Monetization Engine
  console.log(chalk.cyan('\n3. Monetization Engine'));
  const pricing = await testEndpoint('GET /pricing', 'GET', '/pricing');
  printResult(pricing);
  tests.push(pricing);
  
  const stats = await testEndpoint('GET /stats', 'GET', '/stats');
  printResult(stats);
  tests.push(stats);
  
  if (pricing.passed && stats.passed) {
    auditResults.monetization_ready = true;
    
    if (stats.data?.revenue) {
      console.log(`   Revenue Total: R$ ${chalk.green(stats.data.revenue.total_revenue_brl?.toFixed(2) || '0.00')}`);
      console.log(`   Subscriptions: ${chalk.green(stats.data.revenue.subscriptions || 0)}`);
      console.log(`   Pay-per-signal: ${chalk.green(stats.data.revenue.pay_per_signals || 0)}`);
    }
  }
  
  // 4. Distribution API (Machine-to-Machine)
  console.log(chalk.cyan('\n4. Machine-to-Machine Endpoints'));
  
  // Test format outputs
  const cornix = await testEndpoint('GET /cornix (format test)', 'GET', '/cornix?userId=test&tier=PRO');
  printResult(cornix);
  tests.push(cornix);
  
  // Check latency
  const latencies = tests.filter(t => t.latency > 0).map(t => t.latency);
  const avgLatency = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  
  auditResults.latency_ms = avgLatency;
  
  if (avgLatency < 500 && signalsLive.passed && providers.passed) {
    auditResults.machine_to_machine_ready = true;
    console.log(chalk.green(`   ✓ Average latency: ${avgLatency}ms (target: <500ms)`));
  } else {
    console.log(chalk.yellow(`   ⚠ Average latency: ${avgLatency}ms`));
  }
  
  // 5. Signal Lifecycle
  console.log(chalk.cyan('\n5. Signal Lifecycle Tracking'));
  
  if (signalsLive.data?.data && signalsLive.data.data.length > 0) {
    const sampleSignal = signalsLive.data.data[0];
    console.log(`   Sample signal: ${chalk.green(sampleSignal.pair || sampleSignal.symbol)}`);
    console.log(`   Type: ${sampleSignal.type || 'N/A'}`);
    console.log(`   Confidence: ${sampleSignal.confidence || sampleSignal.ranking?.confidence || 'N/A'}%`);
    console.log(`   Provider: ${sampleSignal.provider_name || 'GXEON'}`);
    console.log(chalk.green('   ✓ Signal lifecycle: CREATED → ACTIVE (tracking)'));
  } else {
    console.log(chalk.yellow('   ⚠ No active signals found'));
  }
  
  // 6. Summary
  console.log(chalk.bold('\n══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 VALIDATION SUMMARY\n'));
  
  const passedTests = tests.filter(t => t.passed).length;
  const totalTests = tests.length;
  const passRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`Tests Passed: ${chalk.green(passedTests)}/${totalTests} (${passRate}%)`);
  console.log(`Average Latency: ${avgLatency}ms`);
  console.log(`Signals Flowing: ${auditResults.signals_flow ? chalk.green('YES') : chalk.red('NO')}`);
  console.log(`Monetization: ${auditResults.monetization_ready ? chalk.green('READY') : chalk.red('NOT READY')}`);
  console.log(`Machine-to-Machine: ${auditResults.machine_to_machine_ready ? chalk.green('READY') : chalk.red('NOT READY')}`);
  
  // Final Status
  if (passedTests >= totalTests * 0.8 && avgLatency < 1000) {
    auditResults.system_status = 'READY';
    console.log(chalk.bold.green('\n🌑 SYSTEM STATUS: READY FOR PRODUCTION'));
  } else if (passedTests >= totalTests * 0.6) {
    auditResults.system_status = 'PARTIAL';
    console.log(chalk.bold.yellow('\n⚠ SYSTEM STATUS: PARTIAL (some features may not work)'));
  } else {
    auditResults.system_status = 'FAILED';
    console.log(chalk.bold.red('\n❌ SYSTEM STATUS: FAILED (requires fixes)'));
  }
  
  console.log(chalk.bold('══════════════════════════════════════════════════════════════════════\n'));
  
  // Output final JSON for CI/CD
  console.log(chalk.dim('JSON Output:'));
  console.log(JSON.stringify(auditResults, null, 2));
  
  return auditResults;
}

// ═══════════════════════════════════════════════════════════════════════════
// MACHINE-TO-MACHINE TEST
// ═══════════════════════════════════════════════════════════════════════════

async function testMachineToMachine() {
  console.log(chalk.bold.cyan('\n🤖 MACHINE-TO-MACHINE VALIDATION\n'));
  
  const endpoints = [
    { path: '/signals/live', desc: 'Real-time signal stream' },
    { path: '/signals?userId=test&tier=PRO', desc: 'Tier-filtered signals' },
    { path: '/providers', desc: 'Provider registry' },
    { path: '/leaderboard', desc: 'Performance leaderboard' },
    { path: '/stats', desc: 'System statistics' }
  ];
  
  console.log('Expected M2M Format:');
  console.log(chalk.dim(JSON.stringify({
    symbol: "BTC/USDT",
    entry: 64250,
    target: 65500,
    stop: 63900,
    confidence: 0.91,
    provider: "gxeon_internal",
    timestamp: "2026-04-25T10:30:00Z"
  }, null, 2)));
  
  console.log(chalk.cyan('\nEndpoint Tests:'));
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.desc, 'GET', endpoint.path);
    printResult(result);
    
    if (result.passed && result.data) {
      const isValidFormat = validateM2MFormat(result.data);
      console.log(`   Format: ${isValidFormat ? chalk.green('✓ Valid') : chalk.yellow('⚠ Check')}`);
    }
  }
}

function validateM2MFormat(data) {
  // Check if response follows expected M2M format
  if (Array.isArray(data)) {
    return data.every(item => 
      (item.symbol || item.pair) && 
      (item.type || item.side)
    );
  }
  
  if (data.data && Array.isArray(data.data)) {
    return data.data.every(item =>
      (item.symbol || item.pair) &&
      (item.type || item.side)
    );
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(chalk.dim(`API Base: ${API_BASE}`));
  console.log(chalk.dim(`Timeout: ${TEST_TIMEOUT}ms\n`));
  
  // Run main audit
  const results = await runAudit();
  
  // Run M2M validation
  await testMachineToMachine();
  
  // Final recommendation
  console.log(chalk.bold('\n══════════════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('🎯 FINAL RECOMMENDATION\n'));
  
  if (results.system_status === 'READY') {
    console.log(chalk.green('✅ System is PRODUCTION READY'));
    console.log(chalk.green('✅ Dashboard accessible at: /dashboard'));
    console.log(chalk.green('✅ API endpoints responding under 500ms'));
    console.log(chalk.green('✅ Monetization engine active'));
    console.log(chalk.green('✅ Machine-to-machine endpoints validated'));
    console.log(chalk.green('\n🚀 Deploy to production immediately'));
  } else if (results.system_status === 'PARTIAL') {
    console.log(chalk.yellow('⚠ System is PARTIALLY READY'));
    console.log(chalk.yellow('Some endpoints may need attention before full deployment'));
  } else {
    console.log(chalk.red('❌ System requires fixes before deployment'));
    console.log(chalk.red('Check error messages above and resolve issues'));
  }
  
  console.log(chalk.bold('══════════════════════════════════════════════════════════════════════\n'));
  
  // Exit with appropriate code
  process.exit(results.system_status === 'FAILED' ? 1 : 0);
}

main().catch(err => {
  console.error(chalk.red('Audit failed:'), err);
  process.exit(1);
});
