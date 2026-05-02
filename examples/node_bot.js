#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 GXEON Node.js Bot Example - Free Crypto Signals API
 * Author: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This bot demonstrates how to consume GXEON signals API.
 * FREE TIER: Limited signals (delayed data, 30/day)
 * PAID TIER: Real-time signals with full details
 * 
 * Usage:
 *     node node_bot.js              # Run free tier
 *     node node_bot.js --upgrade    # Show upgrade info
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

// Configuration
const API_BASE = 'https://gxeon-core.up.railway.app';
const FREE_ENDPOINT = `${API_BASE}/v1/signals/free`;
const PAID_ENDPOINT = `${API_BASE}/v1/signals`;

/**
 * Get free signals (limited, delayed)
 */
async function getFreeSignals() {
  try {
    console.log('🔍 Fetching free signals...');
    const response = await axios.get(FREE_ENDPOINT, { timeout: 30000 });
    
    console.log(`✅ Received ${response.data.count} signals\n`);
    return response.data;
    
  } catch (err) {
    if (err.response?.status === 429) {
      console.log(`⚠️ Rate limit reached: ${err.response.data?.message}`);
      console.log(`💡 Upgrade at: ${err.response.data?.upgrade_url}`);
    } else if (err.response?.status === 402) {
      console.log('💎 PAYWALL: Payment required for this endpoint');
      console.log(`   Amount: R$ ${err.response.data?.payment?.amount}`);
      console.log(`   PIX: ${err.response.data?.payment?.pix_copy_paste?.substring(0, 50)}...`);
    } else {
      console.log(`❌ Error: ${err.message}`);
    }
    return null;
  }
}

/**
 * Get paid signals (requires API key)
 */
async function getPaidSignals(apiKey) {
  try {
    console.log('🔍 Fetching real-time signals...');
    const response = await axios.get(PAID_ENDPOINT, {
      headers: { 'X-API-Key': apiKey },
      timeout: 30000
    });
    
    console.log(`✅ Received ${response.data.count} real-time signals\n`);
    return response.data;
    
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('❌ Invalid or missing API key');
    } else if (err.response?.status === 402) {
      console.log('💎 PAYWALL: Payment required');
      const payment = err.response.data?.payment;
      if (payment) {
        console.log(`   Amount: R$ ${payment.amount}`);
        console.log(`   Transaction: ${payment.transaction_id}`);
        console.log(`   PIX QR Code: ${payment.pix_qr_code?.substring(0, 50)}...`);
      }
    } else {
      console.log(`❌ Error: ${err.message}`);
    }
    return null;
  }
}

/**
 * Display signals in readable format
 */
function displaySignals(data) {
  if (!data || !data.signals) {
    console.log('No signals to display');
    return;
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CRYPTO SIGNALS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  data.signals.forEach((signal, i) => {
    console.log(`Signal #${i + 1}`);
    console.log(`  Pair:       ${signal.pair || 'N/A'}`);
    console.log(`  Type:       ${signal.type || 'N/A'}`);
    console.log(`  Entry:      ${signal.entry || 'LOCKED'}`);
    console.log(`  Confidence: ${signal.confidence || 'N/A'}`);
    
    if (signal.locked) {
      console.log('  ⚠️  Targets: LOCKED (upgrade to view)');
      console.log('  ⚠️  Stop Loss: LOCKED (upgrade to view)');
    } else {
      console.log(`  Targets:    ${JSON.stringify(signal.targets) || 'N/A'}`);
      console.log(`  Stop Loss:  ${signal.stop_loss || 'N/A'}`);
    }
    
    console.log(`  Message:    ${signal.message || ''}`);
    console.log();
  });
  
  // Show rate limit info
  if (data.rate_limit) {
    console.log(`📈 Rate Limit: ${data.rate_limit.remaining} remaining (used ${data.rate_limit.total}/30 today)`);
  }
  
  // Show upgrade info for free tier
  if (data.upgrade) {
    console.log('\n💎 UPGRADE TO REAL-TIME:');
    console.log(`   URL: ${data.upgrade.url}`);
    console.log('   Tiers: BASIC (R$ 29.90), PRO (R$ 99.90), ENTERPRISE (R$ 299.90)');
    console.log(`   Benefits: ${data.upgrade.benefits?.join(', ')}`);
  }
}

/**
 * Show upgrade information
 */
function showUpgradeInfo() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
💎 UPGRADE TO REAL-TIME SIGNALS
═══════════════════════════════════════════════════════════════════════════════

PAID TIERS:
  • BASIC      - R$ 29.90  - 10 signals/day, full details
  • PRO        - R$ 99.90  - 100 signals/day, real-time, API access
  • ENTERPRISE - R$ 299.90 - 1000 signals/day, dedicated support

HOW TO UPGRADE:
  1. Register: POST ${API_BASE}/v1/register-agent
     Body: {"email": "your@email.com", "name": "Your Bot", "tier": "BASIC"}
  
  2. Pay via PIX (you'll receive qr_code in response)
  
  3. Get activated automatically after payment confirmation

EXAMPLE UPGRADE REQUEST:

curl -X POST ${API_BASE}/v1/register-agent \\
  -H "Content-Type: application/json" \\
  -d '{"email": "bot@example.com", "name": "MyBot", "tier": "BASIC"}'

JAVASCRIPT UPGRADE:

const axios = require('axios');
const response = await axios.post('${API_BASE}/v1/register-agent', {
  email: 'bot@example.com',
  name: 'MyBot',
  tier: 'BASIC'
});

console.log('PIX QR Code:', response.data.payment.pix_qr_code);
console.log('API Key (will activate after payment):', response.data.credentials.api_key);
`);
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     📡 GXEON Node.js Bot                                      ║');
  console.log('║     Free Crypto Signals API                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Check for upgrade flag
  if (process.argv.includes('--upgrade') || process.argv.includes('-u')) {
    showUpgradeInfo();
    return;
  }
  
  // Check for API key (paid tier)
  const apiKey = process.argv.find(arg => arg.startsWith('--api-key='))?.split('=')[1];
  
  if (apiKey) {
    // Paid tier
    const data = await getPaidSignals(apiKey);
    if (data) displaySignals(data);
  } else {
    // Free tier
    const data = await getFreeSignals();
    if (data) displaySignals(data);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💡 Run with --upgrade to see upgrade information');
  console.log('💡 Run with --api-key=YOUR_KEY for paid tier');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run
main().catch(console.error);
