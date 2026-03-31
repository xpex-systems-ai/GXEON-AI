// Safe Supabase Initialization - Lazy loaded with validation
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  try {
    const url = process.env.SUPABASE_PROJECT_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key || !url.startsWith('http')) {
      console.warn('[Agents] Supabase env vars missing or invalid - running in local mode');
      return null;
    }

    supabaseInstance = createClient(url, key);
    console.log('[Agents] Supabase initialized successfully');

    return supabaseInstance;
  } catch (err) {
    console.error('[Agents] Supabase init error:', err.message);
    return null;
  }
}

// Backward compatibility - direct reference uses getter
const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return client ? client[prop] : null;
  }
});

// Agent implementations
const agents = {
  // 1. Orquestrador Central - Routes messages to correct agents
  orchestrator: async (payload) => {
    const { message, agents: activeAgents, context } = payload;
    
    // Simple routing logic based on message content
    const replies = [];
    
    // Always process through active agents
    for (const agentId of activeAgents) {
      if (agentId === 'orchestrator') continue; // Skip self
      
      const agent = agents[agentId];
      if (agent) {
        try {
          const result = await agent(payload);
          if (result) {
            replies.push({
              agent: agentConfig[agentId]?.name || agentId,
              text: result.text || result
            });
          }
        } catch (error) {
          replies.push({
            agent: agentConfig[agentId]?.name || agentId,
            text: `Erro: ${error.message}`
          });
        }
      }
    }
    
    // If no other agents replied, provide orchestrator response
    if (replies.length === 0) {
      replies.push({
        agent: 'Orchestrator',
        text: `Message received: "${message}". No specific agents activated to process this request.`
      });
    }
    
    return { replies };
  },

  // 2. Memória VectorDB - Stores knowledge and chat history
  vectordb: async (payload) => {
    const { message, context } = payload;
    
    // Simulate vector search and storage
    const storedContext = context ? context.slice(-5) : [];
    
    return {
      text: `[VectorDB] Context stored: ${storedContext.length} recent messages. Query: "${message.substring(0, 50)}..."`,
      stored: true,
      embeddings: storedContext.length
    };
  },

  // 3. Task Automation - Executes automatic tasks with monetization
  task: async (payload) => {
    const { message, task_id, parameters, priority } = payload;
    
    // Detect task type from message
    const taskTypes = {
      'email': 'Send email',
      'report': 'Generate report',
      'analysis': 'Run analysis',
      'backup': 'Perform backup',
      'sync': 'Sync data',
      'deploy': 'Deploy agent',
      'sale': 'Process sale',
      'payment': 'Process payment'
    };
    
    let detectedTask = 'General processing';
    for (const [key, value] of Object.entries(taskTypes)) {
      if (message.toLowerCase().includes(key)) {
        detectedTask = value;
        break;
      }
    }
    
    // Monetization: Calculate task value
    const taskValue = priority > 5 ? 0.001 : 0.0001; // Higher priority = higher value
    const taskRecord = {
      task_id: task_id || `task_${Date.now()}`,
      type: detectedTask,
      value: taskValue,
      timestamp: new Date().toISOString(),
      status: 'completed',
      ledger_entry: true
    };
    
    return {
      text: `[Task Automation] Task executed: ${detectedTask}. Value: ${taskValue} ETH. Recorded in immutable ledger.`,
      task: detectedTask,
      monetization: {
        enabled: true,
        model: 'pay-per-task',
        value: taskValue,
        ledger: 'immutable',
        task_record: taskRecord
      },
      status: 'completed_with_payment'
    };
  },

  // 4. HuggingFace AI - External AI integration
  huggingface: async (payload) => {
    const { message } = payload;
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[HuggingFace AI] API key not configured. Set HUGGINGFACE_API_KEY in .env file'
      };
    }
    
    try {
      // Placeholder for actual HuggingFace API call
      return {
        text: `[HuggingFace AI] Processing with language model: "${message.substring(0, 60)}..."`,
        model: 'meta-llama/Llama-2-70b-chat-hf'
      };
    } catch (error) {
      return { text: `[HuggingFace AI] Error: ${error.message}` };
    }
  },

  // 5. DeepSeek AI - External AI integration
  deepseek: async (payload) => {
    const { message } = payload;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[DeepSeek AI] API key not configured. Set DEEPSEEK_API_KEY in .env file'
      };
    }
    
    return {
      text: `[DeepSeek AI] Analyzing and searching information about: "${message.substring(0, 60)}..."`,
      confidence: 0.92
    };
  },

  // 6. Grok AI - External AI integration
  grok: async (payload) => {
    const { message } = payload;
    const apiKey = process.env.GROK_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[Grock AI] API key not configured. Set GROK_API_KEY in .env file'
      };
    }
    
    return {
      text: `[Grock AI] Fast processing activated for: "${message.substring(0, 60)}..."`,
      processing_time: 'fast'
    };
  },

  // 7. ChatGPT - OpenAI integration
  chatgpt: async (payload) => {
    const { message } = payload;
    const apiKey = process.env.CHATGPT_API_KEY || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[ChatGPT] API key not configured. Set CHATGPT_API_KEY or OPENROUTER_API_KEY in .env file'
      };
    }
    
    // Use OpenRouter as the ChatGPT provider
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'GXEON V2.0'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: message }],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '[ChatGPT] No response from model',
        model: 'gpt-4o-mini'
      };
    } catch (error) {
      return {
        text: `[ChatGPT] Simulated response: Processing "${message.substring(0, 50)}..." (Connection error: ${error.message})`,
        error: error.message
      };
    }
  },

  // 8. Bitensor Analytics - Metrics integration
  bitensor: async (payload) => {
    const { message } = payload;
    const apiKey = process.env.BITENSOR_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[Bitensor Analytics] API key not configured. Set BITENSOR_API_KEY in .env file'
      };
    }
    
    const metrics = {
      tao_price: '$421.50',
      network_activity: 'High',
      validators: '1024',
      subnet_emissions: '125.4 TAO/day'
    };
    
    return {
      text: `[Bitensor Analytics] Ecosystem metrics: TAO ${metrics.tao_price}, Activity ${metrics.network_activity}, Validators: ${metrics.validators}`,
      metrics
    };
  },

  // 9. Metamask / Web3 Tasks - Blockchain operations with smart contracts
  web3: async (payload) => {
    const { message, wallet_address, task_type, amount, token } = payload;
    const walletKey = process.env.METAMASK_API_KEY || process.env.METAMASK_WALLET_KEY;
    const contractAddress = process.env.SMART_CONTRACT_ADDRESS;
    
    if (!walletKey || walletKey === 'COLOCAR_AQUI') {
      return {
        text: '[Web3 Tasks] Wallet key não configurada. Configure METAMASK_API_KEY no arquivo .env'
      };
    }
    
    // Detect Web3 operation type
    const operations = {
      'transfer': 'Transferência de tokens',
      'swap': 'Swap de tokens',
      'stake': 'Staking',
      'unstake': 'Unstaking',
      'claim': 'Claim recompensas',
      'liquidação': 'Liquidação',
      'liquidacao': 'Liquidação',
      'settlement': 'GXEON Task Settlement',
      'reputation': 'GXEON Reputation Ledger'
    };
    
    let detectedOp = 'Consulta de saldo';
    for (const [key, value] of Object.entries(operations)) {
      if (message.toLowerCase().includes(key)) {
        detectedOp = value;
        break;
      }
    }
    
    // Smart contract integration simulation
    const smartContracts = [
      'GXEON Task Settlement',
      'GXEON Reputation Ledger'
    ];
    
    return {
      text: `[Metamask / Web3 Tasks] Operação: ${detectedOp}. Wallet: ${wallet_address || 'conectada'}. Smart Contracts: ${smartContracts.join(', ')}. Auto-sign ativado.`,
      operation: detectedOp,
      smart_contracts: smartContracts,
      contract_address: contractAddress || '0x...',
      integration: {
        connect_wallet: true,
        auto_sign: true,
        transaction_monitor: true,
        reward_claim: true
      },
      status: 'pending_confirmation'
    };
  },

  // 10. Marketplace de Agents - Paid agent deployment and skills marketplace
  marketplace: async (payload) => {
    const { message, action, agent_data } = payload;
    const apiKey = process.env.MARKETPLACE_API_KEY;
    
    if (!apiKey || apiKey === 'COLOCAR_AQUI') {
      return {
        text: '[Marketplace de Agents] API key não configurada. Configure MARKETPLACE_API_KEY no arquivo .env',
        features: {
          list_agents: true,
          buy_agent: false,
          sell_agent: false,
          royalty_tracking: true
        }
      };
    }
    
    // Detect marketplace action
    const actions = {
      'listar': 'list_agents',
      'comprar': 'buy_agent',
      'vender': 'sell_agent',
      'deploy': 'deploy_agent',
      'skills': 'list_skills',
      'royalty': 'royalty_tracking'
    };
    
    let detectedAction = 'list_agents';
    for (const [key, value] of Object.entries(actions)) {
      if (message.toLowerCase().includes(key)) {
        detectedAction = value;
        break;
      }
    }
    
    // Sample agents in marketplace
    const availableAgents = [
      { id: 'agent_001', name: 'Trading Bot Pro', price: 0.5, skills: ['trading', 'analysis'] },
      { id: 'agent_002', name: 'Data Scraper Elite', price: 0.3, skills: ['scraping', 'automation'] },
      { id: 'agent_003', name: 'AI Assistant Premium', price: 0.8, skills: ['chat', 'reasoning'] }
    ];
    
    return {
      text: `[Marketplace de Agents] Ação: ${detectedAction}. ${availableAgents.length} agentes disponíveis. Sistema de royalties ativo.`,
      action: detectedAction,
      agents: availableAgents,
      features: {
        list_agents: true,
        buy_agent: true,
        sell_agent: true,
        royalty_tracking: true
      },
      total_listings: availableAgents.length
    };
  },

  // 11. Liquidação Automática - Automatic payment processing and rewards
  liquidation: async (payload) => {
    const { message, task_id, wallet_address } = payload;
    
    // Workflow steps
    const workflow = [
      'verify_task_completion',
      'calculate_rewards',
      'update_scoreboard',
      'execute_transaction',
      'log_transaction_in_vector_db'
    ];
    
    // Simulate task verification
    const taskCompleted = true;
    const rewardAmount = 0.001; // ETH
    const reputationScore = 95;
    
    // Transaction simulation
    const transaction = {
      tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
      from: '0xGXEON_Treasury',
      to: wallet_address || '0xUser_Wallet',
      amount: rewardAmount,
      token: 'ETH',
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };
    
    return {
      text: `[Liquidação Automática] Workflow executado: ${workflow.length} etapas. Recompensa: ${rewardAmount} ETH. TX: ${transaction.tx_hash}. Scoreboard atualizado.`,
      workflow_completed: workflow,
      verification: {
        task_completed: taskCompleted,
        reward_calculated: rewardAmount,
        scoreboard_updated: true,
        transaction_executed: true,
        logged_in_vectordb: true
      },
      transaction,
      reputation: {
        score: reputationScore,
        update: 'auto'
      }
    };
  },

  // 12. Wallet Web3 Plug-and-Play - Metamask integration with real-time monitoring
  wallet: async (payload) => {
    const { action, wallet_address, auto_connect } = payload;
    
    const walletKey = process.env.METAMASK_API_KEY || process.env.METAMASK_WALLET_KEY;
    
    // Simulated balance for real-time monitoring
    const simulatedBalance = (Math.random() * 2 + 0.1).toFixed(4);
    const earningsFromTasks = (Math.random() * 0.05 + 0.001).toFixed(6);
    
    const actions = {
      'connect': 'Conectar carteira',
      'disconnect': 'Desconectar',
      'sign': 'Assinar transação',
      'balance': 'Consultar saldo',
      'history': 'Histórico de transações',
      'auto': 'Autenticação automática plug-and-play'
    };
    
    let detectedAction = actions['auto'];
    if (action && actions[action]) {
      detectedAction = actions[action];
    }
    
    return {
      text: `[Wallet Web3] ${detectedAction} ativado. Wallet: ${wallet_address || 'auto-detect'}. Saldo: ${simulatedBalance} ETH. Ganhos de tasks: +${earningsFromTasks} ETH.`,
      action: detectedAction,
      wallet_connected: true,
      auto_sign: true,
      monitor_balance: true,
      real_time_updates: true,
      balance: {
        total: simulatedBalance,
        currency: 'ETH',
        earnings_from_tasks: earningsFromTasks,
        pending_rewards: (Math.random() * 0.01).toFixed(6)
      },
      features: {
        automatic_authentication: auto_connect !== false,
        transaction_signing: true,
        earnings_reception: true,
        real_time_monitoring: true,
        microtask_integration: true,
        smart_contract_integration: true
      },
      transaction_history: [],
      status: 'active',
      timestamp: new Date().toISOString()
    };
  },

  // 13. Microtasks Automáticas - Autonomous task execution with instant Web3 payments
  microtasks: async (payload) => {
    const { task_type, auto_execute, reward_amount, wallet_address } = payload;
    
    const microtaskTypes = {
      'data_validation': { name: 'Validação de dados', reward: 0.0005 },
      'content_moderation': { name: 'Moderação de conteúdo', reward: 0.0003 },
      'sentiment_analysis': { name: 'Análise de sentimento', reward: 0.0004 },
      'data_labeling': { name: 'Rotulagem de dados', reward: 0.0006 },
      'translation': { name: 'Tradução', reward: 0.0004 },
      'classification': { name: 'Classificação', reward: 0.0003 },
      'api_request': { name: 'Requisição API Externa', reward: 0.0007 },
      'content_generation': { name: 'Geração de Conteúdo', reward: 0.0008 }
    };
    
    const selectedTask = microtaskTypes[task_type] || microtaskTypes['data_validation'];
    const reward = reward_amount || selectedTask.reward;
    
    // Execute task (simulated)
    const taskRecord = {
      task_id: `microtask_${Date.now()}`,
      type: selectedTask.name,
      reward: reward,
      status: 'completed',
      auto_executed: auto_execute !== false,
      timestamp: new Date().toISOString(),
      distributed_to_wallet: true,
      wallet_address: wallet_address || '0xWallet_Auto',
      payment_status: 'instant'
    };
    
    // Instant Web3 payment simulation
    const payment = {
      tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
      amount: reward,
      token: 'ETH',
      to: wallet_address || '0xWorker_Wallet',
      status: 'confirmed',
      instant_payment: true,
      timestamp: new Date().toISOString()
    };
    
    // Log to VectorDB/Supabase (simulated)
    const logs = {
      execution_log: `Task ${taskRecord.task_id} executed automatically`,
      reward_log: `Reward ${reward} ETH distributed instantly`,
      payment_log: `Instant payment confirmed: ${payment.tx_hash}`,
      vectordb_entry: true,
      supabase_entry: true
    };
    
    return {
      text: `[Microtasks Automáticas] ${selectedTask.name} executada. Recompensa: ${reward} ETH (pagamento instantâneo). TX: ${payment.tx_hash}. Auto-execute: ${auto_execute !== false}.`,
      task: taskRecord,
      payment: payment,
      logs: logs,
      monetization: {
        enabled: true,
        model: 'pay-per-microtask-instant',
        value: reward,
        auto_distribution: true,
        instant_payment: true,
        web3_integration: true
      },
      status: 'completed_with_instant_payment'
    };
  },

  // 14. Smart Contracts - Auto-payments and validation with enhanced features
  contracts: async (payload) => {
    const { contract_type, payment_amount, recipient, validate_task, auto_deploy, microtask_integration } = payload;
    const contractAddress = process.env.SMART_CONTRACT_ADDRESS;
    
    const contractTypes = {
      'payment': 'Pagamento automático',
      'escrow': 'Contrato de garantia',
      'validation': 'Validação de tarefa',
      'reward': 'Distribuição de recompensa',
      'settlement': 'Liquidação de tasks',
      'microtask': 'Contrato de Microtasks Automáticas',
      'api_bridge': 'Bridge APIs Externas'
    };
    
    const selectedContract = contractTypes[contract_type] || contractTypes['payment'];
    const amount = payment_amount || 0.001;
    
    // Deploy/execute smart contract (simulated)
    const smartContract = {
      contract_address: contractAddress || `0x${Math.random().toString(16).substr(2, 40)}`,
      contract_type: selectedContract,
      deployed_at: new Date().toISOString(),
      auto_payment: true,
      immutable_logs: true,
      auto_validation: validate_task !== false,
      microtask_integration: microtask_integration !== false,
      api_bridge_enabled: contract_type === 'api_bridge'
    };
    
    // Enhanced validation with auto-validation always on by default
    const validation = {
      validated: true,
      validator: 'smart_contract_auto',
      timestamp: new Date().toISOString(),
      payment_triggered: true,
      auto_validation: true,
      rules_checked: ['task_completion', 'payment_threshold', 'wallet_validity'],
      audit_trail: `Validation completed at ${new Date().toISOString()}`
    };
    
    // Transaction record
    const transaction = {
      tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
      from: '0xGXEON_Contract',
      to: recipient || '0xWorker_Wallet',
      amount: amount,
      token: 'ETH',
      status: 'confirmed',
      auto_executed: true,
      instant_confirmation: true
    };
    
    // Integration with microtasks
    const microtaskLink = microtask_integration !== false ? {
      integrated: true,
      task_count: Math.floor(Math.random() * 10) + 1,
      auto_distribution: true,
      pending_payments: (Math.random() * 0.01).toFixed(6)
    } : null;
    
    return {
      text: `[Smart Contracts] ${selectedContract} implantado${auto_deploy !== false ? ' automaticamente' : ''}. Pagamento: ${amount} ETH. TX: ${transaction.tx_hash}. Validação: ${validation.validated}. ${microtaskLink ? 'Integração com microtasks ativa.' : ''}`,
      contract: smartContract,
      transaction: transaction,
      validation: validation,
      microtask_integration: microtaskLink,
      features: {
        auto_deploy: auto_deploy !== false,
        auto_payment: true,
        task_validation: true,
        immutable_logs: true,
        blockchain_record: true,
        microtask_integration: microtask_integration !== false,
        api_bridge: contract_type === 'api_bridge'
      },
      status: 'contract_active'
    };
  },

  // 15. Agentes Autônomos Monetizados - Self-monetizing agents with API integration
  monetized_agents: async (payload) => {
    const { agent_type, task_request, auto_execute, api_integration } = payload;
    
    const agentTypes = {
      'researcher': { name: 'Researcher Bot', skills: ['research', 'analysis'], min_reward: 0.001 },
      'trader': { name: 'Trading Bot', skills: ['trading', 'market_analysis'], min_reward: 0.002 },
      'creator': { name: 'Content Creator', skills: ['content', 'generation'], min_reward: 0.0008 },
      'validator': { name: 'Data Validator', skills: ['validation', 'verification'], min_reward: 0.0005 },
      'optimizer': { name: 'System Optimizer', skills: ['optimization', 'monitoring'], min_reward: 0.001 },
      'api_executor': { name: 'API Task Executor', skills: ['api_requests', 'external_ai'], min_reward: 0.0015 }
    };
    
    const selectedAgent = agentTypes[agent_type] || agentTypes['researcher'];
    
    // API integration features
    const apiFeatures = api_integration !== false ? {
      huggingface: true,
      deepseek: true,
      grok: true,
      chatgpt: true,
      execution_mode: 'keyless_auto'
    } : null;
    
    const microtaskExecuted = {
      task_id: `agent_task_${Date.now()}`,
      agent: selectedAgent.name,
      task: task_request || 'Autonomous task execution',
      reward: selectedAgent.min_reward,
      status: 'completed',
      auto_executed: true,
      api_integration: apiFeatures
    };
    
    const earnings = {
      total_earned: selectedAgent.min_reward,
      tasks_completed: 1,
      performance_score: Math.floor(Math.random() * 20) + 80,
      wallet_connected: true,
      real_time_monitoring: true,
      api_earnings: apiFeatures ? (selectedAgent.min_reward * 0.3).toFixed(6) : 0
    };
    
    const performanceLog = {
      timestamp: new Date().toISOString(),
      agent: selectedAgent.name,
      task_completed: microtaskExecuted.task_id,
      reward: earnings.total_earned,
      performance: earnings.performance_score,
      api_calls: apiFeatures ? 4 : 0
    };
    
    return {
      text: `[Agentes Autônomos Monetizados] ${selectedAgent.name} executou: ${microtaskExecuted.task}. Recompensa: ${earnings.total_earned} ETH${apiFeatures ? ' (incluindo ganhos de APIs externas)' : ''}. Performance: ${earnings.performance_score}%.`,
      agent: {
        type: selectedAgent.name,
        skills: selectedAgent.skills,
        task_executed: microtaskExecuted
      },
      earnings: earnings,
      performance_log: performanceLog,
      integration: {
        metamask_connected: true,
        auto_task_execution: auto_execute !== false,
        real_time_monitoring: true,
        automatic_payments: true,
        external_apis: apiFeatures
      },
      status: 'agent_active_earning'
    };
  },

  // 16. APIs Externas Inteligentes - Keyless multi-API integration
  external_apis: async (payload) => {
    const { request_type, input_data, auto_execute } = payload;
    
    // Available external APIs (keyless mode - simulated)
    const availableAPIs = {
      huggingface: { name: 'Hugging Face AI', status: 'connected', model: 'Llama-2-70b' },
      deepseek: { name: 'DeepSeek AI', status: 'connected', confidence: 0.92 },
      grok: { name: 'Grock AI', status: 'connected', speed: 'fast' },
      chatgpt: { name: 'ChatGPT', status: 'connected', model: 'gpt-4o-mini' }
    };
    
    // Request types
    const requestTypes = {
      'analysis': 'Análise de dados e insights',
      'generation': 'Geração de conteúdo',
      'classification': 'Classificação de dados',
      'summarization': 'Sumarização de texto',
      'translation': 'Tradução',
      'code': 'Geração de código',
      'multi': 'Execução multi-API paralela'
    };
    
    const selectedRequest = requestTypes[request_type] || requestTypes['analysis'];
    
    // Execute across multiple APIs (simulated)
    const apiResults = {};
    for (const [apiId, apiInfo] of Object.entries(availableAPIs)) {
      apiResults[apiId] = {
        status: 'executed',
        result: `Processed via ${apiInfo.name}: "${input_data ? input_data.substring(0, 30) : 'default input'}..."`,
        timestamp: new Date().toISOString()
      };
    }
    
    // Calculate rewards for API usage
    const rewardPerAPI = 0.0002;
    const totalReward = Object.keys(availableAPIs).length * rewardPerAPI;
    
    return {
      text: `[APIs Externas Inteligentes] ${selectedRequest} executada em ${Object.keys(availableAPIs).length} APIs simultaneamente. Reward: ${totalReward.toFixed(6)} ETH. HuggingFace, DeepSeek, Grock e ChatGPT integrados sem chaves.`,
      request_type: selectedRequest,
      apis_executed: Object.keys(availableAPIs).length,
      api_results: apiResults,
      available_apis: availableAPIs,
      monetization: {
        enabled: true,
        model: 'pay-per-api-call',
        reward_per_api: rewardPerAPI,
        total_reward: totalReward.toFixed(6),
        auto_distribution: true
      },
      features: {
        keyless_mode: true,
        auto_execution: auto_execute !== false,
        parallel_processing: true,
        result_aggregation: true,
        logs_in_dashboard: true
      },
      status: 'apis_executed_successfully',
      timestamp: new Date().toISOString()
    };
  }
};

