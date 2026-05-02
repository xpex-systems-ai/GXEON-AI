/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 AGENT SEED ENGINE v1.0
 * Auto-generate agents to simulate demand and force paywall hits
 * Author: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app';

// Configuration
const CONFIG = {
  AGENT_COUNT: 10, // REDUCED: Test with fewer first
  CONCURRENT_BATCHES: 2, // REDUCED: Less parallel
  DELAY_BETWEEN_BATCHES: 3000, // INCREASED: Wait for cold start
  REQUEST_TIMEOUT: 30000, // 30s timeout for Railway cold starts
  RETRIES: 3, // Retry failed requests
  TIERS: ['BASIC', 'PRO', 'ENTERPRISE'],
  TIER_WEIGHTS: [0.7, 0.25, 0.05]
};

const AGENT_NAMES = [
  'AlphaBot', 'BetaTrade', 'GammaAI', 'DeltaFlow', 'EpsilonX',
  'ZetaCore', 'EtaVision', 'ThetaMind', 'IotaSignal', 'KappaPulse',
  'LambdaWave', 'MuStream', 'NuStream', 'XiBot', 'OmicronAI',
  'PiTrader', 'RhoSignal', 'SigmaFlow', 'TauMind', 'UpsilonBot',
  'PhiVision', 'ChiCore', 'PsiTrade', 'OmegaAI', 'NexusBot',
  'QuantumX', 'NeuralFlow', 'CryptoMind', 'TradeAI', 'SignalBot',
  'MarketPulse', 'TrendAI', 'PriceBot', 'VolumeX', 'MomentumAI',
  'ArbitrageBot', 'HedgeAI', 'RiskBot', 'ProfitX', 'YieldAI',
  'DeFiBot', 'SwapAI', 'PoolX', 'StakeBot', 'FarmAI',
  'LendBot', 'BorrowAI', 'VaultX', 'TreasuryAI', 'SovereignBot'
];

function generateEmail(name) {
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com', 'gxeon.ai'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const random = Math.floor(Math.random() * 10000);
  return `${name.toLowerCase()}${random}@${domain}`;
}

function selectTier() {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < CONFIG.TIER_WEIGHTS.length; i++) {
    cumulative += CONFIG.TIER_WEIGHTS[i];
    if (rand <= cumulative) {
      return CONFIG.TIERS[i];
    }
  }
  return 'BASIC';
}

async function registerAgent(name, tier, retries = CONFIG.RETRIES) {
  const email = generateEmail(name);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   � ${name} retry ${attempt}/${retries}...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log(`   �📝 Registering ${name} (${email})...`);
      }
      
      const response = await axios.post(`${API_BASE}/v1/register`, {
        email: email,
        name: name,
        tier: tier
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: CONFIG.REQUEST_TIMEOUT,
        validateStatus: () => true
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`   ✅ ${name} created: ${response.data.actor?.code}`);
        return {
          success: true,
          name: name,
          email: email,
          tier: tier,
          actorCode: response.data.actor?.code,
          apiKey: response.data.credentials?.api_key,
          pixCode: response.data.payment?.pix_copy_paste,
          amount: response.data.payment?.amount,
          transactionId: response.data.payment?.transaction_id
        };
      } else if (response.status === 404) {
        console.log(`   ❌ ${name}: Endpoint not found (404)`);
        return {
          success: false,
          name: name,
          email: email,
          tier: tier,
          error: `HTTP 404: Endpoint /v1/register not found`
        };
      } else {
        console.log(`   ❌ ${name}: HTTP ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}`);
        if (attempt === retries) {
          return {
            success: false,
            name: name,
            email: email,
            tier: tier,
            error: `HTTP ${response.status}: ${response.data?.error || 'Unknown'}`
          };
        }
      }
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message.includes('timeout');
      const errorMsg = isTimeout ? `TIMEOUT after ${CONFIG.REQUEST_TIMEOUT}ms` : err.message;
      
      if (attempt === retries) {
        console.log(`   ❌ ${name} failed after ${retries} attempts: ${errorMsg}`);
        return {
          success: false,
          name: name,
          email: email,
          tier: tier,
          error: errorMsg
        };
      } else {
        console.log(`   ⚠️ ${name} attempt ${attempt} failed: ${errorMsg}, retrying...`);
      }
    }
  }
}

