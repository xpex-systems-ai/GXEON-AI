const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

// ==================== APP SETUP (IMMEDIATE) ====================
const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gxeon-key', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// ==================== HEALTH CHECK (PRIORITY #1) ====================
// Railway healthcheck precisa responder IMEDIATAMENTE
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0-sovereign',
    billing: 'initializing',
    guardian: 'initializing'
  });
};

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Status lightweight - não requer Supabase
app.get('/status', (req, res) => {
  res.json({
    brain: 'active',
    billing_enabled: true,
    rate_limiting: true,
    guardian_active: process.env.DISABLE_GUARDIAN !== 'true',
    version: '2.0.0-sovereign'
  });
});

// ==================== ENV VALIDATION ====================
const requiredEnv = [
  'SUPABASE_PROJECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SYSTEM_ADMIN_ID',
  'SYSTEM_API_KEY',
  'OPENROUTER_API_KEY'
];

const missingEnv = requiredEnv.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
  console.warn('[GXEON_STARTUP] Missing ENV variables:', missingEnv);
} else {
  console.log('[GXEON_STARTUP] ENV OK - All required variables present');
}

// ==================== IMPORTS (AFTER HEALTHCHECK) ====================
const chatRoute = require('./routes/chat');
const configRoute = require('./routes/config');
const agentRoutes = require('./routes/agents');
const taskEngineRoutes = require('./routes/task_engine');
const executorRoutes = require('./routes/executor');

const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');
const { apiLimiter, gxeonRateLimiter, operationLimiter } = require('./middleware/rateLimiter');

app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

app.use('/api', apiLimiter);

// ==================== BILLED ROUTES ====================
app.use('/chat', gxeonEnforcer({ llm_call: 0.001 }), chatRoute);
app.use('/api/agents', gxeonEnforcer({ agent_execution: 0.005 }), require('./routes/agents_protected'));
app.use('/api/huggingface', gxeonEnforcer({ llm_call: 0.001 }), (req, res, next) => { req.agentType = 'huggingface'; next(); }, chatRoute);
app.use('/api/deepseek', gxeonEnforcer({ llm_call: 0.002 }), (req, res, next) => { req.agentType = 'deepseek'; next(); }, chatRoute);
app.use('/api/grok', gxeonEnforcer({ llm_call: 0.004 }), (req, res, next) => { req.agentType = 'grok'; next(); }, chatRoute);
app.use('/api/chatgpt', gxeonEnforcer({ llm_call: 0.0025 }), (req, res, next) => { req.agentType = 'chatgpt'; next(); }, chatRoute);
app.use('/api/onchain', operationLimiter('onchain'), gxeonEnforcer({ onchain_operation: 0.015 }), taskEngineRoutes);
app.use('/api/task-engine', gxeonEnforcer({ task_pipeline: 0.002 }), taskEngineRoutes);
app.use('/api/executor', gxeonEnforcer({ agent_execution: 0.003 }), executorRoutes);
app.use('/api/edge', gxeonEnforcer({ edge_function: 0.001 }), require('./edge-functions'));
app.use('/api/v1/radar', gxeonEnforcer({ radar_call: 0.05 }), require('./routes/radar'));
app.use('/api/v1/swarm', gxeonEnforcer({ swarm_operation: 0.01 }), require('./routes/swarm')); // 🐝 SWARM M2M - Colmeia Predadora
app.use('/api/v1/sovereign-data', require('./routes/sovereign-data')); // 🌑 PANDORA PROTOCOL — M2M Only
app.use('/api/v1/ocean', require('./routes/ocean')); // 🌊 OCEAN PROTOCOL — Compute-to-Data
app.use('/api/v1/chainlink', require('./routes/chainlink')); // 🔗 CHAINLINK FUNCTIONS — Oracle Gateway
app.use('/v1/memory', gxeonRateLimiter, require('./routes/memory'));
app.use('/v1/plugins/execute', gxeonRateLimiter, gxeonEnforcer({ agent_execution: 0.005 }), require('./routes/agents_protected'));
app.use('/billing', gxeonAuthOnly, require('./routes/billing'));
app.use('/api/v1/profit', gxeonAuthOnly, require('./routes/profit'));

