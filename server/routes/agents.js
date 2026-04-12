// Agent Routes - GXEON V2.0
const express = require('express');
const router = express.Router();
const { executeAgent, getAgentStatus } = require('../services/agents');

// Orquestrador Central - Main routing endpoint
router.post('/orchestrator', async (req, res) => {
  try {
    const { message, agents: activeAgents, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não fornecida' });
    }
    
    // Execute orchestrator
    const result = await executeAgent('orchestrator', {
      message,
      agents: activeAgents || ['orquestrador'],
      context: context || []
    });
    
    res.json({
      success: true,
      replies: result.replies,
      orchestrated_agents: activeAgents || ['orquestrador']
    });
  } catch (error) {
    console.error('Orquestrador error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Memória VectorDB
router.post('/vector_db', async (req, res) => {
  try {
    const result = await executeAgent('vectordb', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task Automation
router.post('/task_agent', async (req, res) => {
  try {
    const result = await executeAgent('task', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HuggingFace AI
router.post('/huggingface', async (req, res) => {
  try {
    const result = await executeAgent('huggingface', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DeepSeek AI
router.post('/deepseek', async (req, res) => {
  try {
    const result = await executeAgent('deepseek', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grok AI
router.post('/grok', async (req, res) => {
  try {
    const result = await executeAgent('grok', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ChatGPT
router.post('/chatgpt', async (req, res) => {
  try {
    const result = await executeAgent('chatgpt', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bitensor Analytics
router.post('/bitensor', async (req, res) => {
  try {
    const result = await executeAgent('bitensor', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web3 / Metamask Tasks
router.post('/web3', async (req, res) => {
  try {
    const result = await executeAgent('web3', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marketplace de Agents
router.post('/marketplace', async (req, res) => {
  try {
    const result = await executeAgent('marketplace', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Liquidação Automática
router.post('/liquidation', async (req, res) => {
  try {
    const result = await executeAgent('liquidation', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wallet Web3
router.post('/wallet', async (req, res) => {
  try {
    const result = await executeAgent('wallet', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Microtasks Automáticas
router.post('/microtasks', async (req, res) => {
  try {
    const result = await executeAgent('microtasks', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Smart Contracts
router.post('/contracts', async (req, res) => {
  try {
    const result = await executeAgent('contracts', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agentes Autônomos Monetizados
router.post('/monetized_agents', async (req, res) => {
  try {
    const result = await executeAgent('monetized_agents', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APIs Externas Inteligentes
router.post('/external_apis', async (req, res) => {
  try {
    const result = await executeAgent('external_apis', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent status
router.get('/agents/status', (req, res) => {
  res.json({
    success: true,
    agents: getAgentStatus()
  });
});

// Wallet Web3 API
router.post('/wallet', async (req, res) => {
  try {
    const result = await executeAgent('wallet', req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallet/balance', async (req, res) => {
  try {
    const result = await executeAgent('wallet', { action: 'balance' });
    res.json({ success: true, balance: result.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallet/transactions', async (req, res) => {
  try {
    const result = await executeAgent('wallet', { action: 'history' });
    res.json({ success: true, transactions: result.transaction_history || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs & Dashboard API
router.get('/logs', async (req, res) => {
  try {
    res.json({
      success: true,
      logs: [
        { timestamp: new Date().toISOString(), level: 'INFO', module: 'System', message: 'GX Eon V2 operational' },
        { timestamp: new Date().toISOString(), level: 'SUCCESS', module: 'Wallet', message: 'Transaction confirmed' }
      ],
      stats: {
        active_modules: 6,
        transactions_today: 47,
        tasks_executed: 1247,
        errors: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs/export', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gx_logs.csv');
    res.send('timestamp,level,module,message\n2026-03-26,INFO,System,Export sample\n');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { executeTaskEdgeFunction, registerPaymentEdgeFunction, logEventEdgeFunction } = require('../edge-functions');

// ===== REAL AGENT SYSTEM ENDPOINTS =====

// In-memory task queue for real agent processing
const taskQueue = [];
const taskResults = [];
const activeAgents = new Map();

// GET /agents - List all active agents
router.get('/agents', (req, res) => {
  const agentsList = Array.from(activeAgents.values()).map(agent => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    lastSeen: agent.lastSeen
  }));
  
  // Add default agent if none registered
  if (agentsList.length === 0) {
    agentsList.push({
      id: 'agent_01',
      name: 'GXEON Agent 01',
      status: 'active',
      lastSeen: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    agents: agentsList
  });
});

// GET /tasks - List all tasks
router.get('/tasks', (req, res) => {
  res.json({
    success: true,
    tasks: taskQueue.map(t => ({
      id: t.id,
      type: t.type,
      url: t.url,
      status: t.status,
      createdAt: t.createdAt
    }))
  });
});

// POST /tasks - Create new task
router.post('/tasks', (req, res) => {
  const { type, url } = req.body;
  
  if (!type || !url) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: type, url'
    });
  }
  
  const task = {
    id: `task_${Date.now()}`,
    type,
    url,
    status: 'pending',
    createdAt: new Date().toISOString(),
    result: null
  };
  
  taskQueue.push(task);
  
  res.json({
    success: true,
    task: {
      id: task.id,
      type: task.type,
      url: task.url,
      status: task.status,
      createdAt: task.createdAt
    }
  });
});

// GET /tasks/next - Get next pending task for agent
router.get('/tasks/next', (req, res) => {
  const pendingTask = taskQueue.find(t => t.status === 'pending');
  
  if (!pendingTask) {
    return res.json({
      success: true,
      task: null,
      message: 'No pending tasks'
    });
  }
  
  // Mark as in-progress
  pendingTask.status = 'in-progress';
  pendingTask.startedAt = new Date().toISOString();
  
  res.json({
    success: true,
    task: {
      id: pendingTask.id,
      type: pendingTask.type,
      url: pendingTask.url
    }
  });
});

// POST /tasks/result - Submit task result
router.post('/tasks/result', (req, res) => {
  const { taskId, result } = req.body;
  
  if (!taskId || result === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: taskId, result'
    });
  }
  
  const task = taskQueue.find(t => t.id === taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  // Update task
  task.status = 'completed';
  task.result = result;
  task.completedAt = new Date().toISOString();
  
  // Store result
  taskResults.push({
    taskId,
    result,
    completedAt: task.completedAt
  });
  
  res.json({
    success: true,
    message: 'Task result recorded',
    task: {
      id: task.id,
      type: task.type,
      status: task.status,
      result: task.result
    }
  });
});

// GET /stats - System statistics
router.get('/stats', (req, res) => {
  const completedTasks = taskQueue.filter(t => t.status === 'completed').length;
  const pendingTasks = taskQueue.filter(t => t.status === 'pending').length;
  const agentCount = activeAgents.size || 1;
  
  res.json({
    success: true,
    stats: {
      agents: agentCount,
      tasks: taskQueue.length,
      completed: completedTasks,
      pending: pendingTasks,
      balance: 0 // Real balance would come from blockchain
    }
  });
});

// POST /agents/register - Register a new agent
router.post('/agents/register', (req, res) => {
  const { id, name } = req.body;
  
  if (!id || !name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: id, name'
    });
  }
  
  const agent = {
    id,
    name,
    status: 'active',
    lastSeen: new Date().toISOString()
  };
  
  activeAgents.set(id, agent);
  
  res.json({
    success: true,
    agent
  });
});

// POST /agents/:id/heartbeat - Agent heartbeat
router.post('/agents/:id/heartbeat', (req, res) => {
  const { id } = req.params;
  const agent = activeAgents.get(id);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  agent.lastSeen = new Date().toISOString();
  agent.status = 'active';
  
  res.json({
    success: true,
    agent
  });
});

// Edge Functions
router.post('/edge/execute_task', executeTaskEdgeFunction);
router.post('/edge/register_payment', registerPaymentEdgeFunction);
router.post('/edge/log_event', logEventEdgeFunction);

// GXEON Supreme Config endpoint
router.get('/config', (req, res) => {
  const gxeonConfig = require('../../gxeon.config.js');
  res.json(gxeonConfig.getPublicConfig());
});

module.exports = router;
