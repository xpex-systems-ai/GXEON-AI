// 🚀 GXEON RAILWAY v13 - Ultra-Fast Boot for Healthcheck
// Inicia servidor em < 100ms, carrega resto em background

const express = require('express');
const cors = require('cors');

// ==================== MINIMAL APP (NO DEPENDENCIES) ====================
const app = express();
const PORT = process.env.PORT || 8080;

// CORS ultra-permissivo para Railway
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

app.use(express.json({ limit: '10mb' }));

// ==================== HEALTHCHECK (ZERO DEPENDENCIES) ====================
// Railway verifica esta rota - deve retornar 200 IMEDIATAMENTE
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '2.0.0-sovereign' });
});

app.get('/status', (req, res) => {
  res.json({ status: 'active', version: '2.0.0-sovereign' });
});

// ==================== SERVER START (UNDER 50ms) ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GXEON] Server ready on port ${PORT}`);
});

// ==================== EVERYTHING ELSE (LAZY LOAD) ====================
// Carrega todo o resto APÓS o servidor estar ouvindo
setTimeout(async () => {
  try {
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

    // Request ID middleware
    app.use((req, res, next) => {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // Rate limiting
    const { apiLimiter, gxeonRateLimiter, operationLimiter } = require('./middleware/rateLimiter');
    app.use('/api', apiLimiter);

    // Enforcer e billing
    const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');

    // Routes
    const chatRoute = require('./routes/chat');
    const configRoute = require('./routes/config');
    const agentRoutes = require('./routes/agents');
    const taskEngineRoutes = require('./routes/task_engine');
    const executorRoutes = require('./routes/executor');

    // Billed routes
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
    app.use('/api/v1/swarm', gxeonEnforcer({ swarm_operation: 0.01 }), require('./routes/swarm'));
    app.use('/api/v1/sovereign-data', require('./routes/sovereign-data'));
    app.use('/api/v1/ocean', require('./routes/ocean'));
    app.use('/api/v1/chainlink', require('./routes/chainlink'));
    app.use('/v1/memory', gxeonRateLimiter, require('./routes/memory'));
    app.use('/v1/plugins/execute', gxeonRateLimiter, gxeonEnforcer({ agent_execution: 0.005 }), require('./routes/agents_protected'));
    app.use('/billing', gxeonAuthOnly, require('./routes/billing'));
    app.use('/api/v1/profit', gxeonAuthOnly, require('./routes/profit'));
    app.use('/api/config', gxeonAuthOnly, configRoute);
    app.use('/api', gxeonEnforcer({ agent_execution: 0.005 }), agentRoutes);

    // Error handling
    app.use((err, req, res, next) => {
      console.error(`[GXEON_ERROR] ${req.id || 'unknown'}:`, err);
      if (err.message?.includes('GXEON_PAYMENT_REQUIRED')) {
        return res.status(402).json({ error: "GXEON_PAYMENT_REQUIRED", message: "Saldo insuficiente." });
      }
      if (err.message?.includes('GXEON_AUTH_REQUIRED')) {
        return res.status(401).json({ error: "GXEON_AUTH_REQUIRED", message: "API Key obrigatória." });
      }
      res.status(500).json({ error: "INTERNAL_ERROR" });
    });

    app.use((req, res) => {
      res.status(404).json({ error: "NOT_FOUND", message: `${req.method} ${req.path}` });
    });

    console.log('[GXEON] All routes loaded');

    // Background services
    if (process.env.DISABLE_GUARDIAN !== 'true') {
      const GuardianService = require('./services/guardianService');
      GuardianService.startMonitoring();
      console.log('[GXEON_GUARDIAN] Active');
    }

    if (process.env.TWITTER_BEARER_TOKEN && process.env.DISABLE_RADAR !== 'true') {
      const radarShix = require('./services/radarShix');
      radarShix.start();
      console.log('[RADAR_SHIX] Active');
    }

    if (process.env.SWARM_AUTOSTART === 'true') {
      setTimeout(async () => {
        const { initializeSwarm } = require('./agents');
        await initializeSwarm({ autoStart: true });
        console.log('[SWARM_M2M] Active');
      }, 5000);
    }

    console.log('[GXEON] Sovereign v2.0.0 ready');
  } catch (err) {
    console.error('[GXEON] Background load error:', err.message);
  }
}, 50); // 50ms - servidor já responde healthcheck
