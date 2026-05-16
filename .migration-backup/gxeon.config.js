// GXEON Supreme Configuration
// Central configuration object for GXEON V2.0

require('dotenv').config({ path: './config/secure/.env' });

const gxeonSupremeConfig = {
  brain: {
    status: process.env.BRAIN_STATUS || 'active',
    role: 'central_ai_controller'
  },

  credentials: {
    public: {
      supabase: {
        project_url: process.env.SUPABASE_PROJECT_URL || 'https://your-project.supabase.co'
      },
      web3: {
        wallet_address: process.env.WEB3_WALLET_ADDRESS || '0xYOUR_WALLET_ADDRESS',
        network: process.env.WEB3_NETWORK || 'Ethereum'
      }
    },

    secrets: {
      supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'COLOQUE_AQUI',
      openrouter_api_key: process.env.OPENROUTER_API_KEY || 'COLOQUE_AQUI',
      huggingface_api_key: process.env.HUGGINGFACE_API_KEY || 'COLOQUE_AQUI',
      grok_api_key: process.env.GROK_API_KEY || 'COLOQUE_AQUI',
      deepseek_api_key: process.env.DEEPSEEK_API_KEY || 'COLOQUE_AQUI',
      chatgpt_api_key: process.env.CHATGPT_API_KEY || 'COLOQUE_AQUI',
      bitensor_api_key: process.env.BITENSOR_API_KEY || 'COLOQUE_AQUI',
      wallet_private_key: process.env.WALLET_PRIVATE_KEY || 'COLOQUE_AQUI'
    }
  },

  database: {
    provider: 'supabase',
    tables: {
      users: {
        name: 'users',
        columns: [
          'id uuid PRIMARY KEY',
          'name text',
          'role text',
          'wallet_address text',
          'created_at timestamp DEFAULT now()'
        ]
      },
      tasks: {
        name: 'tasks',
        columns: [
          'id uuid PRIMARY KEY',
          'agent text',
          'task_name text',
          'payload jsonb',
          'status text',
          'result jsonb',
          'created_at timestamp DEFAULT now()'
        ]
      },
      payments: {
        name: 'payments',
        columns: [
          'id uuid PRIMARY KEY',
          'user_id uuid REFERENCES users(id)',
          'amount numeric',
          'currency text',
          'tx_hash text',
          'status text',
          'created_at timestamp DEFAULT now()'
        ]
      },
      logs: {
        name: 'logs',
        columns: [
          'id uuid PRIMARY KEY',
          'module text',
          'action text',
          'message text',
          'created_at timestamp DEFAULT now()'
        ]
      }
    }
  },

  edgeFunctions: {
    execute_task: {
      name: 'execute_task',
      params: ['agent', 'task_name', 'payload'],
      returns: 'status_result',
      enabled: true
    },
    register_payment: {
      name: 'register_payment',
      params: ['user_id', 'amount', 'currency', 'tx_hash'],
      returns: 'payment_status',
      enabled: true
    },
    log_event: {
      name: 'log_event',
      params: ['module', 'action', 'message'],
      returns: 'log_status',
      enabled: true
    }
  },

  modules: {
    brain: process.env.BRAIN_STATUS || 'active',
    vector_db: process.env.VECTOR_DB_STATUS || 'active',
    apis: {
      huggingface: process.env.HUGGINGFACE_STATUS || 'connected',
      deepseek: process.env.DEEPSEEK_STATUS || 'connected',
      grok: process.env.GROK_STATUS || 'connected',
      chatgpt: process.env.CHATGPT_STATUS || 'connected',
      bitensor: process.env.BITENSOR_STATUS || 'connected'
    },
    monetization: {
      plugin_play: process.env.MONETIZATION_PLUGIN_PLAY || 'active',
      smart_contracts: process.env.MONETIZATION_SMART_CONTRACTS || 'active',
      agents: process.env.MONETIZATION_AGENTS || 'active',
      microtasks: process.env.MONETIZATION_MICROTASKS || 'active'
    }
  },

  web3Flow: {
    auto_connect_wallet: process.env.AUTO_CONNECT_WALLET === 'true',
    payment_on_task_completion: process.env.PAYMENT_ON_TASK_COMPLETION === 'true',
    microtasks_enabled: process.env.MICROTASKS_ENABLED === 'true'
  },

  integrationReady: true,

  // Helper methods
  isModuleActive(moduleName) {
    return this.modules[moduleName] === 'active' || this.modules[moduleName] === 'connected';
  },

  isAPIConnected(apiName) {
    return this.modules.apis[apiName] === 'connected';
  },

  getDatabaseSchema() {
    return this.database.tables;
  },

  getPublicConfig() {
    return {
      brain: this.brain,
      credentials: {
        public: this.credentials.public
      },
      modules: this.modules,
      web3Flow: this.web3Flow,
      integrationReady: this.integrationReady
    };
  }
};

module.exports = gxeonSupremeConfig;