// ==================== AUTH-ONLY ROUTES ====================
app.use('/api/config', gxeonAuthOnly, configRoute);
app.get('/api/stats', gxeonAuthOnly, async (req, res) => {
  try {
    const supabase = require('./services/supabase');
    const { data: tasks } = await supabase.from('tasks').select('*', { count: 'exact' });
    const { data: agents } = await supabase.from('users').select('*', { count: 'exact' });
    res.json({ total_tasks: tasks?.length || 0, total_agents: agents?.length || 0, user_id: req.user_id, balance: req.user_balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', gxeonEnforcer({ agent_execution: 0.005 }), agentRoutes);

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(`[GXEON_ERROR] ${req.id}:`, err);
  if (err.message && err.message.includes('GXEON_PAYMENT_REQUIRED')) {
    return res.status(402).json({ error: "GXEON_PAYMENT_REQUIRED", message: "Saldo insuficiente. Recarregue seus créditos." });
  }
  if (err.message && err.message.includes('GXEON_AUTH_REQUIRED')) {
    return res.status(401).json({ error: "GXEON_AUTH_REQUIRED", message: "API Key obrigatória. Header 'x-gxeon-key' ausente." });
  }
  res.status(500).json({ error: "INTERNAL_ERROR", message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` });
});

// ==================== SERVER START (IMMEDIATE) ====================
// Inicia servidor IMEDIATAMENTE - healthcheck já está rodando
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GXEON] Server listening on port ${PORT}`);
});

// ==================== BACKGROUND SERVICES (AFTER START) ====================
// Carrega serviços pesados em background sem bloquear healthcheck
setTimeout(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗\n║                    🔥 GXEON SOVEREIGN v2.0.0 🔥                ║\n╠═══════════════════════════════════════════════════════════════╣');
  console.log('[GXEON_ENFORCER] Choke-Point Operacional Ativo');
  console.log('[GXEON_PRICING] LLM: $0.001-$0.004 | Agent: $0.005 | Onchain: $0.015 | Memory: $0.001/KB');
  
  // Lazy load de serviços pesados
  try {
    const GuardianService = require('./services/guardianService');
    if (process.env.DISABLE_GUARDIAN !== 'true') {
      GuardianService.startMonitoring();
      console.log('[GXEON_GUARDIAN] Sistema Imunológico Ativo');
    }
  } catch (err) {
    console.warn('[GUARDIAN] Failed to start:', err.message);
  }
  
  try {
    const radarShix = require('./services/radarShix');
    if (process.env.DISABLE_RADAR !== 'true' && process.env.TWITTER_BEARER_TOKEN) {
      radarShix.start();
      console.log('[RADAR_SHIX] Caça-Oportunidades Iniciado');
    }
  } catch (err) {
    console.warn('[RADAR] Failed to start:', err.message);
  }
  
  // 🐝 SWARM M2M Auto-Start (delayed)
  if (process.env.SWARM_AUTOSTART === 'true') {
    setTimeout(async () => {
      try {
        const { initializeSwarm } = require('./agents');
        await initializeSwarm({
          executionInterval: parseInt(process.env.SWARM_INTERVAL) || 3600000,
          maxConcurrentAgents: parseInt(process.env.SWARM_MAX_AGENTS) || 50,
          encryptionEnabled: process.env.SWARM_ENCRYPT !== 'false',
          autoOptimize: process.env.SWARM_OPTIMIZE !== 'false',
          profitThreshold: parseFloat(process.env.SWARM_PROFIT_THRESHOLD) || 1.0,
          autoStart: true
        });
        console.log('[SWARM_M2M] Colmeia Predadora Ativa');
      } catch (err) {
        console.error('[SWARM_M2M] Erro:', err.message);
      }
    }, 10000);
  }
  
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('✅ GXEON SOVEREIGN pronto\n');
}, 100); // 100ms delay - servidor já está respondendo healthcheck
