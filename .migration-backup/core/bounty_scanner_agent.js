#!/usr/bin/env node
/**
 * Bounty Scanner Agent - GXeon
 * 
 * Scans Gelato Network and other automation protocols for "Ready to Execute" tasks
 * Calculates profit potential and logs opportunities to Supabase
 * 
 * Profit Formula: (Reward_Token * Price) - (Gas_Limit * Gas_Price)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const GELATO_API_URL = 'https://api.gelato.digital/tasks';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CHAINLINK_ETH_USD = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'; // Mainnet

// Network configurations
const NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    gelatoRelay: '0xd8253782c45a12053575b09718630d6f6867e798',
    nativeToken: 'ETH'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    gelatoRelay: '0x8c089073a9594a4fb03fa99f4a39717ee9aa9d7d',
    nativeToken: 'MATIC'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    gelatoRelay: '0x7c1a1c5e8e4c7b5e5f5e5f5e5f5e5f5e5f5e5f5',
    nativeToken: 'ETH'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    gelatoRelay: '0x7c1a1c5e8e4c7b5e5f5e5f5e5f5e5f5e5f5e5f5',
    nativeToken: 'ETH'
  }
};

// Token price cache (in USD)
let tokenPriceCache = {};
let lastPriceUpdate = 0;

class BountyScannerAgent {
  constructor() {
    this.supabase = null;
    this.providers = {};
    this.opportunitiesFound = [];
    this.minProfitUsd = 0.01; // Minimum $0.01 profit to consider
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🎯 BOUNTY SCANNER AGENT v1.0                       ║');
    console.log('║     Gelato Network → Profit Scanner                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Initialize providers for each network
    for (const [network, config] of Object.entries(NETWORKS)) {
      try {
        this.providers[network] = new ethers.JsonRpcProvider(config.rpcUrl);
        console.log(`✅ ${config.name} provider ready`);
      } catch (error) {
        console.warn(`⚠️  Failed to initialize ${network} provider: ${error.message}`);
      }
    }

    // Update token prices
    await this.updateTokenPrices();
    
    console.log('\n🔍 Scanner initialized and ready\n');
  }

  async updateTokenPrices() {
    const now = Date.now();
    if (now - lastPriceUpdate < 60000 && Object.keys(tokenPriceCache).length > 0) {
      return; // Cache valid for 60 seconds
    }

    console.log('🔄 Updating token prices...');
    
    try {
      // Fetch prices from CoinGecko
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=ethereum,matic-network&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      tokenPriceCache = {
        'ETH': data.ethereum?.usd || 3500,
        'MATIC': data['matic-network']?.usd || 0.50,
        'WETH': data.ethereum?.usd || 3500,
        'WMATIC': data['matic-network']?.usd || 0.50
      };
      
      lastPriceUpdate = now;
      console.log('💰 Token prices updated:', tokenPriceCache);
    } catch (error) {
      console.warn('⚠️  Failed to update prices, using defaults:', error.message);
      // Use fallback prices
      tokenPriceCache = {
        'ETH': 3500,
        'MATIC': 0.50,
        'WETH': 3500,
        'WMATIC': 0.50
      };
    }
  }

  /**
   * Fetch tasks from Gelato Network API
   */
  async fetchGelatoTasks(network = 'ethereum') {
    try {
      console.log(`🔍 Fetching Gelato tasks for ${network}...`);
      
      // Gelato API endpoint for tasks
      const response = await fetch(`${GELATO_API_URL}?chainId=${NETWORKS[network].chainId}&status=pending`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GXeon-Bounty-Scanner/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`   No pending tasks found on ${network}`);
          return [];
        }
        throw new Error(`Gelato API error: ${response.status}`);
      }

      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.warn(`⚠️  Failed to fetch Gelato tasks for ${network}: ${error.message}`);
      return [];
    }
  }

  /**
   * Scan for keeper/bounty opportunities on a specific network
   */
  async scanNetwork(network) {
    const tasks = await this.fetchGelatoTasks(network);
    const provider = this.providers[network];
    const networkConfig = NETWORKS[network];
    
    if (!provider) {
      console.warn(`⚠️  No provider available for ${network}`);
      return [];
    }

    console.log(`\n📡 Scanning ${networkConfig.name}...`);
    console.log(`   Found ${tasks.length} tasks to analyze`);

    const opportunities = [];

    for (const task of tasks) {
      try {
        const opportunity = await this.analyzeTask(task, provider, network);
        if (opportunity && opportunity.profitUsd > this.minProfitUsd) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to analyze task ${task.taskId}: ${error.message}`);
      }
    }

    return opportunities;
  }

  /**
   * Analyze a single task for profit potential
   */
  async analyzeTask(task, provider, network) {
    const networkConfig = NETWORKS[network];
    
    // Extract task details
    const taskId = task.taskId || task.id;
    const execData = task.execData || '0x';
    const targetContract = task.target || task.execAddress;
    const paymentToken = task.paymentToken || networkConfig.nativeToken;
    const paymentAmount = task.paymentAmount || '0';
    
    // Get gas estimate
    let gasLimit;
    try {
      const estimatedGas = await provider.estimateGas({
        to: targetContract,
        data: execData,
        value: 0
      });
      gasLimit = Number(estimatedGas);
    } catch (error) {
      // Use a conservative estimate if estimation fails
      gasLimit = 500000;
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = Number(feeData.gasPrice || 20000000000n); // 20 gwei default
    
    // Calculate gas cost in native token
    const gasCostWei = BigInt(gasLimit) * BigInt(gasPrice);
    const gasCostEth = Number(gasCostWei) / 1e18;
    
    // Get token prices
    const tokenPrice = tokenPriceCache[paymentToken] || tokenPriceCache[networkConfig.nativeToken] || 1;
    const nativeTokenPrice = tokenPriceCache[networkConfig.nativeToken] || 3500;
    
    // Calculate reward value
    const rewardAmount = Number(ethers.formatUnits(paymentAmount, 18));
    const rewardUsd = rewardAmount * tokenPrice;
    
    // Calculate gas cost in USD
    const gasCostUsd = gasCostEth * nativeTokenPrice;
    
    // Calculate net profit
    const profitUsd = rewardUsd - gasCostUsd;
    const profitPercent = rewardUsd > 0 ? (profitUsd / rewardUsd) * 100 : 0;

    // Only return if profitable
    if (profitUsd <= 0) {
      return null;
    }

    return {
      taskId,
      network,
      networkName: networkConfig.name,
      targetContract,
      paymentToken,
      rewardAmount,
      rewardUsd,
      gasLimit,
      gasPrice: gasPrice.toString(),
      gasCostEth,
      gasCostUsd,
      profitUsd,
      profitPercent,
      execData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log opportunity to keeper_rewards table for profit tracking
   */
  async saveToKeeperRewards(opportunity) {
    const rewardPayload = {
      task_id: opportunity.taskId,
      protocol: 'gelato',
      network: opportunity.network,
      reward_amount: opportunity.rewardAmount,
      reward_token: opportunity.paymentToken,
      gas_spent_usd: opportunity.gasCostUsd,
      net_profit_usd: opportunity.profitUsd,
      status: 'detected'
    };

    try {
      const { data, error } = await this.supabase
        .from('keeper_rewards')
        .insert(rewardPayload)
        .select();

      if (error) {
        console.error('🔴 Failed to save to keeper_rewards:', error.message);
        return null;
      }

      console.log(`   ✅ Saved to keeper_rewards (ID: ${data?.[0]?.id || 'unknown'})`);
      return data?.[0] || null;
    } catch (error) {
      console.error('🔴 Error saving to keeper_rewards:', error.message);
      return null;
    }
  }

  /**
   * Log opportunity to Supabase audit_logs (notification)
   */
  async logOpportunity(opportunity) {
    const logPayload = {
      level: 'warning',
      module: 'BountyScanner',
      message: `Oportunidade Keeper Detectada: ${opportunity.profitUsd.toFixed(4)} USD de lucro em ${opportunity.networkName}`,
      metadata: {
        task_id: opportunity.taskId,
        network: opportunity.network,
        target: opportunity.targetContract,
        reward_token: opportunity.paymentToken,
        reward_amount: opportunity.rewardAmount,
        reward_usd: opportunity.rewardUsd,
        gas_cost_eth: opportunity.gasCostEth,
        gas_cost_usd: opportunity.gasCostUsd,
        net_profit_usd: opportunity.profitUsd,
        profit_percent: opportunity.profitPercent.toFixed(2),
        gas_limit: opportunity.gasLimit,
        timestamp: opportunity.timestamp
      },
      notification_type: 'bounty_opportunity',
      priority: opportunity.profitUsd > 1 ? 'high' : 'medium',
      requires_action: true
    };

    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert(logPayload);

      if (error) {
        console.error('🔴 Failed to log opportunity:', error.message);
        return false;
      }

      console.log(`   ✅ Logged to audit_logs`);
      return true;
    } catch (error) {
      console.error('🔴 Error logging opportunity:', error.message);
      return false;
    }
  }

  /**
   * Run the complete scan across all networks
   */
  async run() {
    try {
      await this.initialize();

      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║     🔍 INICIANDO SCAN DE OPORTUNIDADES                 ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      let totalOpportunities = 0;
      const allOpportunities = [];

      // Scan each network
      for (const network of Object.keys(NETWORKS)) {
        const opportunities = await this.scanNetwork(network);
        
        if (opportunities.length > 0) {
          console.log(`\n   🎯 ${opportunities.length} OPORTUNIDADES ENCONTRADAS em ${NETWORKS[network].name}:`);
          
          for (const opp of opportunities) {
            console.log(`\n   ────────────────────────────────────────────`);
            console.log(`   📋 Task ID: ${opp.taskId}`);
            console.log(`   💰 Reward: ${opp.rewardAmount.toFixed(6)} ${opp.paymentToken} ($${opp.rewardUsd.toFixed(4)})`);
            console.log(`   ⛽ Gas Cost: ${opp.gasCostEth.toFixed(6)} ${opp.networkConfig?.nativeToken || 'ETH'} ($${opp.gasCostUsd.toFixed(4)})`);
            console.log(`   🎯 Net Profit: $${opp.profitUsd.toFixed(4)} (${opp.profitPercent.toFixed(2)}%)`);
            console.log(`   📍 Target: ${opp.targetContract.substring(0, 20)}...`);
            
            // Log to Supabase (both tables)
            await this.logOpportunity(opp);
            await this.saveToKeeperRewards(opp);
            
            allOpportunities.push(opp);
          }
          
          totalOpportunities += opportunities.length;
        }
      }

      // Final Summary
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║              📊 SCAN COMPLETO                          ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`   Total de Oportunidades: ${totalOpportunities}`);
      console.log(`   Lucro Total Potencial: $${allOpportunities.reduce((sum, o) => sum + o.profitUsd, 0).toFixed(4)} USD`);
      console.log(`   Networks Escaneadas: ${Object.keys(NETWORKS).length}`);
      
      if (totalOpportunities === 0) {
        console.log('\n   ℹ️  Nenhuma oportunidade lucrativa encontrada no momento.');
        console.log('   O scanner continuará monitorando...');
      } else {
        console.log('\n   🚀 Oportunidades registradas no Dashboard!');
      }

      console.log('\n✅ Bounty Scanner concluído com sucesso\n');

      return {
        success: true,
        opportunitiesFound: totalOpportunities,
        opportunities: allOpportunities,
        totalProfitUsd: allOpportunities.reduce((sum, o) => sum + o.profitUsd, 0)
      };

    } catch (error) {
      console.error('\n❌ Bounty Scanner failed:', error.message);
      
      // Log error to Supabase
      try {
        await this.supabase?.from('audit_logs').insert({
          level: 'error',
          module: 'BountyScanner',
          message: 'Bounty Scanner Falhou: ' + error.message,
          metadata: { error: error.message, stack: error.stack },
          notification_type: 'system_alert',
          priority: 'critical',
          requires_action: true
        });
      } catch (logError) {
        console.error('Could not log failure:', logError.message);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new BountyScannerAgent();
  agent.run().then(result => {
    if (result.success) {
      console.log(`[BountyScanner] Found ${result.opportunitiesFound} opportunities`);
      process.exit(0);
    } else {
      console.error('[BountyScanner] Failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('[BountyScanner] Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { BountyScannerAgent };
