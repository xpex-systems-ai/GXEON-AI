// Agent Routes - GXEON V2.0
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { executeAgent, getAgentStatus } = require('../services/agents');

// Task Router - Executes tasks based on type
async function executeTaskByType(type, payload) {
  switch (type) {
    case 'scrape':
      return await executeScrapeTask(payload);
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

// Scrape Task Implementation
async function executeScrapeTask(payload) {
  const { url } = payload;
  
  if (!url) {
    throw new Error('URL is required for scrape task');
  }
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'GXEON-Scraper/1.0'
      }
    });
    
    const html = response.data;
    const summary = html.substring(0, 500) + (html.length > 500 ? '...' : '');
    const title = extractTitle(html);
    
    // Decision Layer: Opportunity Detection
    const opportunityKeywords = ['promo', 'discount', 'sale', 'offer', 'deal', 'coupon', 'save'];
    const normalizedContent = html.toLowerCase();
    const hasOpportunity = opportunityKeywords.some(keyword => normalizedContent.includes(keyword));
    
    let action = 'none';
    let monetizationResult = null;
    
    // Action Layer: Trigger Monetization if opportunity detected
    if (hasOpportunity) {
      action = 'trigger_monetization';
      monetizationResult = await triggerMonetization({
        url: url,
        title: title,
        timestamp: new Date().toISOString(),
        keywords: opportunityKeywords.filter(k => normalizedContent.includes(k)),
        opportunity_type: 'promotional'
      });
    }
    
    return {
      status: 'success',
      data: {
        url: url,
        title: title,
        contentLength: html.length,
        preview: summary,
        opportunity_detected: hasOpportunity,
        keywords_matched: hasOpportunity ? opportunityKeywords.filter(k => normalizedContent.includes(k)) : []
      },
      action: action,
      monetization_status: monetizationResult?.status || 'none',
      monetization: monetizationResult || { status: 'none' }
    };
  } catch (error) {
    return {
      status: 'error',
      data: { error: error.message, url },
      action: 'none',
      opportunity_detected: false
    };
  }
}

// Helper to extract title from HTML
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : 'No title found';
}

// Monetization Layer - Lead Capture
async function triggerMonetization(data) {
  const endpoint = process.env.MONETIZATION_ENDPOINT;
  
  if (!endpoint) {
    console.warn('[Monetization] MONETIZATION_ENDPOINT not configured');
    return {
      status: 'skipped',
      reason: 'endpoint_not_configured'
    };
  }
  
  try {
    const response = await axios.post(endpoint, {
      ...data,
      source: 'gxeon_agent',
      mode: 'lead_capture'
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'gxeon-agent'
      }
    });
    
    return {
      status: 'success',
      endpoint: endpoint,
      response_status: response.status
    };
  } catch (error) {
    console.error('[Monetization] Failed:', error.message);
    return {
      status: 'failed',
      reason: error.message
    };
  }
}

// Orquestrador Central - Intelligent Task Executor
router.post('/orchestrator', async (req, res) => {
  try {
    const { type, payload, message, agents: activeAgents, context } = req.body;
    
    // Legacy support: if message provided, use old orchestrator logic
    if (message && !type) {
      const result = await executeAgent('orchestrator', {
        message,
        agents: activeAgents || ['orquestrador'],
        context: context || []
      });
      
      return res.json({
        success: true,
        replies: result.replies,
        orchestrated_agents: activeAgents || ['orquestrador']
      });
    }
    
    // New task-based execution
    if (!type) {
      return res.status(400).json({ 
        error: 'Task type or message is required' 
      });
    }
    
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ 
        error: 'Payload is required and must be an object' 
      });
    }
    
    // Execute task by type
    const result = await executeTaskByType(type, payload);
    
    res.json({
      success: result.status === 'success',
      task: {
        type,
        status: result.status,
        executedAt: new Date().toISOString()
      },
      result: result.data,
      action: result.action
    });
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
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

// POST /wallet/connect - Connect browser extension wallet
router.post('/wallet/connect', async (req, res) => {
  try {
    const { address, chainId } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required'
      });
    }
    
    console.log('[Extension] Wallet connected:', address);
    
    res.json({
      success: true,
      message: 'Wallet connected',
      address,
      chainId: chainId || 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /wallet/balance - Get wallet balance
router.get('/wallet/balance', async (req, res) => {
  try {
    const { address } = req.query;
    
    // Mock balance - in production this would query blockchain
    res.json({
      success: true,
      address,
      balance: 0.5,
      currency: 'ETH'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /payments/register - Register payment for completed task
router.post('/payments/register', async (req, res) => {
  try {
    const { walletAddress, taskId, amount, currency } = req.body;
    
    const paymentId = `payment_${Date.now()}`;
    
    console.log('[Extension] Payment registered:', {
      paymentId,
      walletAddress,
      taskId,
      amount,
      currency
    });
    
    res.json({
      success: true,
      paymentId,
      status: 'pending',
      amount,
      currency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /analytics/start - Start analytics tracking
router.post('/analytics/start', async (req, res) => {
  try {
    const { startTime, source } = req.body;
    
    console.log('[Extension] Analytics tracking started:', { startTime, source });
    
    res.json({
      success: true,
      sessionId: `session_${Date.now()}`,
      startTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /analytics/stop - Stop analytics tracking
router.post('/analytics/stop', async (req, res) => {
  try {
    const { duration, metrics } = req.body;
    
    console.log('[Extension] Analytics tracking stopped:', { duration, metrics });
    
    res.json({
      success: true,
      duration,
      summary: metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
