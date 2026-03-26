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

module.exports = router;
