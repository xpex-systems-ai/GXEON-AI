const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

// Startup ENV Validation
const requiredEnv = [
  'SUPABASE_PROJECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnv = requiredEnv.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
  console.warn('[Startup] Missing ENV variables:', missingEnv);
} else {
  console.log('[Startup] ENV OK');
}

// Import Routes
const chatRoute = require('./routes/chat');
const configRoute = require('./routes/config');
const agentRoutes = require('./routes/agents');
const taskEngineRoutes = require('./routes/task_engine');
const executorRoutes = require('./routes/executor');

// Import Billing Middleware
const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gxeon-key']  // Added x-gxeon-key
};

app.use(cors(corsOptions));
app.use(express.json());

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// ==================== PUBLIC ROUTES (No Billing) ====================

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-billing'
  });
});

// Public status endpoint
app.get('/status', (req, res) => {
  res.json({ 
    brain: process.env.BRAIN_STATUS || 'active',
    billing_enabled: true,
    version: '2.0.0'
  });
});

// ==================== BILLED ROUTES (Credit Deducted) ====================

// LLM Chat - $0.001 per request
app.use('/chat', 
  gxeonEnforcer({ llm_call: 0.001 }),
  chatRoute
);

// Agent Routes - All protected with billing
// Base cost: $0.005 per agent execution
app.use('/api/agents', 
  gxeonEnforcer({ agent_execution: 0.005 }),
  require('./routes/agents_protected')
);

// AI Service Routes - Individual pricing per provider
app.use('/api/huggingface', 
  gxeonEnforcer({ llm_call: 0.001 }),
  (req, res, next) => { req.agentType = 'huggingface'; next(); },
  chatRoute
);

app.use('/api/deepseek', 
  gxeonEnforcer({ llm_call: 0.002 }),
  (req, res, next) => { req.agentType = 'deepseek'; next(); },
  chatRoute
);

app.use('/api/grok', 
  gxeonEnforcer({ llm_call: 0.004 }),
  (req, res, next) => { req.agentType = 'grok'; next(); },
  chatRoute
);

app.use('/api/chatgpt', 
  gxeonEnforcer({ llm_call: 0.0025 }),
  (req, res, next) => { req.agentType = 'chatgpt'; next(); },
  chatRoute
);

// Web3 & Contract Routes - Higher cost for blockchain operations
app.use('/api/onchain', 
  gxeonEnforcer({ onchain_operation: 0.015 }),
  taskEngineRoutes
);

// Task Engine - Pipeline execution
app.use('/api/task-engine', 
  gxeonEnforcer({ task_pipeline: 0.002 }),
  taskEngineRoutes
);

// Executor - Workflow automation
app.use('/api/executor', 
  gxeonEnforcer({ agent_execution: 0.003 }),
  executorRoutes
);

// Edge Functions
app.use('/api/edge', 
  gxeonEnforcer({ edge_function: 0.001 }),
  require('./edge-functions')
);

// ==================== AUTH-ONLY ROUTES (No Billing) ====================

// Config routes - Admin only, no billing
app.use('/api/config', 
  gxeonAuthOnly,
  configRoute
);

// Read-only stats - Auth only
app.get('/api/stats', 
  gxeonAuthOnly,
  async (req, res) => {
    try {
      const supabase = require('./services/supabase');
      const { data: tasks } = await supabase.from('tasks').select('*', { count: 'exact' });
      const { data: agents } = await supabase.from('users').select('*', { count: 'exact' });
      
      res.json({
        total_tasks: tasks?.length || 0,
        total_agents: agents?.length || 0,
        user_id: req.user_id,
        balance: req.user_balance
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Legacy routes (deprecated, migrate to protected versions)
// Keep for backward compatibility but apply billing
app.use('/api', 
  gxeonEnforcer({ agent_execution: 0.005 }),
  agentRoutes
);

// ==================== ERROR HANDLING ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.id}:`, err);
  
  // Check if it's a billing error
  if (err.message && err.message.includes('GXEON_PAYMENT_REQUIRED')) {
    return res.status(402).json({
      error: "GXEON_PAYMENT_REQUIRED",
      message: "Saldo insuficiente. Recarregue seus créditos."
    });
  }
  
  if (err.message && err.message.includes('GXEON_AUTH_REQUIRED')) {
    return res.status(401).json({
      error: "GXEON_AUTH_REQUIRED",
      message: "API Key obrigatória. Header 'x-gxeon-key' ausente."
    });
  }
  
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ==================== SERVER START ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  GXEON Backend v2.0.0 - Billing Enabled                  ║
╠════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                          ║
║  Billing: ACTIVE - All routes require credits            ║
║  Health: http://localhost:${PORT}/health                    ║
╚════════════════════════════════════════════════════════╝
  `);
  
  console.log('[Billing] Pricing tiers loaded:');
  console.log('  - LLM Call: $0.001 - $0.004');
  console.log('  - Agent Execution: $0.005');
  console.log('  - Onchain Operation: $0.015');
  console.log('  - Task Pipeline: $0.002');
  console.log('  - Edge Function: $0.001');
});
