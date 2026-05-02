/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 A2A MONETIZATION - FULL VALIDATION SUITE v1.0
 * Production-Grade End-to-End Testing
 * Author: Comandante Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app',
  SUPABASE_URL: process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TEST_EMAIL: `validation-test-${Date.now()}@gxeon.ai`,
  TEST_NAME: 'GX Validation Agent'
};

// Initialize Supabase
const supabase = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY 
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY)
  : null;

// Test State
let testState = {
  actorCode: null,
  apiKey: null,
  transactionId: null,
  testResults: {}
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: RESET TEST STATE
// ═══════════════════════════════════════════════════════════════════════════
async function resetTestState() {
  console.log('\n🧹 STEP 1: Resetting Test State\n');
  
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping DB cleanup');
    return true;
  }
  
  try {
    // Clean test actors
    const { data: testActors, error: findError } = await supabase
      .from('actors')
      .select('id, code')
      .ilike('email', '%test%@gxeon.ai');
    
    if (testActors && testActors.length > 0) {
      console.log(`   Found ${testActors.length} test actors to clean`);
      
      for (const actor of testActors) {
        // Clean related records
        await supabase.from('api_usage_logs').delete().eq('actor_id', actor.id);
        await supabase.from('commissions').delete().eq('actor_id', actor.id);
        await supabase.from('transactions').delete().eq('actor_code', actor.code);
        await supabase.from('actor_wallets').delete().eq('actor_id', actor.id);
        await supabase.from('actors').delete().eq('id', actor.id);
      }
      console.log('   ✅ Test actors cleaned');
    } else {
      console.log('   ℹ️  No test actors found');
    }
    
    // Clean test transactions (orphaned)
    const { data: testTxs } = await supabase
      .from('transactions')
      .select('id')
      .ilike('actor_code', 'GX%')
      .lt('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
    
    if (testTxs && testTxs.length > 0) {
      await supabase.from('transactions').delete().in('id', testTxs.map(t => t.id));
      console.log(`   ✅ ${testTxs.length} old test transactions cleaned`);
    }
    
    return true;
  } catch (err) {
    console.error('   ❌ Reset failed:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: AGENT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════
async function simulateAgentRegistration() {
  console.log('\n📝 STEP 2: Simulating Agent Registration\n');
  
  try {
    const response = await axios.post(`${CONFIG.API_BASE}/v1/register-agent`, {
      email: CONFIG.TEST_EMAIL,
      name: CONFIG.TEST_NAME,
      tier: 'BASIC'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    const data = response.data;
    
    // Validate response
    const checks = {
      success: data.success === true,
      actorCreated: !!data.actor?.code,
      transactionCreated: !!data.payment?.transaction_id,
      apiKeyGenerated: !!data.credentials?.api_key,
      pendingStatus: data.actor?.status === 'pending_payment',
      amountSet: data.payment?.amount === 29.90
    };
    
    console.log('   ✅ Response received');
    console.log('   📧 Email:', data.actor?.email);
    console.log('   🏷️  Actor Code:', data.actor?.code);
    console.log('   💰 Amount: R$', data.payment?.amount);
    console.log('   🔑 API Key (masked):', data.credentials?.api_key?.slice(0, 15) + '...');
    
    // Store state
    testState.actorCode = data.actor?.code;
    testState.apiKey = data.credentials?.api_key;
    testState.transactionId = data.payment?.transaction_id;
    
    // Verify all checks
    const allPassed = Object.values(checks).every(v => v);
    console.log('   📊 Checks:', allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`      ${passed ? '✅' : '❌'} ${check}`);
    });
    
    testState.testResults.registration = allPassed;
    return allPassed;
    
  } catch (err) {
    console.error('   ❌ Registration failed:', err.message);
    if (err.response) {
      console.error('   Response:', err.response.data);
    }
    testState.testResults.registration = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: FORCE PAYMENT APPROVAL
// ═══════════════════════════════════════════════════════════════════════════
async function forcePaymentApproval() {
  console.log('\n💳 STEP 3: Forcing Payment Approval\n');
  
  if (!supabase) {
    console.log('⚠️  Supabase not configured, cannot force payment');
    return false;
  }
  
  try {
    // Update transaction to paid
    const { error: txError } = await supabase
      .from('transactions')
      .update({
        status: 'PAID',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testState.transactionId);
    
    if (txError) {
      throw new Error(`Transaction update failed: ${txError.message}`);
    }
    console.log('   ✅ Transaction marked as PAID');
    
    // Update actor to active
    const { error: actorError } = await supabase
      .from('actors')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('code', testState.actorCode);
    
    if (actorError) {
      throw new Error(`Actor activation failed: ${actorError.message}`);
    }
    console.log('   ✅ Actor activated');
    
    // Verify in database
    const { data: actor } = await supabase
      .from('actors')
      .select('*')
      .eq('code', testState.actorCode)
      .single();
    
    console.log('   📊 Verification:');
    console.log(`      Status: ${actor.status}`);
    console.log(`      API Key: ${actor.api_key?.slice(0, 20)}...`);
    console.log(`      Tier: ${actor.tier}`);
    
    const verified = actor.status === 'active' && actor.api_key;
    testState.testResults.activation = verified;
    return verified;
    
  } catch (err) {
    console.error('   ❌ Activation failed:', err.message);
    testState.testResults.activation = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: VALIDATE AGENT AUTH
// ═══════════════════════════════════════════════════════════════════════════
async function validateAgentAuth() {
  console.log('\n🔐 STEP 4: Validating Agent Authentication\n');
  
  try {
    const response = await axios.get(`${CONFIG.API_BASE}/v1/agent/status`, {
      headers: { 'X-API-Key': testState.apiKey },
      timeout: 5000
    });
    
    const data = response.data;
    
    console.log('   ✅ Auth successful');
    console.log('   📊 Status:', data.actor?.status);
    console.log('   📊 Tier:', data.actor?.tier);
    console.log('   📊 Quota:', JSON.stringify(data.quota));
    
    const checks = {
      authenticated: true,
      statusActive: data.actor?.status === 'active',
      tierBasic: data.actor?.tier === 'BASIC',
      quotaAvailable: data.quota?.daily_limit > 0
    };
    
    const allPassed = Object.values(checks).every(v => v);
    console.log('   📊 Checks:', allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED');
    
    testState.testResults.auth = allPassed;
    return allPassed;
    
  } catch (err) {
    console.error('   ❌ Auth validation failed:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Response:', err.response.data);
    }
    testState.testResults.auth = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: VALIDATE SIGNAL CONSUMPTION
// ═══════════════════════════════════════════════════════════════════════════
async function validateSignalConsumption() {
  console.log('\n📡 STEP 5: Validating Signal Consumption\n');
  
  try {
    const response = await axios.get(`${CONFIG.API_BASE}/v1/signals?limit=3`, {
      headers: { 'X-API-Key': testState.apiKey },
      timeout: 5000
    });
    
    const data = response.data;
    
    console.log('   ✅ Signals received');
    console.log('   📊 Count:', data.count);
    console.log('   📊 Actor:', data.actor?.code);
    console.log('   📊 Latency:', data.meta?.response_latency_ms, 'ms');
    
    if (data.signals && data.signals.length > 0) {
      console.log('\n   📡 Sample Signal:');
      const s = data.signals[0];
      console.log(`      Pair: ${s.pair}`);
      console.log(`      Type: ${s.type}`);
      console.log(`      Entry: ${s.entry}`);
      console.log(`      TP: ${s.take_profit}`);
      console.log(`      SL: ${s.stop_loss}`);
      console.log(`      Confidence: ${(s.confidence * 100).toFixed(1)}%`);
    }
    
    const checks = {
      signalsReturned: data.signals && data.signals.length > 0,
      countMatches: data.count === data.signals?.length,
      hasMetadata: !!data.meta,
      actorInfo: !!data.actor
    };
    
    const allPassed = Object.values(checks).every(v => v);
    console.log('\n   📊 Checks:', allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED');
    
    testState.testResults.signals = allPassed;
    return allPassed;
    
  } catch (err) {
    console.error('   ❌ Signal consumption failed:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Response:', err.response.data);
    }
    testState.testResults.signals = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: VALIDATE DATABASE INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════
async function validateDatabaseIntegrity() {
  console.log('\n🗄️  STEP 6: Validating Database Integrity\n');
  
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping DB validation');
    return true;
  }
  
  try {
    // Check transactions
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('actor_code', testState.actorCode)
      .single();
    
    console.log('   ✅ Transaction record');
    console.log(`      Status: ${tx.status}`);
    console.log(`      Amount: R$ ${tx.amount}`);
    
    // Check actor
    const { data: actor } = await supabase
      .from('actors')
      .select('*')
      .eq('code', testState.actorCode)
      .single();
    
    console.log('   ✅ Actor record');
    console.log(`      Status: ${actor.status}`);
    console.log(`      API Key: ${actor.api_key?.slice(0, 20)}...`);
    
    // Check wallet
    const { data: wallet } = await supabase
      .from('actor_wallets')
      .select('*')
      .eq('actor_id', actor.id)
      .single();
    
    console.log('   ✅ Wallet record');
    console.log(`      Balance: R$ ${wallet?.balance || 0}`);
    
    const verified = tx.status === 'PAID' && actor.status === 'active' && actor.api_key;
    testState.testResults.database = verified;
    return verified;
    
  } catch (err) {
    console.error('   ❌ DB validation failed:', err.message);
    testState.testResults.database = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: VALIDATE ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════
async function validateErrorHandling() {
  console.log('\n🛡️  STEP 7: Validating Error Handling\n');
  
  const errors = {
    invalidKey: false,
    noKey: false
  };
  
  // Test 1: Invalid API Key
  try {
    await axios.get(`${CONFIG.API_BASE}/v1/signals`, {
      headers: { 'X-API-Key': 'invalid_key_xyz' },
      timeout: 5000
    });
    console.log('   ❌ Invalid key should have failed');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('   ✅ Invalid key correctly rejected (401)');
      errors.invalidKey = true;
    } else {
      console.log('   ⚠️  Invalid key error:', err.response?.status);
    }
  }
  
  // Test 2: No API Key
  try {
    await axios.get(`${CONFIG.API_BASE}/v1/signals`, {
      timeout: 5000
    });
    console.log('   ❌ Missing key should have failed');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('   ✅ Missing key correctly rejected (401)');
      errors.noKey = true;
    } else {
      console.log('   ⚠️  Missing key error:', err.response?.status);
    }
  }
  
  const allPassed = Object.values(errors).every(v => v);
  testState.testResults.errors = allPassed;
  return allPassed;
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════
function generateFinalReport() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 A2A MONETIZATION - FINAL VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const results = testState.testResults;
  
  console.log('TEST RESULTS:');
  console.log(`   ${results.registration ? '✅' : '❌'} Agent Registration`);
  console.log(`   ${results.activation ? '✅' : '❌'} Payment & Activation`);
  console.log(`   ${results.auth ? '✅' : '❌'} Agent Authentication`);
  console.log(`   ${results.signals ? '✅' : '❌'} Signal Consumption`);
  console.log(`   ${results.database ? '✅' : '❌'} Database Integrity`);
  console.log(`   ${results.errors ? '✅' : '❌'} Error Handling`);
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\n🎯 OVERALL: ${passed}/${total} (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('\n✅ SYSTEM FULLY OPERATIONAL');
    console.log('🚀 Ready for production agent consumption');
  } else if (percentage >= 80) {
    console.log('\n⚠️  SYSTEM MOSTLY OPERATIONAL');
    console.log('🔧 Minor issues detected');
  } else {
    console.log('\n❌ SYSTEM NOT READY');
    console.log('🔧 Critical issues need fixing');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST DATA:');
  console.log(`   Email: ${CONFIG.TEST_EMAIL}`);
  console.log(`   Actor Code: ${testState.actorCode}`);
  console.log(`   API Key: ${testState.apiKey?.slice(0, 25)}...`);
  console.log(`   Transaction ID: ${testState.transactionId}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return {
    success: percentage === 100,
    passed,
    total,
    percentage,
    testData: {
      email: CONFIG.TEST_EMAIL,
      actorCode: testState.actorCode,
      apiKey: testState.apiKey,
      transactionId: testState.transactionId
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🌐 A2A MONETIZATION - FULL VALIDATION SUITE v1.0          ║');
  console.log('║     Production-Grade End-to-End Testing                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  // Run all steps
  await resetTestState();
  await simulateAgentRegistration();
  
  if (testState.actorCode && testState.apiKey) {
    await forcePaymentApproval();
    await validateAgentAuth();
    await validateSignalConsumption();
    await validateDatabaseIntegrity();
    await validateErrorHandling();
  } else {
    console.log('\n❌ Cannot continue without successful registration');
  }
  
  // Generate report
  const report = generateFinalReport();
  
  // Exit code based on success
  process.exit(report.success ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

// Run
main();
