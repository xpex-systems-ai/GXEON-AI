#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOUNTY SCANNER AGENT v2.0 - Enhanced with Signal Export
 * Zero Capital Revenue Mode
 * 
 * Exporta sinais para SignalHub para monetização via API
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Network configurations
const NETWORKS = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=1&taskStatus=ExecSuccess',
    nativeToken: 'ETH',
    rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=42161&taskStatus=ExecSuccess',
    nativeToken: 'ETH',
    rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
  },
  polygon: {
    name: 'Polygon PoS',
    chainId: 137,
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=137&taskStatus=ExecSuccess',
    nativeToken: 'MATIC',
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=8453&taskStatus=ExecSuccess',
    nativeToken: 'ETH',
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BOUNTY SCANNER AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════
class BountyScannerAgentEnhanced {
  constructor() {
    this.supabase = null;
    this.providers = {};
    this.tokenPrices = new Map();
    this.minProfitUsd = 0.01;
    this.signalHubUrl = process.env.SIGNAL_HUB_URL || 'http://localhost:3000/v1/signals/inject';
    this.internalApiKey = process.env.INTERNAL_API_KEY || 'dev-key';
    
    // Stats
    this.stats = {
      scanned: 0,
      opportunities: 0,
      signalsExported: 0,
      revenue: 0
    };
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     🔍 BOUNTY SCANNER AGENT v2.0 - SIGNAL EXPORT MODE          ║');
    console.log('║     Zero Capital Revenue - Monetização via Sinais              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase conectado');
    } else {
      console.warn('⚠️ Supabase não configurado - modo standalone');
    }

    // Initialize providers
    for (const [network, config] of Object.entries(NETWORKS)) {
      this.providers[network] = new ethers.JsonRpcProvider(config.rpc, config.chainId);
      console.log(`✅ Provider ${network}: ${config.name}`);
    }

    // Update token prices
    await this.updateTokenPrices();

    console.log('\n🚀 Bounty Scanner pronto para exportar sinais\n');
  }

  async updateTokenPrices() {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network&vs_currencies=usd',
        { timeout: 10000 }
      );
      
      this.tokenPrices.set('ETH', response.data.ethereum?.usd || 2500);
      this.tokenPrices.set('MATIC', response.data['matic-network']?.usd || 0.5);
      
      console.log('💰 Preços atualizados:', Object.fromEntries(this.tokenPrices));
    } catch (error) {
      console.warn('⚠️ Erro ao buscar preços, usando defaults:', error.message);
      this.tokenPrices.set('ETH', 2500);
      this.tokenPrices.set('MATIC', 0.5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GELATO API FETCH
  // ═══════════════════════════════════════════════════════════════════════════
  
  async fetchGelatoTasks(network) {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) return [];

    try {
      console.log(`🔍 Buscando tasks em ${networkConfig.name}...`);
      
      const response = await axios.get(networkConfig.gelatoApi, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GXEON-BountyScanner/2.0'
        }
      });

      const tasks = response.data?.tasks || response.data?.data || [];
      console.log(`   📦 ${tasks.length} tasks encontradas`);
      
      return tasks;
    } catch (error) {
      console.error(`   ❌ Erro ao buscar ${network}:`, error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async analyzeTask(task, network) {
    const networkConfig = NETWORKS[network];
    const provider = this.providers[network];

    try {
      // Extract task data
      const taskId = task.id || task.taskId || task.taskHash || task.taskId;
      const targetContract = task.target || task.execAddress || task.taskReceipt?.target || '0x0';
      const paymentToken = task.paymentToken || task.feeToken || 'ETH';
      
      // Get reward amount
      const rewardAmount = parseFloat(
        task.paymentAmount || task.fee || task.reward || '0'
      ) / 1e18;

      // Get token price
      const tokenPrice = paymentToken === 'ETH' || paymentToken === 'WETH'
        ? this.tokenPrices.get('ETH') || 2500
        : this.tokenPrices.get(paymentToken) || 1;

      const rewardUsd = rewardAmount * tokenPrice;

      // Estimate gas
      const gasLimit = 150000;
      const gasPrice = await provider.getFeeData();
      const gasCostEth = (gasPrice.maxFeePerGas || gasPrice.gasPrice || 1000000000n) * BigInt(gasLimit);
      const gasCostEthFloat = parseFloat(ethers.formatEther(gasCostEth));
      const gasCostUsd = gasCostEthFloat * (this.tokenPrices.get('ETH') || 2500);

      // Calculate profit
      const profitUsd = rewardUsd - gasCostUsd;
      const profitPercent = rewardUsd > 0 ? (profitUsd / rewardUsd) * 100 : 0;

      // Minimum profit check
      if (profitUsd < this.minProfitUsd) {
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
        gasCostEth: gasCostEthFloat,
        gasCostUsd,
        profitUsd,
        profitPercent,
        gasLimit,
        timestamp: Date.now(),
        networkConfig
      };

    } catch (error) {
      console.error('   ❌ Erro na análise:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL EXPORT - Core feature for Zero Capital Revenue
  // ═══════════════════════════════════════════════════════════════════════════
  
  async exportSignalToHub(opportunity) {
    try {
      // Transform opportunity into signal format
      const signalData = {
        source: 'bounty_scanner_agent',
        network: opportunity.network,
        type: 'keeper_bounty',
        
        tokenIn: 'ETH',
        tokenOut: opportunity.paymentToken,
        dex: 'Gelato Automate',
        poolAddress: opportunity.targetContract,
        
        estimatedProfitUsd: opportunity.profitUsd,
        estimatedProfitPercent: opportunity.profitPercent,
        
        confidence: this.calculateConfidence(opportunity),
        gasCostUsd: opportunity.gasCostUsd,
        minCapitalRequired: opportunity.gasCostUsd * 1.5,
        
        executionPath: [
          { step: 'execute', target: opportunity.targetContract, data: opportunity.taskId }
        ],
        
        rawData: {
          taskId: opportunity.taskId,
          rewardUsd: opportunity.rewardUsd,
          gasLimit: opportunity.gasLimit,
          networkName: opportunity.networkName
        }
      };

      // Send to Signal Hub
      const response = await axios.post(this.signalHubUrl, signalData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.internalApiKey
        },
        timeout: 10000
      });

      if (response.data?.success) {
        this.stats.signalsExported++;
        this.stats.revenue += 0.01; // Potential revenue per signal
        
        console.log(`   📤 Signal exportado: ${response.data?.signal_id || 'N/A'}`);
        console.log(`      💰 Estimativa de delivery: ${response.data?.estimated_delivery || 0} usuários`);
        
        return response.data.signal_id;
      }

    } catch (error) {
      // Signal Hub might not be running, log locally
      console.warn(`   ⚠️ Signal Hub não disponível: ${error.message}`);
      console.log(`   💾 Sinal salvo localmente para retry`);
      
      // Store for later retry
      await this.storeLocalSignal(signalData);
    }
  }

  calculateConfidence(opportunity) {
    let confidence = 0.5;
    
    // Higher profit = higher confidence
    if (opportunity.profitUsd > 10) confidence += 0.2;
    if (opportunity.profitUsd > 5) confidence += 0.1;
    if (opportunity.profitUsd < 1) confidence -= 0.1;
    
    // Lower risk (gas cost ratio)
    const gasRatio = opportunity.gasCostUsd / opportunity.rewardUsd;
    if (gasRatio < 0.1) confidence += 0.1;
    if (gasRatio > 0.5) confidence -= 0.2;
    
    // Network reliability
    if (opportunity.network === 'arbitrum') confidence += 0.1;
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }

  async storeLocalSignal(signalData) {
    // Store in Supabase for later processing
    if (this.supabase) {
      try {
        await this.supabase.from('pending_signals').insert({
          source: signalData.source,
          data: signalData,
          created_at: new Date().toISOString(),
          retry_count: 0,
          status: 'pending'
        });
      } catch (error) {
        console.error('   ❌ Erro ao salvar sinal local:', error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async saveToKeeperRewards(opportunity) {
    if (!this.supabase) return;

    const reward = {
      task_id: opportunity.taskId,
      network: opportunity.network,
      target_contract: opportunity.targetContract,
      reward_token: opportunity.paymentToken,
      reward_amount: opportunity.rewardAmount,
      reward_usd: opportunity.rewardUsd,
      gas_cost_eth: opportunity.gasCostEth,
      gas_cost_usd: opportunity.gasCostUsd,
      net_profit_usd: opportunity.profitUsd,
      profit_percent: opportunity.profitPercent,
      status: 'detected',
      created_at: new Date(opportunity.timestamp).toISOString()
    };

    try {
      await this.supabase.from('keeper_rewards').insert(reward);
    } catch (error) {
      console.error('   ❌ Erro ao salvar:', error.message);
    }
  }

  async logOpportunity(opportunity) {
    if (!this.supabase) return;

    try {
      await this.supabase.from('audit_logs').insert({
        level: 'info',
        module: 'BountyScannerEnhanced',
        message: `Signal: $${opportunity.profitUsd.toFixed(2)} profit in ${opportunity.network}`,
        metadata: opportunity,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Ignore logging errors
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SCAN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  
  async scanNetwork(network) {
    const opportunities = [];
    
    try {
      const tasks = await this.fetchGelatoTasks(network);
      this.stats.scanned += tasks.length;
      
      for (const task of tasks) {
        const opportunity = await this.analyzeTask(task, network);
        
        if (opportunity) {
          opportunities.push(opportunity);
          
          // Export to Signal Hub
          await this.exportSignalToHub(opportunity);
          
          // Also save to database
          await this.saveToKeeperRewards(opportunity);
          await this.logOpportunity(opportunity);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Erro no scan ${network}:`, error.message);
    }
    
    return opportunities;
  }

  async run() {
    await this.initialize();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🚀 INICIANDO SCAN COM EXPORTAÇÃO DE SINAIS         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    let totalOpportunities = 0;

    // Scan all networks
    for (const network of Object.keys(NETWORKS)) {
      const opportunities = await this.scanNetwork(network);
      
      if (opportunities.length > 0) {
        console.log(`\n   🎯 ${opportunities.length} oportunidades em ${NETWORKS[network].name}`);
        
        for (const opp of opportunities) {
          console.log(`   💰 $${opp.profitUsd.toFixed(2)} | ${opp.profitPercent.toFixed(1)}% | ${opp.networkName}`);
        }
        
        totalOpportunities += opportunities.length;
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              📊 RESUMO DO SCAN                          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`   📦 Tasks escaneadas: ${this.stats.scanned}`);
    console.log(`   💎 Oportunidades: ${totalOpportunities}`);
    console.log(`   📤 Sinais exportados: ${this.stats.signalsExported}`);
    console.log(`   💰 Receita potencial: $${this.stats.revenue.toFixed(2)}`);
    console.log('');

    return {
      scanned: this.stats.scanned,
      opportunities: totalOpportunities,
      signalsExported: this.stats.signalsExported,
      estimatedRevenue: this.stats.revenue
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
const scanner = new BountyScannerAgentEnhanced();

if (import.meta.url === `file://${process.argv[1]}`) {
  scanner.run()
    .then(stats => {
      console.log('✅ Scan completo');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { BountyScannerAgentEnhanced };
export default scanner;
