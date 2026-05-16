/**
 * GXEON Middleware Integration
 * Apply billing enforcement to all routes
 */

const express = require('express');
const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');

// Create router
const router = express.Router();

// PUBLIC ROUTES (no billing required)
// Health check, documentation, status endpoints
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/status', (req, res) => {
    res.json({ 
        brain: process.env.BRAIN_STATUS || 'active',
        version: '2.0.0'
    });
});

// BILLED ROUTES - LLM Access
// POST /chat - Direct LLM access
router.post('/chat', 
    gxeonEnforcer({ llm_call: 0.001 }),  // $0.001 per chat request
    require('./routes/chat')
);

// BILLED ROUTES - Agent Execution
// POST /api/orchestrator - Central agent gateway
router.post('/api/orchestrator', 
    gxeonEnforcer({ agent_execution: 0.005 }),  // $0.005 per orchestration
    require('./routes/agents').orchestratorRoute
);

// Individual AI Agents - Each billed as LLM call
const aiAgents = ['huggingface', 'deepseek', 'grok', 'chatgpt'];
aiAgents.forEach(agent => {
    router.post(`/api/${agent}`, 
        gxeonEnforcer({ llm_call: 0.002 }),  // $0.002 per AI request
        (req, res, next) => {
            req.agentType = agent;
            next();
        },
        require('./routes/agents').agentRoute
    );
});

// Wallet & Web3 Operations - Higher cost
router.post('/api/wallet', 
    gxeonEnforcer({ agent_execution: 0.003 }),
    require('./routes/agents').walletRoute
);

router.post('/api/microtasks', 
    gxeonEnforcer({ agent_execution: 0.002 }),
    require('./routes/agents').microtasksRoute
);

router.post('/api/contracts', 
    gxeonEnforcer({ onchain_operation: 0.01 }),  // $0.01 per contract interaction
    require('./routes/agents').contractsRoute
);

// Onchain Operations - Critical billing
router.post('/api/onchain/transfer', 
    gxeonEnforcer({ onchain_operation: 0.01 }),
    require('./routes/task_engine').onchainTransfer
);

router.post('/api/onchain/contract', 
    gxeonEnforcer({ onchain_operation: 0.015 }),  // Higher for contract execution
    require('./routes/task_engine').onchainContract
);

// Task Engine - Pipeline execution
router.post('/api/task-engine/start', 
    gxeonAuthOnly,  // Auth only, no immediate charge (billing happens per-task)
    require('./routes/task_engine').startEngine
);

router.post('/api/task-engine/run-once', 
    gxeonEnforcer({ task_pipeline: 0.002 }),
    require('./routes/task_engine').runOnce
);

router.post('/api/tasks/:id/execute', 
    gxeonEnforcer({ task_pipeline: 0.005 }),  // Manual execution costs more
    require('./routes/task_engine').executeTask
);

// Edge Functions
router.post('/api/edge/execute_task', 
    gxeonEnforcer({ edge_function: 0.001 }),
    require('./edge-functions').executeTask
);

router.post('/api/edge/register_payment', 
    gxeonAuthOnly,  // Internal use, just validate auth
    require('./edge-functions').registerPayment
);

// Executor
router.post('/api/executor/start',
    gxeonAuthOnly,
    require('./routes/executor').start
);

router.post('/api/executor/run-once',
    gxeonEnforcer({ agent_execution: 0.003 }),
    require('./routes/executor').runOnce
);

// Admin Routes - Require auth but no billing
router.post('/api/save-key',
    gxeonAuthOnly,
    require('./routes/config').saveKey
);

// Read-only routes - Auth only
router.get('/api/agents', gxeonAuthOnly, require('./routes/agents').listAgents);
router.get('/api/tasks', gxeonAuthOnly, require('./routes/task_engine').listTasks);
router.get('/api/stats', gxeonAuthOnly, require('./routes/task_engine').getStats);

module.exports = router;
