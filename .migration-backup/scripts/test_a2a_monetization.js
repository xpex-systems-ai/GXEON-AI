/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 A2A MONETIZATION TEST SUITE v1.0
 * Author: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app',
  TEST_EMAIL: `test-a2a-${Date.now()}@gxeon.ai`,
  TEST_TIER: 'BASIC'
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════
async function runTests() {
  console.log('\n🧪 [A2A] === MONETIZATION TEST SUITE ===\n');
  
  let testResults = {
    registration: false,
    signals_no_auth: false,
    signals_with_auth: false,
    actor_status: false,
    upgrade: false
  };
  
  let apiKey = null;
  let actorCode = null;
  let transactionId = null;
  
  // Test 1: Register Agent
  console.log('📋 Test 1: Agent Registration');
  try {
    const response = await axios.post(`${CONFIG.API_BASE}/v1/register-agent`, {
      email: CONFIG.TEST_EMAIL,
      name: 'Test Agent A2A',
      tier: CONFIG.TEST_TIER
    });
    
    console.log('✅ Registration success:', response.data.success);
    console.log('   Actor Code:', response.data.actor?.code);
    console.log('   API Key:', response.data.credentials?.api_key?.slice(0, 20) + '...');
    console.log('   Payment Required:', response.data.payment?.amount);
    
    apiKey = response.data.credentials?.api_key;
    actorCode = response.data.actor?.code;
    transactionId = response.data.payment?.transaction_id;
    testResults.registration = true;
    
  } catch (err) {
    console.log('❌ Registration failed:', err.response?.data || err.message);
  }
  
  // Test 2: Try signals WITHOUT auth (should fail)
  console.log('\n🔒 Test 2: Signals without API Key (expect 401)');
  try {
    await axios.get(`${CONFIG.API_BASE}/v1/signals`);
    console.log('❌ Should have failed with 401');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ Correctly blocked: API Key required');
      testResults.signals_no_auth = true;
    } else {
      console.log('❌ Wrong error:', err.response?.status);
    }
  }
  
  // Test 3: Try signals with INACTIVE API Key (should fail until payment)
  console.log('\n💳 Test 3: Signals with inactive API Key (expect 401)');
  try {
    await axios.get(`${CONFIG.API_BASE}/v1/signals`, {
      headers: { 'x-api-key': apiKey }
    });
    console.log('❌ Should have failed - not activated yet');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ Correctly blocked: Payment required first');
      testResults.signals_inactive = true;
    } else {
      console.log('⚠️ Response:', err.response?.data);
    }
  }
  
  // Test 4: Upgrade endpoint
  console.log('\n⬆️ Test 4: Upgrade endpoint');
  try {
    const response = await axios.post(`${CONFIG.API_BASE}/v1/upgrade`, {
      actor_code: actorCode,
      target_tier: 'PRO'
    });
    
    console.log('✅ Upgrade request success');
    console.log('   Target:', response.data.actor?.target_tier);
    console.log('   Price:', response.data.payment?.amount);
    testResults.upgrade = true;
    
  } catch (err) {
    console.log('⚠️ Upgrade test:', err.response?.data || err.message);
  }
  
  // Summary
  console.log('\n📊 === TEST RESULTS ===');
  Object.entries(testResults).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  const passed = Object.values(testResults).filter(v => v).length;
  const total = Object.keys(testResults).length;
  
  console.log(`\n🎯 Score: ${passed}/${total} tests passed`);
  console.log('\n💡 Next steps:');
  console.log('   1. Complete payment via PIX to activate');
  console.log('   2. Webhook will auto-activate agent');
  console.log('   3. Use API key to consume signals');
  console.log('   4. Telegram bot will send signals automatically');
}

// Run tests
runTests().catch(console.error);
