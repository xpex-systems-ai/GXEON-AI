<div align="center">

<img src="https://img.shields.io/badge/M2M-BOT_DEVELOPER_GUIDE-FF6B00?style=for-the-badge&logo=robotframework" height="28">

# 🤖 CONTRIBUTING TO GXEON — Bot Developer Guide

### **Integrate Your Autonomous Agent with the Sovereign M2M Layer**

[![Protocol](https://img.shields.io/badge/PANDORA-v2.2-FF6B00?style=flat-square)](./PANDORA_PROTOCOL.md)
[![API](https://img.shields.io/badge/API-REST-00D4FF?style=flat-square)](./README.md)
[![License](https://img.shields.io/badge/License-Enterprise-gold?style=flat-square)](./LICENSE)

</div>

---

## 🎯 **Welcome, Bot Developer**

This guide is for **autonomous agent developers**, **MEV bot operators**, and **trading algorithm creators** who want to integrate with GXEON's sovereign data layer.

> *"Your bot + GXEON data = Alpha extraction at machine speed."*

**What you'll build:**
- High-frequency MEV scanning bots
- Flash loan arbitrage executors
- Cross-DEX opportunity hunters
- Real-time mempool analyzers

---

## 🚀 **Quick Integration (5 Minutes)**

### Step 1: Register Your Agent

```bash
curl -X POST https://gxeon-ai.xmentex2.replit.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "AlphaScanner_v1",
    "agent_type": "mev_bot",
    "tier": "pro",
    "webhook_url": "https://your-bot.com/webhooks/gxeon"
  }'
```

**Response:**
```json
{
  "api_key": "gx_live_abc123xyz789",
  "agent_id": "agent_1713302400_abc",
  "tier": "pro",
  "credits": 10.00,
  "daily_limit": null,
  "endpoints": {
    "sovereign_data": "/api/v1/sovereign-data",
    "billing": "/api/v1/billing"
  }
}
```

### Step 2: First API Call (Node.js)

```javascript
const axios = require('axios');

class GXeonClient {
  constructor(apiKey, agentId) {
    this.client = axios.create({
      baseURL: 'https://gxeon-ai.xmentex2.replit.app',
      headers: {
        'x-gxeon-key': apiKey,
        'x-agent-id': agentId,
        'x-agent-tier': 'pro',
        'User-Agent': 'M2M-Agent/2.2',
        'Accept': 'application/json'
      },
      timeout: 5000
    });
  }

  async getSovereignData() {
    try {
      const { data } = await this.client.get('/api/v1/sovereign-data');
      
      console.log(`✅ Credits left: ${data.agent.remaining_credits}`);
      console.log(`📡 Mempool: ${data.data.mempool.pending_tx_count} pending txs`);
      console.log(`💎 Arbitrage: ${data.data.arbitrage.opportunities.length} opportunities`);
      
      return data;
    } catch (error) {
      if (error.response?.status === 402) {
        console.error('❌ Insufficient credits — recharge required');
        console.log(`💰 Purchase: ${error.response.data.purchase_url}`);
      }
      throw error;
    }
  }
}

// Usage
const gxeon = new GXeonClient('gx_live_abc123xyz789', 'my-mev-bot');
gxeon.getSovereignData();
```

### Step 3: Python Alternative

```python
import requests

class GXeonClient:
    def __init__(self, api_key, agent_id):
        self.base_url = 'https://gxeon-ai.xmentex2.replit.app'
        self.headers = {
            'x-gxeon-key': api_key,
            'x-agent-id': agent_id,
            'x-agent-tier': 'pro',
            'User-Agent': 'M2M-Agent/2.2'
        }
    
    def get_sovereign_data(self):
        response = requests.get(
            f'{self.base_url}/api/v1/sovereign-data',
            headers=self.headers
        )
        
        if response.status_code == 402:
            print("❌ Insufficient credits")
            return None
            
        data = response.json()
        print(f"✅ Credits: {data['agent']['remaining_credits']}")
        print(f"📡 Mempool: {data['data']['mempool']['pending_tx_count']} txs")
        
        return data

# Usage
client = GXeonClient('gx_live_abc123xyz789', 'my-mev-bot')
data = client.get_sovereign_data()
```

---

## 🎫 **Understanding Agent Tiers**

### Choose Your Power Level

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   🆓 FREE   │   ⚡ PRO    │   🐋 WHALE  │  🤖 CUSTOM  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ 10 calls/day│ Unlimited   │ Unlimited   │ Negotiated  │
│ 30s latency │ <100ms      │ 0ms (raw)   │ Dedicated   │
│ Basic data  │ Real-time   │ MEV bundles │ Custom API  │
│ $0          │ $50/mo      │ $500/mo     │ Contact us  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Upgrade Tier

```bash
curl -X POST https://gxeon-ai.xmentex2.replit.app/api/v1/billing/upgrade \
  -H "x-gxeon-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "whale",
    "payment_method": "usdc_arbitrum",
    "tx_hash": "0x..."
  }'
```

---

## 💰 **Managing Credits**

### Check Balance

```javascript
const balance = await client.get('/api/v1/billing/balance');
console.log(`💳 Credits: ${balance.data.amount}`);
```

### Recharge (Auto-Webhook)

```javascript
// Set up auto-recharge at 10 credits threshold
await client.post('/api/v1/billing/auto-recharge', {
  threshold: 10.00,
  amount: 100.00,
  payment_method: 'usdc_arbitrum'
});
```

### Usage Analytics

```javascript
const usage = await client.get('/api/v1/billing/usage');
console.log(`📊 Today: ${usage.data.calls_today} calls`);
console.log(`💸 Spent: $${usage.data.credits_spent_today}`);
```

---

## 🤖 **Bot Architecture Patterns**

### Pattern 1: MEV Scanner

```javascript
class MEVScanner {
  constructor(gxeonClient) {
    this.gxeon = gxeonClient;
    this.seenTxs = new Set();
  }

  async scanLoop() {
    while (true) {
      const data = await this.gxeon.getSovereignData();
      
      // Check for new MEV opportunities
      for (const opp of data.data.arbitrage.opportunities) {
        if (!this.seenTxs.has(opp.id)) {
          this.seenTxs.add(opp.id);
          await this.executeMEV(opp);
        }
      }
      
      // Respect rate limits
      await sleep(data.meta.next_call_min_delay_ms);
    }
  }

  async executeMEV(opportunity) {
    if (opportunity.profit_bps > 10 && opportunity.confidence > 0.8) {
      // Execute via Flashbots
      console.log(`🎯 Executing MEV: ${opportunity.dex_pair}`);
      // ... flashbots logic
    }
  }
}
```

### Pattern 2: Flash Loan Arbitrage

```javascript
class FlashLoanArbitrageur {
  async scanAndExecute() {
    const data = await this.gxeon.getSovereignData();
    
    // Find best flash loan pool
    const pool = data.data.arbitrage.flash_loan_pools
      .sort((a, b) => parseFloat(b.available) - parseFloat(a.available))[0];
    
    // Find arbitrage opportunity
    const opp = data.data.arbitrage.opportunities
      .find(o => o.profit_bps > 15);
    
    if (pool && opp) {
      await this.executeFlashLoanArbitrage(pool, opp);
    }
  }

  async executeFlashLoanArbitrage(pool, opportunity) {
    // 0.01% tax automatically applied by GXEON node
    const tx = await this.flashLoanContract.execute({
      protocol: pool.protocol,
      amount: opportunity.size_usd,
      target_dex: opportunity.dex_pair
    });
    
    console.log(`⚡ Flash loan executed: ${tx.hash}`);
    console.log(`💸 Tax paid: ${opportunity.size_usd * 0.0001} USD`);
  }
}
```

### Pattern 3: Batch High-Frequency

```javascript
class HighFrequencyBot {
  async batchRequest() {
    // 10% discount for batch requests
    const batch = await this.gxeon.post('/api/v1/sovereign-data/batch', {
      requests: Array(20).fill({ tier: 'whale' })
    });
    
    console.log(`📦 Batch cost: ${batch.data.total_cost} credits (10% off)`);
    
    // Process all responses
    for (const item of batch.data.data) {
      this.processSignal(item);
    }
  }
}
```

---

## 📡 **Data Schema Reference**

### Mempool Object

```typescript
interface MempoolData {
  pending_tx_count: number;        // Current pending transactions
  high_value_tx: Array<{
    hash: string;
    value_eth: number;
    gas_price_gwei: number;
    method_signature: string;
  }>;
  gas_price_gwei: number;          // Current gas price
  last_block: number;                // Latest block number
  congestion_level: 'low' | 'medium' | 'high';
}
```

### Arbitrage Opportunity

```typescript
interface ArbitrageOpportunity {
  id: string;
  dex_pair: string;                  // e.g., "UNI-V2: WETH/USDC"
  profit_bps: number;                // Basis points (100 = 1%)
  size_usd: number;                  // Recommended position size
  confidence: number;                // 0.0 to 1.0
  expires_at: string;                // ISO 8601 timestamp
  route: Array<{                     // Execution path
    protocol: string;
    token_in: string;
    token_out: string;
  }>;
}
```

### Flash Loan Pool

```typescript
interface FlashLoanPool {
  protocol: 'Aave V3' | 'Balancer' | 'dYdX' | 'Uniswap V3';
  available: string;                 // Formatted amount (e.g., "$2.5M")
  apy: string;                       // Current APY
  token: string;                     // Primary token (WETH, USDC, etc.)
}
```

---

## 🛡️ **Best Practices**

### 1. Error Handling

```javascript
try {
  const data = await gxeon.getSovereignData();
} catch (error) {
  switch (error.response?.status) {
    case 401:
      console.error('Invalid API key — check credentials');
      break;
    case 402:
      console.error('Credits depleted — auto-recharging...');
      await autoRecharge();
      break;
    case 429:
      console.error('Rate limited — backing off...');
      await sleep(1000);
      break;
    case 403:
      console.error('Human detection triggered — check User-Agent');
      break;
    default:
      console.error('Network error — retrying...');
  }
}
```

### 2. Rate Limiting

```javascript
class RateLimitedClient {
  constructor() {
    this.minDelay = 100; // ms
    this.lastCall = 0;
  }

  async call() {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    
    if (elapsed < this.minDelay) {
      await sleep(this.minDelay - elapsed);
    }
    
    this.lastCall = Date.now();
    return this.gxeon.getSovereignData();
  }
}
```

### 3. Credit Conservation

```javascript
// Batch similar requests
const batchResults = await Promise.all([
  gxeon.getSovereignData(),
  gxeon.getSovereignData(),
  gxeon.getSovereignData()
]);

// Use batch endpoint instead (10% cheaper)
const batch = await gxeon.post('/api/v1/sovereign-data/batch', {
  requests: [{}, {}, {}]
});
```

---

## 🧪 **Testing Your Integration**

### Local Test Script

```javascript
// test-gxeon-integration.js
require('dotenv').config();

const { GXeonClient } = require('./your-client');

async function testIntegration() {
  const client = new GXeonClient(
    process.env.GXEON_API_KEY,
    'test-agent'
  );

  console.log('🧪 Testing GXEON integration...\n');

  // Test 1: Basic connectivity
  console.log('1️⃣ Testing connectivity...');
  const health = await client.get('/health');
  console.log(`   ✅ API Status: ${health.status}\n`);

  // Test 2: Credit balance
  console.log('2️⃣ Checking credits...');
  const balance = await client.get('/api/v1/billing/balance');
  console.log(`   💳 Balance: ${balance.data.amount} credits\n`);

  // Test 3: Sovereign data
  console.log('3️⃣ Fetching sovereign data...');
  const data = await client.getSovereignData();
  console.log(`   📡 Mempool: ${data.data.mempool.pending_tx_count} txs`);
  console.log(`   💎 Opportunities: ${data.data.arbitrage.opportunities.length}\n`);

  // Test 4: Tier info
  console.log('4️⃣ Checking tier info...');
  const tier = await client.get('/api/v1/sovereign-data/tier-info');
  console.log(`   🎫 Available tiers: ${Object.keys(tier.tiers).join(', ')}\n`);

  console.log('✅ All tests passed! Your bot is ready.');
}

testIntegration().catch(console.error);
```

Run tests:
```bash
npm install axios dotenv
node test-gxeon-integration.js
```

---

## 🐛 **Troubleshooting**

| Issue | Cause | Solution |
|:---|:---|:---|
| `401 Unauthorized` | Invalid API key | Check key at dashboard |
| `402 Payment Required` | No credits | Recharge at `/billing/recharge` |
| `403 Forbidden` | Human User-Agent | Set `User-Agent: M2M-Agent/2.2` |
| `429 Rate Limited` | Too many requests | Reduce frequency or upgrade tier |
| `500 Internal Error` | Server issue | Retry with exponential backoff |
| High latency | Network congestion | Use Whale tier for priority |
| Missing data | Wrong tier | Upgrade to Pro/Whale for full data |

---

## 🌐 **Community & Support**

- **Discord:** [discord.gg/gxeon #bot-devs](https://discord.gg/gxeon)
- **Telegram:** [@gxeon_bot_devs](https://t.me/gxeon_bot_devs)
- **Email:** bots@gxeon.ai
- **Office Hours:** Tuesdays 14:00 UTC

### Show Off Your Bot

Built something cool? Share it!

```bash
# Submit to bot showcase
curl -X POST https://gxeon-ai.xmentex2.replit.app/api/v1/community/showcase \
  -H "x-gxeon-key: YOUR_API_KEY" \
  -d '{
    "bot_name": "AlphaScanner",
    "description": "MEV bot with 95% success rate",
    "github_url": "https://github.com/you/alpha-scanner",
    "performance": {
      "daily_profit": "$500",
      "success_rate": "95%"
    }
  }'
```

---

## 📜 **Code of Conduct**

### Bot Ethics

1. **No Spam:** Don't abuse the API with unnecessary calls
2. **Rate Respect:** Honor the rate limits — they're there for stability
3. **Fair Play:** Don't exploit the system — report bugs for rewards
4. **Transparency:** Label your bot clearly in the User-Agent
5. **Security:** Protect your API key — treat it like a private key

### Reporting Issues

Found a bug? Security issue?

- **Security:** security@gxeon.ai (PGP key available)
- **Bugs:** [GitHub Issues](../../issues)
- **Features:** [GitHub Discussions](../../discussions)

---

## 🎯 **Advanced Topics**

### Webhook Integration

```javascript
// Set up real-time alerts
await client.post('/api/v1/webhooks/configure', {
  url: 'https://your-bot.com/webhooks/gxeon',
  events: ['arbitrage_opportunity', 'flash_loan_available'],
  filters: {
    min_profit_bps: 20,
    min_confidence: 0.85
  }
});

// Your webhook handler
app.post('/webhooks/gxeon', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'arbitrage_opportunity') {
    executeArbitrage(data);
  }
  
  res.status(200).send('OK');
});
```

### Custom Filters

```javascript
// Only get specific opportunities
const data = await client.get('/api/v1/sovereign-data', {
  params: {
    min_profit_bps: 15,
    protocols: ['uniswap_v3', 'curve'],
    tokens: ['WETH', 'USDC', 'DAI'],
    max_gas_gwei: 50
  }
});
```

---

<div align="center">

## 🌑 **Ready to Build?**

```bash
# Clone the example bot
git clone https://github.com/xpex-systems-ai/GXEON-AI.git
cd GXEON-AI/examples/bot-starter

# Install dependencies
npm install

# Configure
export GXEON_API_KEY="gx_live_xxxxxxxx"

# Run your first scan
npm start
```

**[📖 API Reference](../README.md)** • **[🌐 Live Dashboard](https://gxeon-ai.xmentex2.replit.app)** • **[💬 Discord](https://discord.gg/gxeon)**

---

<sup>🤖 Built for bots, by bot builders.  
Protocol: PANDORA v2.2 | Network: Arbitrum One</sup>

</div>

