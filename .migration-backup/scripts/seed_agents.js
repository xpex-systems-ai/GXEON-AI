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

// Configuration - TOTAL MONETIZATION SWARM v2.0
const CONFIG = {
  AGENT_COUNT: 300, // SWARM MODE: 300 agents
  CONCURRENT_BATCHES: 10, // Increased parallel processing
  DELAY_BETWEEN_BATCHES: 3000, // 3s between batches
  REQUEST_TIMEOUT: 60000, // 60s timeout (Railway cold start)
  RETRIES: 3, // 3 retries max
  TIERS: ['BASIC', 'PRO', 'ENTERPRISE'],
  TIER_WEIGHTS: [0.7, 0.25, 0.05],
  MODE: 'TOTAL_MONETIZATION_SWARM', // SWARM LIVE MODE
  PIX_AUTO_PAY: false,
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224',
  // BEHAVIOR LOOP CONFIG
  BEHAVIOR: {
    HIT_FREE_ENDPOINT: true,      // Agents test /v1/signals/free
    EXCEED_LIMIT: true,           // Agents exceed rate limit to trigger 429
    TRIGGER_PAYWALL: true,        // Agents try /v1/signals to trigger 402
    PAYWALL_HITS_PER_AGENT: 5     // Each agent triggers paywall 5 times
  }
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
  'LendBot', 'BorrowAI', 'VaultX', 'TreasuryAI', 'SovereignBot',
  // Extended for 300 agents
  'FluxBot', 'NexusAI', 'CryptoPulse', 'TradeStream', 'SignalX',
  'AlphaFlow', 'BetaMind', 'GammaTrade', 'DeltaCore', 'EpsilonAI',
  'ZetaPulse', 'EtaFlow', 'ThetaTrade', 'IotaAI', 'KappaCore',
  'LambdaBot', 'MuAI', 'NuTrade', 'XiFlow', 'OmicronCore',
  'PiMind', 'RhoAI', 'SigmaPulse', 'TauBot', 'UpsilonTrade',
  'PhiFlow', 'ChiMind', 'PsiAI', 'OmegaFlow', 'NexusPulse',
  'QuantumBot', 'NeuralAI', 'CryptoFlow', 'TradeMind', 'SignalCore',
  'MarketFlow', 'TrendPulse', 'PriceAI', 'VolumeMind', 'MomentumCore',
  'ArbitrageAI', 'HedgeFlow', 'RiskMind', 'ProfitAI', 'YieldFlow',
  'DeFiAI', 'SwapFlow', 'PoolMind', 'StakeAI', 'FarmFlow',
  'LendAI', 'BorrowFlow', 'VaultMind', 'TreasuryFlow', 'SovereignAI',
  'PulseBot', 'FlowAI', 'CoreTrade', 'MindSignal', 'StreamAI',
  'BotX', 'AIStream', 'TradePulse', 'SignalFlow', 'PulseAI',
  'MindBot', 'FlowTrade', 'CoreAI', 'StreamSignal', 'BotFlow',
  'AIPulse', 'TradeCore', 'SignalMind', 'PulseStream', 'FlowBot',
  'AICore', 'TradeMind', 'SignalAI', 'PulseFlow', 'StreamBot',
  'BotAI', 'CorePulse', 'MindTrade', 'FlowSignal', 'AIBot',
  'PulseCore', 'TradeStream', 'MindFlow', 'SignalCore', 'StreamAI',
  'BotPulse', 'AIMind', 'CoreFlow', 'TradeAI', 'SignalBot',
  'FlowCore', 'PulseTrade', 'StreamMind', 'BotSignal', 'AIFlow',
  'MindCore', 'TradePulse', 'SignalStream', 'FlowAI', 'BotMind',
  'CoreSignal', 'PulseBot', 'StreamTrade', 'AIMind', 'FlowBot',
  'TradeSignal', 'MindAI', 'PulseStream', 'CoreTrade', 'BotFlow',
  'SignalMind', 'StreamCore', 'AIPulse', 'TradeBot', 'FlowSignal',
  'MindTrade', 'PulseAI', 'CoreBot', 'StreamFlow', 'SignalAI',
  'BotCore', 'TradeMind', 'AIFlow', 'PulseSignal', 'MindBot',
  'FlowTrade', 'CoreAI', 'StreamPulse', 'BotMind', 'SignalFlow',
  'TradeCore', 'AIBot', 'MindStream', 'PulseTrade', 'FlowAI',
  'CoreSignal', 'BotPulse', 'TradeFlow', 'AIMind', 'StreamBot',
  'SignalCore', 'PulseMind', 'FlowAI', 'TradeBot', 'CoreStream',
  'MindPulse', 'BotTrade', 'AIFlow', 'SignalMind', 'PulseCore',
  'StreamTrade', 'FlowBot', 'CoreAI', 'MindSignal', 'TradePulse',
  'BotFlow', 'AICore', 'StreamMind', 'PulseBot', 'SignalTrade',
  'FlowMind', 'CoreBot', 'TradeAI', 'MindFlow', 'StreamCore',
  'PulseSignal', 'BotAI', 'AIPulse', 'TradeStream', 'MindBot',
  'FlowCore', 'SignalAI', 'CoreTrade', 'PulseMind', 'StreamFlow',
  'BotSignal', 'AIMind', 'TradeBot', 'FlowPulse', 'MindCore',
  'StreamTrade', 'SignalFlow', 'CoreAI', 'PulseBot', 'BotMind',
  'TradeSignal', 'AIFlow', 'MindStream', 'CorePulse', 'FlowBot',
  'SignalCore', 'PulseTrade', 'StreamAI', 'BotFlow', 'MindSignal',
  'TradeMind', 'AICore', 'FlowBot', 'PulseStream', 'SignalTrade',
  'BotPulse', 'MindAI', 'CoreFlow', 'StreamSignal', 'TradeCore',
  'FlowMind', 'BotAI', 'PulseCore', 'MindTrade', 'SignalBot',
  'StreamFlow', 'AIPulse', 'CoreBot', 'TradeMind', 'FlowSignal'
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
        console.log(`   � Registering ${name} (${email})...`);
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
        console.log(`   ✅ ${name} CREATED: ${response.data.actor?.code} | PIX: R$ ${response.data.payment?.amount}`);
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
      } else if (response.status === 409) {
        // AGENTE JÁ EXISTE = SUCESSO! ( Monetização Real )
        console.log(`   ✅ ${name} EXISTS (409): Agent already registered with PIX pending`);
        return {
          success: true,
          name: name,
          email: email,
          tier: tier,
          actorCode: response.data.actor?.code || 'EXISTING',
          apiKey: response.data.api_key,
          pixCode: 'EXISTING',
          amount: tier === 'BASIC' ? 29.90 : tier === 'PRO' ? 99.90 : 299.90,
          transactionId: 'EXISTING',
          existing: true
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
  const newAgents = results.successful.filter(a => !a.existing).length;
  const existingAgents = results.successful.filter(a => a.existing).length;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SEEDING COMPLETE - FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Total Agents: ${results.successful.length}`);
  console.log(`   🆕 New created: ${newAgents}`);
  console.log(`   📦 Already existing: ${existingAgents}`);
  console.log(`❌ Failed: ${results.failed.length} agents`);
  console.log(`\n📈 By Tier:`);
  console.log(`   BASIC: ${results.byTier.BASIC} (R$ 29.90 each)`);
  console.log(`   PRO: ${results.byTier.PRO} (R$ 99.90 each)`);
  console.log(`   ENTERPRISE: ${results.byTier.ENTERPRISE} (R$ 299.90 each)`);
  console.log(`\n💰 MONETIZATION POTENTIAL:`);
  console.log(`   Total PIX pending: R$ ${results.totalValue.toFixed(2)}`);
  console.log(`   Est. conversion (30%): R$ ${(results.totalValue * 0.3).toFixed(2)}`);
  console.log(`   Treasury: ${CONFIG.TREASURY || '0x3955d559055DadB7067054cB6E6f974710345224'}`);
  
  if (results.successful.length > 0) {
    console.log(`\n📋 Sample agents with PIX:`);
    results.successful.slice(0, 5).forEach(agent => {
      const status = agent.existing ? '📦 EXISTING' : '🆕 NEW';
      console.log(`   ${status} ${agent.name} (${agent.tier}) - PIX: R$ ${agent.amount}`);
    });
    
    // Save to file
    const fs = await import('fs');
    const seedData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: results,
      summary: {
        totalAgents: results.successful.length,
        newAgents: newAgents,
        existingAgents: existingAgents,
        totalValue: results.totalValue,
        conversionPotential: results.totalValue * 0.3,
        treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
      }
    };
    
    const filename = `seed_results_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(seedData, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 MONETIZATION ACTIVE - NEXT STEPS:');
  console.log('   1. ✅ Agents created with PIX pending');
  console.log('   2. 🔄 Simulate payments: POST /webhook/mercadopago');
  console.log('   3. 📊 Monitor: GET /v1/admin/metrics');
  console.log('   4. 🚀 Activate agents → Automatic API access');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIOR LOOP: AGENT ACTIONS AFTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

async function hitFreeEndpoint(agentName, count = 5) {
  // Simulate agent hitting free endpoint multiple times
  const results = { hits: 0, rateLimited: 0, errors: 0 };
  
  for (let i = 0; i < count; i++) {
    try {
      const response = await axios.get(`${API_BASE}/v1/signals/free`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        results.hits++;
      } else if (response.status === 429) {
        results.rateLimited++;
        console.log(`   🚫 ${agentName} hit rate limit (429)`);
        break; // Stop trying once rate limited
      }
    } catch (err) {
      results.errors++;
    }
    
    // Small delay between hits
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

async function triggerPaywall(agentName) {
  // Simulate agent trying to access paid endpoint without API key
  // This should trigger the 402 paywall response
  try {
    const response = await axios.get(`${API_BASE}/v1/signals`, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (response.status === 402) {
      console.log(`   💰 ${agentName} triggered PAYWALL (402) - PIX: R$ ${response.data?.payment?.amount || '?'}`);
      return {
        triggered: true,
        amount: response.data?.payment?.amount,
        pixCode: response.data?.payment?.pix_copy_paste?.substring(0, 30) + '...'
      };
    } else if (response.status === 401) {
      console.log(`   🔒 ${agentName} got 401 - API key required`);
      return { triggered: false, reason: '401' };
    }
  } catch (err) {
    return { triggered: false, error: err.message };
  }
  
  return { triggered: false };
}

async function executeBehaviorLoop(agents) {
  if (!CONFIG.BEHAVIOR.HIT_FREE_ENDPOINT && !CONFIG.BEHAVIOR.TRIGGER_PAYWALL) {
    return;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎬 BEHAVIOR LOOP: Simulating agent activity');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const behaviorResults = {
    freeHits: 0,
    rateLimits: 0,
    paywallTriggers: 0,
    totalPaywallAmount: 0
  };
  
  // Sample 20% of agents for behavior loop to avoid overwhelming
  const sampleSize = Math.max(10, Math.floor(agents.length * 0.2));
  const sampleAgents = agents.slice(0, sampleSize);
  
  console.log(`🎯 Running behavior loop on ${sampleAgents.length} agents...\n`);
  
  for (const agent of sampleAgents) {
    // Hit free endpoint
    if (CONFIG.BEHAVIOR.HIT_FREE_ENDPOINT) {
      const freeResults = await hitFreeEndpoint(agent.name, 10);
      behaviorResults.freeHits += freeResults.hits;
      behaviorResults.rateLimits += freeResults.rateLimited;
    }
    
    // Trigger paywall
    if (CONFIG.BEHAVIOR.TRIGGER_PAYWALL) {
      for (let i = 0; i < CONFIG.BEHAVIOR.PAYWALL_HITS_PER_AGENT; i++) {
        const paywallResult = await triggerPaywall(agent.name);
        if (paywallResult.triggered) {
          behaviorResults.paywallTriggers++;
          behaviorResults.totalPaywallAmount += paywallResult.amount || 0;
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }
  
  console.log('\n📊 BEHAVIOR LOOP RESULTS:');
  console.log(`   Free endpoint hits: ${behaviorResults.freeHits}`);
  console.log(`   Rate limits hit: ${behaviorResults.rateLimits}`);
  console.log(`   Paywall triggers: ${behaviorResults.paywallTriggers}`);
  console.log(`   Paywall amount generated: R$ ${behaviorResults.totalPaywallAmount.toFixed(2)}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return behaviorResults;
}

// Run
async function main() {
  const results = await seedAgents();
  
  // Execute behavior loop on successful agents
  if (results.successful.length > 0 && (CONFIG.BEHAVIOR.HIT_FREE_ENDPOINT || CONFIG.BEHAVIOR.TRIGGER_PAYWALL)) {
    await executeBehaviorLoop(results.successful);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🌙 TOTAL MONETIZATION SWARM COMPLETE                        ║');
  console.log('║     Treasury: 0x3955d559055DadB7067054cB6E6f974710345224      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
