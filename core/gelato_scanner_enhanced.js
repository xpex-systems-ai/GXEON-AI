#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GELATO SCANNER AGENT v2.0 - Enhanced with Signal Export
 * Zero Capital Revenue Mode
 * 
 * Escaneia Gelato Automate e exporta sinais para SignalHub
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ABI fragments for Automate
const AUTOMATE_ABI = [
  'function getFeeDetails() external view returns (uint256 fee, address feeToken)',
  'function exec(uint256 _taskId) external',
  'function cancelTask(uint256 _taskId) external'
];

// Network configurations
const NETWORKS = {
  polygon: {
    name: 'Polygon',
    chainId: 137,
    automate: '0x527a819db1eb0e34496297aA11c82515e8a8988c',
    nativeToken: 'MATIC',
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=137&taskStatus=ExecSuccess'
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    automate: '0x527a819db1eb0e34496297aA11c82515e8a8988c',
    nativeToken: 'ETH',
    rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=1&taskStatus=ExecSuccess'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    automate: '0x527a819db1eb0e34496297aA11c82515e8a8988c',
    nativeToken: 'ETH',
    rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=42161&taskStatus=ExecSuccess'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    automate: '0x527a819db1eb0e34496297aA11c82515e8a8988c',
    nativeToken: 'ETH',
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    gelatoApi: 'https://api.gelato.digital/v1/tasks?chainId=8453&taskStatus=ExecSuccess'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GELATO SCANNER ENHANCED
// ═══════════════════════════════════════════════════════════════════════════
class GelatoScannerEnhanced {
  constructor() {
    this.supabase = null;
    this.providers = {};
    this.automateContracts = {};
    this.tokenPrices = new Map();
    this.minProfitUsd = 0.01;
    
    // Signal Hub integration
    this.signalHubUrl = process.env.SIGNAL_HUB_URL || 'http://localhost:3000/v1/signals/inject';
    this.internalApiKey = process.env.INTERNAL_API_KEY || 'dev-key';
    
    // Stats
    this.stats = {
      scanned: 0,
      opportunities: 0,
      signalsExported: 0,
      estimatedRevenue: 0
    };
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     🌙 GELATO SCANNER v2.0 - SIGNAL EXPORT MODE                ║');
    console.log('║     Zero-Gas Tasks → SignalHub → Revenue                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase conectado');
    }

    // Providers and contracts
    for (const [network, config] of Object.entries(NETWORKS)) {
      this.providers[network] = new ethers.JsonRpcProvider(config.rpc, config.chainId);
      this.automateContracts[network] = new ethers.Contract(
        config.automate,
        AUTOMATE_ABI,
        this.providers[network]
      );
      console.log(`✅ ${config.name}: Automate ${config.automate.slice(0, 20)}...`);
    }

    // Token prices
    await this.updateTokenPrices();

    console.log('\n🌙 Gelato Scanner pronto para exportar sinais\n');
  }

  async updateTokenPrices() {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network&vs_currencies=usd',
        { timeout: 10000 }
      );
      
      this.tokenPrices.set('ETH', response.data.ethereum?.usd || 2500);
      this.tokenPrices.set('MATIC', response.data['matic-network']?.usd || 0.5);
      
      console.log('💰 Preços:', Object.fromEntries(this.tokenPrices));
    } catch (error) {
      console.warn('⚠️ Preços padrão:', error.message);
      this.tokenPrices.set('ETH', 2500);
      this.tokenPrices.set('MATIC', 0.5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GELATO API SCAN
  // ═══════════════════════════════════════════════════════════════════════════
  
  async scanViaApi(network) {
    const config = NETWORKS[network];
    
    try {
      console.log(`🌙 Scanning ${config.name} via Gelato API...`);
      
      const response = await axios.get(config.gelatoApi, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GXEON-GelatoScanner/2.0'
        }
      });

      const tasks = response.data?.tasks || response.data?.data || [];
      console.log(`   📦 ${tasks.length} tasks found`);
      
      return tasks;
    } catch (error) {
      console.error(`   ❌ API Error ${network}:`, error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async analyzeTask(task, network) {
    const config = NETWORKS[network];
    
    try {
      const taskId = task.id || task.taskId || task.taskHash;
      const executor = task.execAddress || task.target || task.taskReceipt?.execAddress;
      const rewardAmount = parseFloat(task.paymentAmount || task.fee || '0') / 1e18;
      
      // Get fee details from contract if possible
      let gasEstimate = 150000;
      try {
        const feeData = await this.providers[network].getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 1000000000n;
        const gasCost = gasPrice * BigInt(gasEstimate);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));
        const gasCostUsd = gasCostEth * this.tokenPrices.get(config.nativeToken);
        
        // Calculate reward in USD
        const tokenPrice = config.nativeToken === 'ETH' 
          ? this.tokenPrices.get('ETH') 
          : this.tokenPrices.get('MATIC') || 1;
        
        const rewardUsd = rewardAmount * tokenPrice;
        const netProfit = rewardUsd - gasCostUsd;
        
        if (netProfit < this.minProfitUsd) {
          return null;
        }

        return {
          taskId,
          network,
          networkName: config.name,
          executor,
          rewardAmount,
          rewardUsd,
          gasCostEth,
          gasCostUsd,
          netProfit,
          profitPercent: (netProfit / rewardUsd) * 100,
          gasEstimate,
          nativeToken: config.nativeToken,
          timestamp: Date.now(),
          source: 'gelato_api'
        };
        
      } catch (error) {
        return null;
      }
      
    } catch (error) {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL EXPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  async exportSignal(opportunity) {
    const signalData = {
      source: 'gelato_scanner',
      network: opportunity.network,
      type: 'gelato_automate',
      
      tokenIn: opportunity.nativeToken,
      tokenOut: opportunity.nativeToken,
      dex: 'Gelato Automate',
      poolAddress: opportunity.executor,
      
      estimatedProfitUsd: opportunity.netProfit,
      estimatedProfitPercent: opportunity.profitPercent,
      
      confidence: this.calculateConfidence(opportunity),
      gasCostUsd: opportunity.gasCostUsd,
      minCapitalRequired: opportunity.gasCostUsd * 1.2,
      
      executionPath: [
        { 
          step: 'executeTask', 
          target: opportunity.executor, 
          data: opportunity.taskId 
        }
      ],
      
      rawData: {
        taskId: opportunity.taskId,
        rewardUsd: opportunity.rewardUsd,
        gasEstimate: opportunity.gasEstimate,
        networkName: opportunity.networkName,
        isZeroGas: true
      }
    };

    try {
      const response = await axios.post(this.signalHubUrl, signalData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.internalApiKey
        },
        timeout: 10000
      });

      if (response.data?.success) {
        this.stats.signalsExported++;
        this.stats.estimatedRevenue += 0.01;
        
        console.log(`   📤 Signal: ${response.data?.signal_id?.slice(0, 20)}...`);
        console.log(`      🎯 Delivery est.: ${response.data?.estimated_delivery || 0} users`);
        
        return response.data.signal_id;
      }
    } catch (error) {
      console.warn(`   ⚠️ SignalHub offline: ${error.message}`);
      await this.storeLocalSignal(signalData);
    }
  }

  calculateConfidence(opp) {
    let conf = 0.5;
    if (opp.netProfit > 10) conf += 0.2;
    if (opp.netProfit > 5) conf += 0.1;
    if (opp.profitPercent > 50) conf += 0.1;
    if (opp.gasCostUsd < opp.rewardUsd * 0.2) conf += 0.1;
    return Math.min(0.95, conf);
  }

  async storeLocalSignal(signalData) {
    if (this.supabase) {
      try {
        await this.supabase.from('pending_signals').insert({
          source: signalData.source,
          data: signalData,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  
  async scanNetwork(network) {
    const opportunities = [];
    
    const tasks = await this.scanViaApi(network);
    this.stats.scanned += tasks.length;
    
    for (const task of tasks) {
      const opp = await this.analyzeTask(task, network);
      if (opp) {
        opportunities.push(opp);
        
        // Export signal
        await this.exportSignal(opp);
        
        // Log to database
        await this.saveToDatabase(opp);
        
        console.log(`   💰 $${opp.netProfit.toFixed(2)} profit (${opp.profitPercent.toFixed(1)}%)`);
      }
    }
    
    return opportunities;
  }

  async saveToDatabase(opportunity) {
    if (!this.supabase) return;
    
    try {
      await this.supabase.from('keeper_rewards').insert({
        task_id: opportunity.taskId,
        network: opportunity.network,
        source: 'gelato_scanner_v2',
        reward_usd: opportunity.rewardUsd,
        gas_cost_usd: opportunity.gasCostUsd,
        net_profit_usd: opportunity.netProfit,
        status: 'detected',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Ignore
    }
  }

  async run() {
    await this.initialize();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🌙 SCANNING GELATO WITH SIGNAL EXPORT              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    let totalOpportunities = 0;

    for (const network of Object.keys(NETWORKS)) {
      const opps = await this.scanNetwork(network);
      totalOpportunities += opps.length;
      
      if (opps.length > 0) {
        console.log(`   🎯 ${opps.length} oportunidades em ${NETWORKS[network].name}`);
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              📊 RESUMO                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`   📦 Tasks: ${this.stats.scanned}`);
    console.log(`   💎 Oportunidades: ${totalOpportunities}`);
    console.log(`   📤 Sinais exportados: ${this.stats.signalsExported}`);
    console.log(`   💰 Receita estimada: $${this.stats.estimatedRevenue.toFixed(2)}`);
    console.log('');

    return this.stats;
  }

  async runDaemon() {
    await this.initialize();
    
    console.log('\n🌙 MODO DAEMON ATIVO - Ctrl+C para parar\n');
    
    // Run every 5 minutes
    while (true) {
      await this.run();
      console.log('\n⏰ Próximo scan em 5 minutos...\n');
      await new Promise(r => setTimeout(r, 300000));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
const scanner = new GelatoScannerEnhanced();

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];
  
  if (mode === 'daemon') {
    scanner.runDaemon().catch(console.error);
  } else {
    scanner.run()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Erro:', error);
        process.exit(1);
      });
  }
}

export { GelatoScannerEnhanced };
export default scanner;