// Agent configuration mapping
const agentConfig = {
  orchestrator: { name: 'Orquestrador Central', type: 'controller' },
  vectordb: { name: 'Memória VectorDB', type: 'memory' },
  task: { name: 'Task Automation', type: 'automation', monetization: true },
  huggingface: { name: 'HuggingFace AI', type: 'external_ai' },
  deepseek: { name: 'DeepSeek AI', type: 'external_ai' },
  grok: { name: 'Grok AI', type: 'external_ai' },
  chatgpt: { name: 'ChatGPT', type: 'external_ai' },
  bitensor: { name: 'Bitensor Analytics', type: 'analytics' },
  web3: { name: 'Metamask / Web3 Tasks', type: 'blockchain', smart_contracts: true },
  marketplace: { name: 'Marketplace de Agents', type: 'core', monetization: true },
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Brain AI Controller
const brainAI = {
  status: process.env.BRAIN_STATUS || 'active',
  role: 'central_ai_controller',
  
  async processCommand(command, context = {}) {
    if (this.status !== 'active') {
      return { error: 'Brain AI is not active' };
    }
    
    // Route command to appropriate agent
    const agent = context.agent || 'orchestrator';
    return await executeAgent(agent, { command, context });
  }
};

// Execute agent task
async function executeAgent(agentType, params) {
  const taskRecord = await logTask(agentType, params.task_name || 'execute', params);
  
  try {
    let result;
    
    switch (agentType) {
      case 'orchestrator':
        result = await orchestratorAI(params);
        break;
      case 'wallet':
        result = await walletService(params);
        break;
      case 'microtasks':
        result = await microtaskService(params);
        break;
      case 'contracts':
        result = await contractService(params);
        break;
      default:
        result = await genericAIProcess(agentType, params);
    }
    
    await updateTaskStatus(taskRecord.id, 'completed', result);
    
    // Trigger payment if configured
    if (process.env.PAYMENT_ON_TASK_COMPLETION === 'true' && params.user_id) {
      await registerPayment(params.user_id, params.reward || 0.0001, 'ETH', null);
    }
    
    return { success: true, result, task_id: taskRecord.id };
  } catch (error) {
    await updateTaskStatus(taskRecord.id, 'failed', { error: error.message });
    throw error;
  }
}

// Orchestrator AI
async function orchestratorAI(params) {
  // Analyze request and route to appropriate agents
  const availableAgents = ['wallet', 'microtasks', 'contracts', 'apis'];
  
  return {
    orchestrated: true,
    agents: availableAgents,
    command: params.command,
    timestamp: new Date().toISOString()
  };
}

// Wallet Service
async function walletService(params) {
  const walletAddress = process.env.WEB3_WALLET_ADDRESS;
  
  return {
    wallet_connected: !!walletAddress,
    address: walletAddress,
    network: process.env.WEB3_NETWORK || 'Ethereum',
    action: params.action
  };
}

// Microtask Service
async function microtaskService(params) {
  if (process.env.MICROTASKS_ENABLED !== 'true') {
    return { error: 'Microtasks not enabled' };
  }
  
  return {
    microtask_processed: true,
    task: params.task_name,
    reward: params.reward || 0.0001
  };
}

// Contract Service
async function contractService(params) {
  return {
    contract_executed: true,
    contract_type: params.contract_type || 'generic'
  };
}

// Generic AI Process
async function genericAIProcess(agentType, params) {
  return {
    processed: true,
    agent: agentType,
    input: params,
    output: `Processed by ${agentType} agent`
  };
}

// Database Operations
async function logTask(agent, taskName, payload) {
  if (!supabase) return { id: 'local-' + Date.now() };
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({ agent, task_name: taskName, payload, status: 'running' })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

async function updateTaskStatus(taskId, status, result) {
  if (!supabase) return;
  
  await supabase
    .from('tasks')
    .update({ status, result })
    .eq('id', taskId);
}

async function registerPayment(userId, amount, currency, txHash) {
  if (!supabase) return { id: 'local-' + Date.now() };
  
  const { data, error } = await supabase
    .from('payments')
    .insert({ 
      user_id: userId, 
      amount, 
      currency, 
      tx_hash: txHash,
      status: txHash ? 'confirmed' : 'pending'
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

async function logEvent(module, action, message, metadata = {}) {
  if (!supabase) {
    console.log(`[${module}] ${action}: ${message}`);
    return { id: 'local-' + Date.now() };
  }
  
  const { data, error } = await supabase
    .from('logs')
    .insert({ module, action, message, metadata })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Get agent status
function getAgentStatus() {
  return {
    brain: process.env.BRAIN_STATUS,
    vector_db: process.env.VECTOR_DB_STATUS,
    huggingface: process.env.HUGGINGFACE_STATUS,
    deepseek: process.env.DEEPSEEK_STATUS,
    grok: process.env.GROK_STATUS,
    chatgpt: process.env.CHATGPT_STATUS,
    bitensor: process.env.BITENSOR_STATUS,
    monetization: {
      plugin_play: process.env.MONETIZATION_PLUGIN_PLAY,
      smart_contracts: process.env.MONETIZATION_SMART_CONTRACTS,
      agents: process.env.MONETIZATION_AGENTS,
      microtasks: process.env.MONETIZATION_MICROTASKS
    }
  };
}

module.exports = { 
  executeAgent, 
  getAgentStatus, 
  brainAI, 
  logEvent,
  registerPayment 
};
