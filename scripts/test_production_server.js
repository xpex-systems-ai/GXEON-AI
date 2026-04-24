#!/usr/bin/env node
/**
 * Teste rápido do servidor de produção
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const DELAY = (ms) => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log('\n🧪 GXEON Production Server Tests\n');
  
  // Test 1: Health check
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health: ${res.status} ${res.data}`);
  } catch (err) {
    console.log(`❌ Health: ${err.message}`);
    console.log('   Server may not be running');
    return;
  }
  
  // Test 2: Stats (public)
  try {
    const res = await axios.get(`${BASE_URL}/v1/signals/stats`);
    console.log(`✅ Stats: ${res.status}`);
    console.log(`   Signals: ${res.data.stats?.active_signals}`);
    console.log(`   API Keys: ${res.data.stats?.total_api_keys}`);
  } catch (err) {
    console.log(`❌ Stats: ${err.message}`);
  }
  
  // Test 3: Pricing (public)
  try {
    const res = await axios.get(`${BASE_URL}/v1/signals/pricing`);
    console.log(`✅ Pricing: ${res.status}`);
    console.log(`   Price: $${res.data.pricing?.per_signal_usd}/signal`);
  } catch (err) {
    console.log(`❌ Pricing: ${err.message}`);
  }
  
  // Test 4: Register new user
  let apiKey;
  try {
    const res = await axios.post(`${BASE_URL}/v1/register`, {
      email: `test_${Date.now()}@gxeon.ai`,
      tier: 'PRO'
    });
    apiKey = res.data.api_key;
    console.log(`✅ Register: ${res.status}`);
    console.log(`   API Key: ${apiKey?.substring(0, 20)}...`);
    console.log(`   Tier: ${res.data.tier}`);
  } catch (err) {
    console.log(`❌ Register: ${err.message}`);
  }
  
  // Test 5: Signals without auth (should fail)
  try {
    await axios.get(`${BASE_URL}/v1/signals`);
    console.log(`❌ Signals (no auth): Should have returned 401!`);
  } catch (err) {
    if (err.response?.status === 401) {
      console.log(`✅ Signals (no auth): 401 - Correct`);
    } else {
      console.log(`❌ Signals (no auth): ${err.message}`);
    }
  }
  
  // Test 6: Signals with auth
  if (apiKey) {
    try {
      const res = await axios.get(`${BASE_URL}/v1/signals`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log(`✅ Signals (auth): ${res.status}`);
      console.log(`   Count: ${res.data.signals?.length || 0}`);
    } catch (err) {
      console.log(`❌ Signals (auth): ${err.message}`);
    }
  }
  
  // Test 7: Status
  try {
    const res = await axios.get(`${BASE_URL}/v1/status`);
    console.log(`✅ Status: ${res.status}`);
    console.log(`   Version: ${res.data.version}`);
    console.log(`   Treasury: ${res.data.treasury?.substring(0, 20)}...`);
  } catch (err) {
    console.log(`❌ Status: ${err.message}`);
  }
  
  console.log('\n🎉 Tests completed!\n');
}

runTests().catch(console.error);