async function seedAgents() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🤖 AGENT SEED ENGINE v1.0                                 ║');
  console.log(`║     Target: ${API_BASE.padEnd(46)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Configuration:`);
  console.log(`   Agents to create: ${CONFIG.AGENT_COUNT}`);
  console.log(`   Concurrent batches: ${CONFIG.CONCURRENT_BATCHES}`);
  console.log(`   Tier distribution: BASIC 70% | PRO 25% | ENTERPRISE 5%\n`);
  
  const results = {
    successful: [],
    failed: [],
    byTier: { BASIC: 0, PRO: 0, ENTERPRISE: 0 },
    totalValue: 0
  };
  
  // Process in batches
  const batches = Math.ceil(CONFIG.AGENT_COUNT / CONFIG.CONCURRENT_BATCHES);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(
      CONFIG.CONCURRENT_BATCHES,
      CONFIG.AGENT_COUNT - (batch * CONFIG.CONCURRENT_BATCHES)
    );
    
    const batchPromises = [];
    for (let i = 0; i < batchSize; i++) {
      const agentIndex = batch * CONFIG.CONCURRENT_BATCHES + i;
      const name = AGENT_NAMES[agentIndex % AGENT_NAMES.length] + `_${agentIndex}`;
      const tier = selectTier();
      batchPromises.push(registerAgent(name, tier));
    }
    
    console.log(`🚀 Batch ${batch + 1}/${batches} - Creating ${batchSize} agents...`);
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    batchResults.forEach(result => {
      if (result.success) {
        results.successful.push(result);
        results.byTier[result.tier]++;
        results.totalValue += result.amount || 0;
      } else {
        results.failed.push(result);
      }
    });
    
    // Progress
    const progress = Math.min(((batch + 1) * CONFIG.CONCURRENT_BATCHES / CONFIG.AGENT_COUNT) * 100, 100);
    console.log(`   ✅ ${results.successful.length} successful | ❌ ${results.failed.length} failed | 📊 ${progress.toFixed(1)}%\n`);
    
    // Delay between batches
    if (batch < batches - 1) {
      await new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_BATCHES));
    }
  }
  
  // Final Report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SEEDING COMPLETE - FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Successfully created: ${results.successful.length} agents`);
  console.log(`❌ Failed: ${results.failed.length} agents`);
  console.log(`\n📈 By Tier:`);
  console.log(`   BASIC: ${results.byTier.BASIC}`);
  console.log(`   PRO: ${results.byTier.PRO}`);
  console.log(`   ENTERPRISE: ${results.byTier.ENTERPRISE}`);
  console.log(`\n💰 Total potential revenue: R$ ${results.totalValue.toFixed(2)}`);
  
  if (results.successful.length > 0) {
    console.log(`\n📋 Sample created agents:`);
    results.successful.slice(0, 5).forEach(agent => {
      console.log(`   • ${agent.name} (${agent.tier}) - ${agent.actorCode} - R$ ${agent.amount}`);
    });
    
    // Save to file
    const fs = await import('fs');
    const seedData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: results,
      summary: {
        totalAgents: results.successful.length,
        totalValue: results.totalValue,
        conversionPotential: results.totalValue * 0.3 // Estimated 30% conversion
      }
    };
    
    const filename = `seed_results_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(seedData, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 NEXT STEPS:');
  console.log('   1. Agents created with PIX pending');
  console.log('   2. Simulate payments via /webhook/mercadopago');
  console.log('   3. Monitor conversion in /v1/admin/metrics');
  console.log('   4. Force paywall hits by calling /v1/signals');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return results;
}

// Run
seedAgents().catch(console.error);
