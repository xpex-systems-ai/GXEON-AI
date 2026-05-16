#!/usr/bin/env node
/**
 * Gelato Scanner Agent - GXEON
 * 
 * Scans Gelato Automate for sponsored (Zero-Gas) tasks
 * Identifies profitable keeper opportunities with gas paid by sponsor
 * 
 * Zero-Gas Formula: Task pays executor in native tokens for execution
 * Profit = (Reward Amount) - (Execution Gas Cost)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// Load Alchemy API Key
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Gelato Automate Contract Addresses with Alchemy VIP RPCs
const GELATO_AUTOMATE = {
  polygon: {
    automate: '0x527a819db1eb0e34426297b03ba11b5842b8d8de',
    taskTreasury: '0x6c3224d0d52d965815d42f66fd7c61b39e354b39',
    chainId: 137,
    rpcUrls: [
      ALCHEMY_API_KEY ? `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null,
      process.env.POLYGON_RPC_URL,
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.llamarpc.com'
    ].filter(Boolean)
  },
  ethereum: {
    automate: '0x6c3224d0d52d965815d42f66fd7c61b39e354b39',
    taskTreasury: '0x6c3224d0d52d965815d42f66fd7c61b39e354b39',
    chainId: 1,
    rpcUrls: [
      ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null,
      process.env.ETHEREUM_RPC_URL,
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com'
    ].filter(Boolean)
  },
  arbitrum: {
    automate: '0x6c3224d0d52d965815d42f66fd7c61b39e354b39',
    chainId: 42161,
    rpcUrls: [
      ALCHEMY_API_KEY ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null,
      process.env.ARBITRUM_RPC_URL,
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com'
    ].filter(Boolean)
  }
};

// Gelato Automate ABI (simplified for scanning)
const AUTOMATE_ABI = [
  'function getTaskIdsByUser(address _taskCreator) external view returns (bytes32[] memory)',
  'function getTask(bytes32 _taskId) external view returns (tuple(address execAddress, bytes execData, bytes32 moduleData, uint256 gelatoFee, uint256 executorFee, uint256 executionInterval, uint256 lastExecutionTime, uint256 nextExecutionTime, bool isActive))',
  'function taskModule(bytes32 _taskId) external view returns (address)',
  'event TaskCreated(bytes32 indexed taskId, address indexed taskCreator, address indexed execAddress)',
  'event TaskExecuted(bytes32 indexed taskId, address indexed executor, address indexed execAddress, uint256 fee)',
  'event TaskCancelled(bytes32 indexed taskId)'
];

class GelatoScannerAgent {
  constructor() {
    this.supabase = null;
    this.providers = {};
    this.automateContracts = {};
    this.opportunitiesFound = [];
    this.minProfitUsd = 0.01; // Minimum $0.01 profit to consider
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🎯 GELATO SCANNER AGENT v1.0                       ║');
    console.log('║     Zero-Gas Task Hunter                             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Check for skip flag
    this.skipSupabase = process.env.SKIP_SUPABASE === 'true';
    
    // Debug: Show available env vars (masked)
    console.log('🔍 Checking environment variables...');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_PROJECT_URL:', process.env.SUPABASE_PROJECT_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (this.skipSupabase) {
      console.log('⚡ Modo de teste ativado (SKIP_SUPABASE=true)');
      console.log('   Dados serão exibidos no console apenas, sem salvar no banco.');
    } else if (!supabaseUrl || !supabaseKey) {
      console.error('\n❌ Missing Supabase credentials. Checked:');
      console.error('   - SUPABASE_URL or SUPABASE_PROJECT_URL');
      console.error('   - SUPABASE_SERVICE_ROLE_KEY');
      console.error('\n💡 Para teste local SEM Supabase, use: SKIP_SUPABASE=true node core/gelato_scanner.js');
      throw new Error('Missing Supabase credentials in environment');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client initialized');
    }

    // Initialize providers and contracts for each network with fallback RPCs
    for (const [network, config] of Object.entries(GELATO_AUTOMATE)) {
      let provider = null;
      let lastError = null;

      // Try each RPC endpoint until one works
      for (const rpcUrl of config.rpcUrls) {
        try {
          provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          // Test connection by getting block number
          await provider.getBlockNumber();
          console.log(`✅ ${network.toUpperCase()} connected via ${rpcUrl.split('/')[2]}`);
          break; // Success - exit the loop
        } catch (error) {
          lastError = error;
          console.warn(`⚠️  ${network} RPC failed (${rpcUrl.split('/')[2]}): ${error.message}`);
          provider = null;
        }
      }

      if (!provider) {
        console.error(`🔴 ${network.toUpperCase()} failed all RPC endpoints: ${lastError?.message}`);
        continue;
      }

      this.providers[network] = provider;
      
      // Create Automate contract instance
      this.automateContracts[network] = new ethers.Contract(
        config.automate,
        AUTOMATE_ABI,
        provider
      );
    }

    console.log('\n🔍 Gelato Scanner initialized and ready\n');
  }

  /**
   * Scan for sponsored (Zero-Gas) tasks on a specific network
   */
  async scanNetwork(network) {
    console.log(`\n🔍 Scanning ${network.toUpperCase()} for Zero-Gas tasks...`);
    
    const automate = this.automateContracts[network];
    const provider = this.providers[network];
    
    if (!automate || !provider) {
      console.warn(`⚠️  ${network} not initialized, skipping`);
      return [];
    }

    const opportunities = [];

    try {
      // Get current block for recent events
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - 10000, 0); // Last ~10k blocks

      // Query TaskCreated events
      const filter = automate.filters.TaskCreated();
      const events = await automate.queryFilter(filter, fromBlock, currentBlock);

      console.log(`   Found ${events.length} tasks created recently`);

      // Analyze each task
      for (const event of events.slice(-20)) { // Check last 20 tasks
        try {
          const taskId = event.args.taskId;
          const taskCreator = event.args.taskCreator;
          const execAddress = event.args.execAddress;

          // Get task details
          const taskDetails = await automate.getTask(taskId);
          
          // Skip inactive tasks
          if (!taskDetails.isActive) continue;

          // Check if task has executor fee (sponsored)
          if (taskDetails.executorFee > 0) {
            const opportunity = await this.analyzeTask(
              taskId,
              taskCreator,
              execAddress,
              taskDetails,
              network,
              provider
            );

            if (opportunity && opportunity.profitUsd > this.minProfitUsd) {
              opportunities.push(opportunity);
              
              // Save to Supabase
              await this.saveToDatabase(opportunity);
            }
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to analyze task: ${error.message}`);
        }
      }

    } catch (error) {
      console.error(`🔴 ${network} scan failed:`, error.message);
    }

    return opportunities;
  }

  /**
   * Analyze a single Gelato task for profit potential
   */
  async analyzeTask(taskId, taskCreator, execAddress, taskDetails, network, provider) {
    try {
      // Get gas estimate for execution
      const gasEstimate = await this.estimateExecutionGas(
        execAddress,
        taskDetails.execData,
        provider
      );

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.utils.parseUnits('30', 'gwei');

      // Calculate gas cost
      const gasCostWei = gasEstimate.mul(gasPrice);
      const gasCostEth = parseFloat(ethers.utils.formatEther(gasCostWei));

      // Get token price (simplified - using hardcoded for demo)
      const nativeTokenPrice = this.getNativeTokenPrice(network);
      const gasCostUsd = gasCostEth * nativeTokenPrice;

      // Executor fee in native token
      const executorFeeEth = parseFloat(
        ethers.utils.formatEther(taskDetails.executorFee)
      );
      const executorFeeUsd = executorFeeEth * nativeTokenPrice;

      // Calculate net profit
      const profitUsd = executorFeeUsd - gasCostUsd;
      const profitPercent = executorFeeUsd > 0 
        ? (profitUsd / executorFeeUsd) * 100 
        : 0;

      // Only return if profitable
      if (profitUsd <= 0) {
        return null;
      }

      return {
        taskId: taskId.toString(),
        taskCreator,
        execAddress,
        network,
        executorFeeEth,
        executorFeeUsd,
        gasEstimate: gasEstimate.toString(),
        gasCostEth,
        gasCostUsd,
        profitUsd,
        profitPercent,
        executionInterval: taskDetails.executionInterval.toString(),
        lastExecutionTime: taskDetails.lastExecutionTime.toString(),
        nextExecutionTime: taskDetails.nextExecutionTime.toString(),
        status: 'DETECTED',
        scannedAt: new Date().toISOString()
      };

    } catch (error) {
      console.warn(`   ⚠️  Analysis failed for ${taskId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Estimate gas for task execution
   */
  async estimateExecutionGas(execAddress, execData, provider) {
    try {
      const estimatedGas = await provider.estimateGas({
        to: execAddress,
        data: execData,
        value: 0
      });
      // Add 20% buffer
      return estimatedGas.mul(120).div(100);
    } catch (error) {
      // Return conservative estimate if estimation fails
      return ethers.BigNumber.from('500000');
    }
  }

  /**
   * Get native token price (simplified)
   */
  getNativeTokenPrice(network) {
    const prices = {
      polygon: 0.50,    // MATIC
      ethereum: 3500,   // ETH
      arbitrum: 3500,   // ETH
    };
    return prices[network] || 1;
  }

  /**
   * Save opportunity to Supabase with DETECTED status
   */
  async saveToDatabase(opportunity) {
    // Skip database if in test mode
    if (this.skipSupabase) {
      console.log(`   ⚡ [MODO TESTE] Oportunidade detectada (não salva no banco):`);
      console.log(`      Task: ${opportunity.taskId.substring(0, 20)}...`);
      console.log(`      Lucro: $${opportunity.profitUsd.toFixed(4)} USD`);
      return { id: 'test-mode', ...opportunity };
    }

    try {
      const { data, error } = await this.supabase
        .from('keeper_rewards')
        .insert({
          task_id: opportunity.taskId,
          protocol: 'gelato',
          network: opportunity.network,
          reward_amount: opportunity.executorFeeEth,
          reward_token: this.getNativeTokenSymbol(opportunity.network),
          gas_spent_usd: opportunity.gasCostUsd,
          net_profit_usd: opportunity.profitUsd,
          status: 'DETECTED',
          metadata: {
            task_creator: opportunity.taskCreator,
            exec_address: opportunity.execAddress,
            profit_percent: opportunity.profitPercent,
            execution_interval: opportunity.executionInterval,
            scanned_at: opportunity.scannedAt
          }
        })
        .select()
        .single();

      if (error) {
        console.error('🔴 Failed to save to database:', error.message);
        return null;
      }

      console.log(`   ✅ Saved opportunity (ID: ${data?.id || 'unknown'})`);
      return data;

    } catch (error) {
      console.error('🔴 Database error:', error.message);
      return null;
    }
  }

  /**
   * Get native token symbol for network
   */
  getNativeTokenSymbol(network) {
    const symbols = {
      polygon: 'MATIC',
      ethereum: 'ETH',
      arbitrum: 'ETH',
    };
    return symbols[network] || 'ETH';
  }

  /**
   * Run the complete scan across all networks
   */
  async run() {
    try {
      await this.initialize();

      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║     🔍 INICIANDO SCAN GELATO ZERO-GAS                  ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      let totalOpportunities = 0;
      const allOpportunities = [];

      // Scan each network
      for (const network of Object.keys(GELATO_AUTOMATE)) {
        const opportunities = await this.scanNetwork(network);
        
        if (opportunities.length > 0) {
          console.log(`\n   🎯 ${opportunities.length} OPORTUNIDADES ENCONTRADAS em ${network.toUpperCase()}:`);
          
          for (const opp of opportunities) {
            console.log(`\n   ────────────────────────────────────────────`);
            console.log(`   📋 Task ID: ${opp.taskId}`);
            console.log(`   💰 Reward: ${opp.executorFeeEth.toFixed(6)} ${this.getNativeTokenSymbol(network)} ($${opp.executorFeeUsd.toFixed(4)})`);
            console.log(`   ⛽ Gas Cost: $${opp.gasCostUsd.toFixed(4)}`);
            console.log(`   🎯 Net Profit: $${opp.profitUsd.toFixed(4)} (${opp.profitPercent.toFixed(2)}%)`);
            console.log(`   📍 Exec Address: ${opp.execAddress.substring(0, 20)}...`);
            
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
      console.log(`   Networks Escaneadas: ${Object.keys(GELATO_AUTOMATE).length}`);
      
      if (totalOpportunities === 0) {
        console.log('\n   ℹ️  Nenhuma oportunidade Zero-Gas encontrada no momento.');
        console.log('   O scanner continuará monitorando...');
      } else {
        console.log('\n   🚀 Oportunidades registradas no Dashboard!');
      }

      console.log('\n✅ Gelato Scanner concluído com sucesso\n');

      return {
        success: true,
        opportunitiesFound: totalOpportunities,
        opportunities: allOpportunities,
        totalProfitUsd: allOpportunities.reduce((sum, o) => sum + o.profitUsd, 0)
      };

    } catch (error) {
      console.error('\n❌ Gelato Scanner failed:', error.message);
      
      // Log error to Supabase
      try {
        await this.supabase?.from('audit_logs').insert({
          level: 'error',
          module: 'GelatoScanner',
          message: 'Gelato Scanner Falhou: ' + error.message,
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
  const agent = new GelatoScannerAgent();
  const INTERVAL_MS = 120000; // 2 minutos

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🤖 MODO AUTÔNOMO ATIVADO - DAEMON MODE           ║');
  console.log('║     Intervalo: 2 minutos                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Executar imediatamente na primeira vez
  runScan();

  // Configurar intervalo para execução contínua
  setInterval(runScan, INTERVAL_MS);

  async function runScan() {
    console.log('\n[⚡ GXEON PULSE] Varredura autônoma iniciada...');
    console.log(`[⏰ ${new Date().toLocaleTimeString()}] Próxima varredura em 2 minutos\n`);

    try {
      const result = await agent.run();
      if (result.success) {
        console.log(`\n[GelatoScanner] Ciclo completo: ${result.opportunitiesFound} tarefas encontradas`);
      } else {
        console.error('[GelatoScanner] Falha no ciclo:', result.error);
      }
    } catch (error) {
      console.error('[GelatoScanner] Erro inesperado:', error.message);
    }

    console.log('\n[💤 GXEON SLEEP] Aguardando próximo ciclo...\n');
  }
}

// Export daemon starter for orchestrator
function startGelatoDaemon() {
  const agent = new GelatoScannerAgent();
  const INTERVAL_MS = 120000; // 2 minutos

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🤖 MODO AUTÔNOMO ATIVADO - DAEMON MODE           ║');
  console.log('║     Intervalo: 2 minutos                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  async function runScan() {
    console.log('\n[⚡ GXEON PULSE] Varredura autônoma iniciada...');
    console.log(`[⏰ ${new Date().toLocaleTimeString()}] Próxima varredura em 2 minutos\n`);

    try {
      const result = await agent.run();
      if (result.success) {
        console.log(`\n[GelatoScanner] Ciclo completo: ${result.opportunitiesFound} tarefas encontradas`);
      } else {
        console.error('[GelatoScanner] Falha no ciclo:', result.error);
      }
    } catch (error) {
      console.error('[GelatoScanner] Erro inesperado:', error.message);
    }

    console.log('\n[💤 GXEON SLEEP] Aguardando próximo ciclo...\n');
  }

  // Executar imediatamente na primeira vez
  runScan();

  // Configurar intervalo para execução contínua
  setInterval(runScan, INTERVAL_MS);

  return agent;
}

module.exports = { GelatoScannerAgent, startGelatoDaemon };
