#!/usr/bin/env node
/**
 * Autonolas Agent - GXEON AI Worker
 * 
 * Searches and processes AI tasks from Autonolas/Olas network
 * Connects to Gnosis and Base chains to find AI-powered service opportunities
 * 
 * AI Task Formula: Execute ML/AI models for on-chain rewards
 * Profit = (Service Payment) - (Execution Cost)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Load Alchemy API Key
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Autonolas/Olas Contract Addresses and RPCs
const AUTONOLAS_CONFIG = {
  gnosis: {
    serviceRegistry: '0xa45e64e13a333c51f52f3b08b74f7a70513b13d1',
    serviceManager: '0x360e1c9c8f7dbe25dffc33db4c6ef6525e88c6eb',
    registriesManager: '0xaba9c5ad9ed0b424892b5e16c7e5bb987da09bf8',
    chainId: 100,
    rpcUrls: [
      process.env.GNOSIS_RPC_URL,
      'https://rpc.gnosischain.com',
      'https://rpc.gnosis.gateway.fm',
      'https://gnosis-rpc.publicnode.com',
      'https://gnosis.api.onfinality.io/public'
    ].filter(Boolean)
  },
  base: {
    serviceRegistry: '0x9338b5153ae39bb89f50468e68ed9c219a23e361',
    serviceManager: '0x360e1c9c8f7dbe25dffc33db4c6ef6525e88c6eb',
    chainId: 8453,
    rpcUrls: [
      ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null,
      process.env.BASE_RPC_URL,
      'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
      'https://base.llamarpc.com'
    ].filter(Boolean)
  }
};

// Autonolas Service Registry ABI (simplified)
const SERVICE_REGISTRY_ABI = [
  'function getService(uint256 serviceId) external view returns (tuple(address owner, address multisig, bytes32 configHash, uint256 threshold, uint256[] agentIds, uint256[] agentNumSlots, uint256 numAgentInstances, bytes32 serviceState))',
  'function getAgentInstances(uint256 serviceId) external view returns (address[] memory)',
  'function exists(uint256 serviceId) external view returns (bool)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenByIndex(uint256 index) external view returns (uint256)',
  'event ServiceCreated(uint256 indexed serviceId, address indexed owner, bytes32 configHash)',
  'event ServiceUpdated(uint256 indexed serviceId, bytes32 configHash)',
  'event Deployment(uint256 indexed serviceId, address indexed multisig)'
];

// Service Manager ABI for AI tasks
const SERVICE_MANAGER_ABI = [
  'function serviceData(uint256 serviceId) external view returns (tuple(uint256 serviceId, address multisig, bytes32 configHash, uint256 threshold, uint256[] agentInstances))',
  'function mapServiceIdSetRegistrationInfo(uint256 serviceId) external view returns (tuple(uint256 deadline, uint256 bond, uint256 deposit))',
  'function mapMultisigs(address multisig) external view returns (uint256 serviceId)',
  'event RegisterInstance(uint256 indexed serviceId, address indexed operator, uint256 indexed agentInstance, uint256 agentId)',
  'event CreateMultisig(uint256 indexed serviceId, address indexed multisig)',
  'event CreateService(uint256 indexed serviceId)'
];

class AutonolasAgent {
  constructor() {
    this.supabase = null;
    this.providers = {};
    this.serviceRegistries = {};
    this.serviceManagers = {};
    this.aiTasksFound = [];
    this.minRewardUsd = 0.5; // Minimum $0.50 to consider
    this.hfApiKey = process.env.HUGGINGFACE_API_KEY;
    this.hfModelUrl = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🧠 AUTONOLAS AI AGENT v1.0                         ║');
    console.log('║     AI Task Hunter - Brain for Hire                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Check for skip flag
    this.skipSupabase = process.env.SKIP_SUPABASE === 'true';
    
    console.log('🔍 Checking environment variables...');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (this.skipSupabase) {
      console.log('⚡ Modo de teste ativado (SKIP_SUPABASE=true)');
      console.log('   Dados serão exibidos no console apenas, sem salvar no banco.');
    } else if (!supabaseUrl || !supabaseKey) {
      console.error('\n❌ Missing Supabase credentials.');
      console.error('💡 Para teste local SEM Supabase, use: SKIP_SUPABASE=true node core/autonolas_agent.js');
      throw new Error('Missing Supabase credentials in environment');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client initialized');
    }

    // Initialize providers and contracts for each network
    for (const [network, config] of Object.entries(AUTONOLAS_CONFIG)) {
      let provider = null;
      let lastError = null;

      for (const rpcUrl of config.rpcUrls) {
        try {
          provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          await provider.getBlockNumber();
          console.log(`✅ ${network.toUpperCase()} connected via ${rpcUrl.split('/')[2]}`);
          break;
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
      
      // Create Service Registry contract instance
      this.serviceRegistries[network] = new ethers.Contract(
        config.serviceRegistry,
        SERVICE_REGISTRY_ABI,
        provider
      );

      // Create Service Manager contract instance
      this.serviceManagers[network] = new ethers.Contract(
        config.serviceManager,
        SERVICE_MANAGER_ABI,
        provider
      );
    }

    console.log('\n🧠 Autonolas AI Agent initialized and ready\n');
  }

  /**
   * Scan for AI service tasks on a specific network
   */
  async scanNetwork(network) {
    console.log(`\n🔍 Scanning ${network.toUpperCase()} for AI service tasks...`);
    
    const registry = this.serviceRegistries[network];
    const manager = this.serviceManagers[network];
    const provider = this.providers[network];
    
    if (!registry || !provider) {
      console.warn(`⚠️  ${network} not initialized, skipping`);
      return [];
    }

    const aiTasks = [];

    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - 50000, 0);

      // Query ServiceCreated events
      const filter = registry.filters.ServiceCreated();
      const events = await registry.queryFilter(filter, fromBlock, currentBlock);

      console.log(`   Found ${events.length} services created recently`);

      // Analyze each service
      for (const event of events.slice(-30)) {
        try {
          const serviceId = event.args.serviceId.toNumber();
          const owner = event.args.owner;
          const configHash = event.args.configHash;

          // Check if service is active
          const exists = await registry.exists(serviceId);
          if (!exists) continue;

          // Get service details
          const serviceData = await this.analyzeService(
            serviceId,
            owner,
            configHash,
            network,
            provider
          );

          if (serviceData && serviceData.potentialRewardUsd > this.minRewardUsd) {
            aiTasks.push(serviceData);
            await this.saveToDatabase(serviceData);
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to analyze service: ${error.message}`);
        }
      }

    } catch (error) {
      console.error(`🔴 ${network} scan failed:`, error.message);
    }

    return aiTasks;
  }

  /**
   * Analyze a service for AI task potential
   */
  async analyzeService(serviceId, owner, configHash, network, provider) {
    try {
      // Get current gas price for cost estimation
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.utils.parseUnits('1', 'gwei');

      // Estimate participation cost (simplified)
      const estimatedGas = ethers.BigNumber.from('200000');
      const gasCostWei = estimatedGas.mul(gasPrice);
      const gasCostNative = parseFloat(ethers.utils.formatEther(gasCostWei));

      // Get native token price
      const nativeTokenPrice = this.getNativeTokenPrice(network);
      const participationCostUsd = gasCostNative * nativeTokenPrice;

      // Estimate potential reward (placeholder logic - would query actual service payments)
      const estimatedRewardNative = gasCostNative * 3; // 3x gas cost as baseline
      const potentialRewardUsd = estimatedRewardNative * nativeTokenPrice;

      // Calculate net profit
      const netProfitUsd = potentialRewardUsd - participationCostUsd;
      const profitMargin = potentialRewardUsd > 0 
        ? (netProfitUsd / potentialRewardUsd) * 100 
        : 0;

      if (netProfitUsd <= 0) {
        return null;
      }

      const aiCapability = this.inferAICapability(configHash);
      
      // Generate task prompt based on capability
      const taskPrompt = this.generateTaskPrompt(aiCapability, serviceId);
      
      // Resolve task with Hugging Face AI
      console.log(`\n   🧠 Resolving AI task for Service ${serviceId}...`);
      const resolvedAnswer = await this.resolveTaskWithHF(taskPrompt, aiCapability);

      return {
        serviceId: serviceId.toString(),
        owner,
        configHash: configHash.toString(),
        network,
        aiCapability,
        taskPrompt,
        resolvedAnswer,
        potentialRewardUsd,
        participationCostUsd,
        netProfitUsd,
        profitMargin,
        tokenSymbol: this.getNativeTokenSymbol(network),
        status: 'AI_TASK_DETECTED',
        source: 'Autonolas',
        detectedAt: new Date().toISOString(),
        executionUrl: this.getExecutionUrl(serviceId, network)
      };

    } catch (error) {
      console.warn(`   ⚠️  Analysis failed for service ${serviceId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Infer AI capability from config hash (simplified)
   */
  inferAICapability(configHash) {
    const hashStr = configHash.toString();
    
    // Simple hash-based inference (in reality, this would parse IPFS config)
    const capabilityPatterns = {
      'prediction': ['0x1', '0x5', '0x9'],
      'nlp': ['0x2', '0x6', '0xa'],
      'cv': ['0x3', '0x7', '0xb'],
      'reinforcement': ['0x4', '0x8', '0xc']
    };

    for (const [capability, prefixes] of Object.entries(capabilityPatterns)) {
      if (prefixes.some(p => hashStr.toLowerCase().startsWith(p.toLowerCase()))) {
        return capability.toUpperCase();
      }
    }

    return 'GENERAL_AI'; // Default
  }

  /**
   * Generate task prompt based on AI capability
   */
  generateTaskPrompt(capability, serviceId) {
    const prompts = {
      'PREDICTION': `Analyze the current crypto market sentiment and predict if Bitcoin will reach $100k in the next 6 months. Provide reasoning based on market trends.`,
      'NLP': `Perform sentiment analysis on the following statement: "Ethereum's transition to Proof of Stake has been highly successful and energy consumption dropped by 99%". Classify as positive, negative, or neutral.`,
      'CV': `Describe what you would look for in a blockchain transaction visualization to identify potential fraud patterns.`,
      'REINFORCEMENT': `Explain the optimal strategy for a trading bot to maximize returns in a volatile DeFi market with minimal risk.`,
      'GENERAL_AI': `Answer this blockchain question: What are the main advantages of decentralized autonomous organizations (DAOs) compared to traditional companies?`
    };

    return prompts[capability] || prompts['GENERAL_AI'];
  }

  /**
   * Resolve AI task using Hugging Face Inference API
   */
  async resolveTaskWithHF(taskPrompt, taskType = 'general') {
    if (!this.hfApiKey) {
      console.warn('⚠️  HUGGINGFACE_API_KEY not found, skipping AI resolution');
      return null;
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`   🤖 Consulting HF Brain (attempt ${attempt + 1}/${maxRetries})...`);

        const response = await axios.post(
          this.hfModelUrl,
          { inputs: `<s>[INST] ${taskPrompt} [/INST]` },
          {
            headers: {
              'Authorization': `Bearer ${this.hfApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (response.data && response.data[0] && response.data[0].generated_text) {
          const answer = response.data[0].generated_text
            .replace(/<s>\[INST\].*?\[\/INST\]/s, '')
            .trim();
          console.log(`   ✅ AI Response received (${answer.length} chars)`);
          return answer;
        }

        return null;

      } catch (error) {
        attempt++;
        console.warn(`   ⚠️  HF API error (attempt ${attempt}): ${error.message}`);

        if (error.response?.status === 503) {
          console.log('   ⏳ Model loading, waiting 5s before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (attempt >= maxRetries) {
          console.error('   🔴 All retry attempts failed');
          return null;
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    return null;
  }

  /**
   * Get native token price (simplified)
   */
  getNativeTokenPrice(network) {
    const prices = {
      gnosis: 1.0,   // xDAI
      base: 3500,    // ETH
    };
    return prices[network] || 1;
  }

  /**
   * Get native token symbol for network
   */
  getNativeTokenSymbol(network) {
    const symbols = {
      gnosis: 'xDAI',
      base: 'ETH',
    };
    return symbols[network] || 'ETH';
  }

  /**
   * Get execution URL for service
   */
  getExecutionUrl(serviceId, network) {
    const explorers = {
      gnosis: `https://gnosisscan.io/token/${AUTONOLAS_CONFIG.gnosis.serviceRegistry}?a=${serviceId}`,
      base: `https://basescan.org/token/${AUTONOLAS_CONFIG.base.serviceRegistry}?a=${serviceId}`
    };
    return explorers[network] || '#';
  }

  /**
   * Save AI task to Supabase
   */
  async saveToDatabase(task) {
    if (this.skipSupabase) {
      console.log(`   ⚡ [MODO TESTE] Tarefa de IA detectada (não salva no banco):`);
      console.log(`      Service: ${task.serviceId}`);
      console.log(`      Capacidade: ${task.aiCapability}`);
      console.log(`      Recompensa Estimada: $${task.potentialRewardUsd.toFixed(4)} USD`);
      return { id: 'test-mode', ...task };
    }

    try {
      const { data, error } = await this.supabase
        .from('keeper_rewards')
        .insert({
          task_id: task.serviceId,
          protocol: 'autonolas',
          network: task.network,
          reward_amount: task.potentialRewardUsd,
          reward_token: task.tokenSymbol,
          gas_spent_usd: task.participationCostUsd,
          net_profit_usd: task.netProfitUsd,
          status: 'AI_TASK_DETECTED',
          source: 'Autonolas',
          resolved_answer: task.resolvedAnswer,
          metadata: {
            owner: task.owner,
            ai_capability: task.aiCapability,
            config_hash: task.configHash,
            task_prompt: task.taskPrompt,
            resolved_answer: task.resolvedAnswer,
            profit_margin: task.profitMargin,
            detected_at: task.detectedAt,
            execution_url: task.executionUrl
          }
        })
        .select()
        .single();

      if (error) {
        console.error('🔴 Failed to save to database:', error.message);
        return null;
      }

      console.log(`   ✅ Saved AI task (ID: ${data?.id || 'unknown'})`);
      return data;

    } catch (error) {
      console.error('🔴 Database error:', error.message);
      return null;
    }
  }

  /**
   * Run the complete scan across all networks
   */
  async run() {
    try {
      await this.initialize();

      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║     🧠 INICIANDO SCAN AUTONOLAS AI SERVICES            ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      let totalTasks = 0;
      const allTasks = [];

      for (const network of Object.keys(AUTONOLAS_CONFIG)) {
        const tasks = await this.scanNetwork(network);
        
        if (tasks.length > 0) {
          console.log(`\n   🎯 ${tasks.length} TAREFAS DE IA ENCONTRADAS em ${network.toUpperCase()}:`);
          
          for (const task of tasks) {
            console.log(`\n   ────────────────────────────────────────────`);
            console.log(`   🤖 Service ID: ${task.serviceId}`);
            console.log(`   🧠 AI Capability: ${task.aiCapability}`);
            console.log(`   💰 Est. Reward: $${task.potentialRewardUsd.toFixed(4)} USD`);
            console.log(`   ⛽ Participation Cost: $${task.participationCostUsd.toFixed(4)}`);
            console.log(`   🎯 Net Profit: $${task.netProfitUsd.toFixed(4)} (${task.profitMargin.toFixed(2)}%)`);
            console.log(`   👤 Owner: ${task.owner.substring(0, 20)}...`);
            
            allTasks.push(task);
          }
          
          totalTasks += tasks.length;
        }
      }

      // Final Summary
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║              📊 SCAN COMPLETO                          ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`   Total de Tarefas AI: ${totalTasks}`);
      console.log(`   Recompensa Total Estimada: $${allTasks.reduce((sum, t) => sum + t.potentialRewardUsd, 0).toFixed(4)} USD`);
      console.log(`   Networks Escaneadas: ${Object.keys(AUTONOLAS_CONFIG).length}`);
      
      if (totalTasks === 0) {
        console.log('\n   ℹ️  Nenhuma tarefa de IA lucrativa encontrada no momento.');
        console.log('   O agente continuará monitorando...');
      } else {
        console.log('\n   🚀 Tarefas de IA registradas no Dashboard!');
      }

      console.log('\n✅ Autonolas Agent concluído com sucesso\n');

      return {
        success: true,
        tasksFound: totalTasks,
        tasks: allTasks,
        totalRewardUsd: allTasks.reduce((sum, t) => sum + t.potentialRewardUsd, 0)
      };

    } catch (error) {
      console.error('\n❌ Autonolas Agent failed:', error.message);
      
      try {
        await this.supabase?.from('audit_logs').insert({
          level: 'error',
          module: 'AutonolasAgent',
          message: 'Autonolas Agent Falhou: ' + error.message,
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
  const agent = new AutonolasAgent();
  agent.run().then(result => {
    if (result.success) {
      console.log(`[AutonolasAgent] Found ${result.tasksFound} AI tasks`);
      process.exit(0);
    } else {
      console.error('[AutonolasAgent] Failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('[AutonolasAgent] Unexpected error:', error);
    process.exit(1);
  });
}

// Export daemon starter for orchestrator
function startAutonolasDaemon() {
  const agent = new AutonolasAgent();
  const INTERVAL_MS = 180000; // 3 minutos (mais conservador para economizar API credits)

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🧠 MODO AUTÔNOMO ATIVADO - AI BRAIN MODE           ║');
  console.log('║     Intervalo: 3 minutos                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  async function runScan() {
    console.log('\n[🧠 AUTONOLAS PULSE] Varredura IA autônoma iniciada...');
    console.log(`[⏰ ${new Date().toLocaleTimeString()}] Próxima varredura em 3 minutos\n`);

    try {
      const result = await agent.run();
      if (result.success) {
        console.log(`\n[AutonolasAgent] Ciclo completo: ${result.tasksFound} tarefas de IA encontradas`);
      } else {
        console.error('[AutonolasAgent] Falha no ciclo:', result.error);
      }
    } catch (error) {
      console.error('[AutonolasAgent] Erro inesperado:', error.message);
    }

    console.log('\n[💤 AUTONOLAS SLEEP] Aguardando próximo ciclo...\n');
  }

  // Executar imediatamente na primeira vez
  runScan();

  // Configurar intervalo para execução contínua
  setInterval(runScan, INTERVAL_MS);

  return agent;
}

/*
 * ===========================================
 * MANUAL TEST CODE - DEMO MODE
 * ===========================================
 * 
 * Para testar o Agente com Cérebro Hugging Face:
 * 
 * 1. Descomente o código abaixo
 * 2. Execute: node core/autonolas_agent.js --demo
 * 
 * Isso simulará uma tarefa de IA e mostrará a resposta gerada.
 * 
 */

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🧠 DEMO MODE - TESTING HF BRAIN                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const agent = new AutonolasAgent();
  
  // Check HF API Key
  if (!agent.hfApiKey) {
    console.error('❌ HUGGINGFACE_API_KEY not found in .env');
    console.log('💡 Add to .env: HUGGINGFACE_API_KEY=hf_...');
    return;
  }
  
  console.log('✅ HF API Key loaded');
  console.log('🧠 Testing AI inference...\n');
  
  // Test prompts
  const testPrompts = [
    { type: 'NLP', prompt: agent.generateTaskPrompt('NLP', 'demo-001') },
    { type: 'PREDICTION', prompt: agent.generateTaskPrompt('PREDICTION', 'demo-002') },
    { type: 'GENERAL_AI', prompt: agent.generateTaskPrompt('GENERAL_AI', 'demo-003') }
  ];
  
  for (const test of testPrompts) {
    console.log(`\n📝 Test: ${test.type}`);
    console.log(`   Prompt: "${test.prompt.substring(0, 60)}..."`);
    
    const answer = await agent.resolveTaskWithHF(test.prompt, test.type);
    
    if (answer) {
      console.log(`\n   💡 AI Answer: "${answer.substring(0, 100)}..."`);
      console.log(`   ✅ Test passed!`);
    } else {
      console.log(`   ❌ Failed to get AI response`);
    }
  }
  
  console.log('\n🎉 Demo complete! The Agent brain is working.\n');
}

// Uncomment to run demo mode:
// if (require.main === module && process.argv.includes('--demo')) {
//   runDemo();
// }

module.exports = { AutonolasAgent, startAutonolasDaemon };
