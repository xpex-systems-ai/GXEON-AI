// GXEON Task Engine API Routes
const express = require('express');
const router = express.Router();
const { GXEONTaskEngine } = require('../../core/task_engine');

// Global engine instance
let taskEngine = null;

function getEngine() {
  if (!taskEngine) {
    taskEngine = new GXEONTaskEngine({
      loopInterval: 60000,
      batchSize: 10
    });
  }
  return taskEngine;
}

// ==================== ENGINE CONTROL ====================

// POST /api/task-engine/start - Start the task engine
router.post('/task-engine/start', (req, res) => {
  try {
    const engine = getEngine();
    
    if (engine.isRunning) {
      return res.json({
        success: true,
        message: 'Task Engine already running',
        status: 'running'
      });
    }
    
    engine.start();
    
    res.json({
      success: true,
      message: 'GXEON Task Engine started',
      status: 'running',
      config: {
        loopInterval: engine.config.loopInterval,
        batchSize: engine.config.batchSize,
        maxRetries: engine.config.maxRetries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/task-engine/stop - Stop the task engine
router.post('/task-engine/stop', (req, res) => {
  const engine = taskEngine;
  
  if (!engine || !engine.isRunning) {
    return res.json({
      success: true,
      message: 'Task Engine not running',
      status: 'stopped'
    });
  }
  
  engine.stop();
  
  res.json({
    success: true,
    message: 'GXEON Task Engine stopped',
    status: 'stopped'
  });
});

// GET /api/task-engine/status - Get engine status
router.get('/task-engine/status', async (req, res) => {
  const engine = getEngine();
  const stats = await engine.getStats();
  
  res.json({
    success: true,
    status: {
      running: engine.isRunning,
      agents: stats.agents || [],
      stats: stats
    }
  });
});

// POST /api/task-engine/run-once - Run pipeline once
router.post('/task-engine/run-once', async (req, res) => {
  try {
    const engine = getEngine();
    const result = await engine.runPipeline();
    
    res.json({
      success: result.success,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TASK OPERATIONS ====================

// GET /api/tasks - List all tasks
router.get('/tasks', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { status, source, type, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('external_tasks')
      .select('*')
      .order('reward_priority_score', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (type) query = query.eq('type', type);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      tasks: data,
      count: data?.length || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tasks/dashboard - Get dashboard view
router.get('/tasks/dashboard', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('task_dashboard')
      .select('*')
      .limit(100);
    
    if (error) throw error;
    
    // Calculate stats
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(t => t.status === 'pending').length || 0,
      executing: data?.filter(t => t.status === 'executing').length || 0,
      completed: data?.filter(t => t.status === 'completed').length || 0,
      failed: data?.filter(t => t.status === 'failed').length || 0,
      totalValue: data?.reduce((sum, t) => sum + (t.estimated_value || 0), 0) || 0
    };
    
    res.json({
      success: true,
      tasks: data,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/tasks/:id', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('external_tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      task: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/tasks - Create new task
router.post('/tasks', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const task = {
      ...req.body,
      task_id: req.body.task_id || `manual_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('external_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      task: data,
      message: 'Task created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('external_tasks')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      task: data,
      message: 'Task updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { error } = await supabase
      .from('external_tasks')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/tasks/:id/execute - Execute task manually
router.post('/tasks/:id/execute', async (req, res) => {
  try {
    const engine = getEngine();
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get task
    const { data: task, error } = await supabase
      .from('external_tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!task) throw new Error('Task not found');
    
    // Get agent
    const agent = engine.agents.get(task.assigned_agent);
    if (!agent) throw new Error(`Agent ${task.assigned_agent} not found`);
    
    // Execute
    const result = await agent.execute(task);
    
    // Update task
    await supabase
      .from('external_tasks')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: result.success ? new Date().toISOString() : null,
        proof_response: JSON.stringify(result),
        pipeline_stage: 'stage_6_storage'
      })
      .eq('id', req.params.id);
    
    res.json({
      success: result.success,
      result,
      message: result.success ? 'Task executed successfully' : 'Task execution failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SOURCES ====================

// GET /api/sources - List task sources
router.get('/sources', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('task_sources')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({
      success: true,
      sources: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/sources/:id/fetch - Trigger manual fetch
router.post('/sources/:id/fetch', async (req, res) => {
  try {
    const engine = getEngine();
    const sourceId = req.params.id;
    
    let fetcher;
    switch (sourceId) {
      case 'galxe':
        fetcher = engine.fetchGalxe.bind(engine);
        break;
      case 'zealy':
        fetcher = engine.fetchZealy.bind(engine);
        break;
      case 'layer3':
        fetcher = engine.fetchLayer3.bind(engine);
        break;
      default:
        throw new Error(`Unknown source: ${sourceId}`);
    }
    
    const tasks = await fetcher();
    let captured = 0;
    
    for (const task of tasks) {
      const normalized = engine.normalizeTask(task, sourceId);
      const saved = await engine.saveTask(normalized);
      if (saved) captured++;
    }
    
    res.json({
      success: true,
      source: sourceId,
      tasksFound: tasks.length,
      tasksCaptured: captured,
      message: `Fetched ${tasks.length} tasks, captured ${captured} new`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== STATS & ANALYTICS ====================

// GET /api/task-engine/stats - Get comprehensive stats
router.get('/task-engine/stats', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('external_tasks')
      .select('status, count');
    
    if (statusError) throw statusError;
    
    // Get counts by source
    const { data: sourceCounts, error: sourceError } = await supabase
      .from('external_tasks')
      .select('source, count');
    
    if (sourceError) throw sourceError;
    
    // Get total value
    const { data: valueData, error: valueError } = await supabase
      .from('external_tasks')
      .select('estimated_value');
    
    if (valueError) throw valueError;
    
    const totalValue = valueData?.reduce((sum, t) => sum + (t.estimated_value || 0), 0) || 0;
    
    // Get recent activity
    const { data: recent, error: recentError } = await supabase
      .from('external_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) throw recentError;
    
    res.json({
      success: true,
      stats: {
        byStatus: statusCounts,
        bySource: sourceCounts,
        totalValue,
        recentTasks: recent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ONCHAIN EXECUTOR ====================

// GET /api/onchain/status/:network - Get network status
router.get('/onchain/status/:network', async (req, res) => {
  try {
    const { OnchainExecutor } = require('../../core/onchain_executor');
    const executor = new OnchainExecutor();
    
    const network = req.params.network;
    const status = await executor.getNetworkStatus(network);
    
    res.json({
      success: status.connected,
      network: network,
      status: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/onchain/transfer - Execute transfer
router.post('/onchain/transfer', async (req, res) => {
  try {
    const { OnchainExecutor } = require('../../core/onchain_executor');
    const executor = new OnchainExecutor({
      maxAmountPerTx: req.body.maxAmount || 0.001,
      requireBalanceCheck: req.body.checkBalance !== false,
      failOnError: true
    });
    
    const { network, to, amount } = req.body;
    
    if (!network || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: network, to, amount'
      });
    }
    
    const result = await executor.executeTransfer(network, to, amount.toString());
    
    res.json({
      success: result.success,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/onchain/contract - Execute contract call
router.post('/onchain/contract', async (req, res) => {
  try {
    const { OnchainExecutor } = require('../../core/onchain_executor');
    const executor = new OnchainExecutor({
      maxAmountPerTx: req.body.maxAmount || 0.001,
      requireBalanceCheck: req.body.checkBalance !== false,
      failOnError: true
    });
    
    const { network, contract, abi, method, args, value } = req.body;
    
    if (!network || !contract || !abi || !method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: network, contract, abi, method'
      });
    }
    
    const result = await executor.executeContractCall(
      network,
      contract,
      abi,
      method,
      args || [],
      { value: value || 0 }
    );
    
    res.json({
      success: result.success,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== WATCHDOG & HEALTH ====================

// GET /api/health - Health check endpoint
router.get('/health', (req, res) => {
  try {
    const engine = getEngine();
    const watchdogStatus = engine.getWatchdogStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: watchdogStatus.health?.healthy ? 'healthy' : 'degraded',
      engine: {
        running: engine.isRunning,
        agents: Array.from(engine.agents.keys())
      },
      watchdog: watchdogStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/watchdog/start - Start watchdog
router.post('/watchdog/start', (req, res) => {
  try {
    const engine = getEngine();
    engine.startWatchdog();
    
    res.json({
      success: true,
      message: 'Watchdog started',
      status: engine.getWatchdogStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/watchdog/stop - Stop watchdog
router.post('/watchdog/stop', (req, res) => {
  try {
    const engine = getEngine();
    engine.stopWatchdog();
    
    res.json({
      success: true,
      message: 'Watchdog stopped',
      status: engine.getWatchdogStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/watchdog/status - Get watchdog status
router.get('/watchdog/status', (req, res) => {
  try {
    const engine = getEngine();
    const status = engine.getWatchdogStatus();
    
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/watchdog/alerts - Get alerts
router.get('/watchdog/alerts', (req, res) => {
  try {
    const engine = getEngine();
    const unacknowledged = req.query.unacknowledged === 'true';
    const alerts = engine.watchdog?.getAlerts(unacknowledged) || [];
    
    res.json({
      success: true,
      alerts: alerts,
      count: alerts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/watchdog/alerts/:index/acknowledge - Acknowledge alert
router.post('/watchdog/alerts/:index/acknowledge', (req, res) => {
  try {
    const engine = getEngine();
    const index = parseInt(req.params.index);
    
    if (!engine.watchdog) {
      return res.status(500).json({
        success: false,
        error: 'Watchdog not initialized'
      });
    }
    
    const acknowledged = engine.watchdog.acknowledgeAlert(index);
    
    res.json({
      success: acknowledged,
      message: acknowledged ? 'Alert acknowledged' : 'Alert not found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/watchdog/stats - Get comprehensive watchdog stats
router.get('/watchdog/stats', (req, res) => {
  try {
    const engine = getEngine();
    const stats = engine.watchdog?.getStats();
    
    res.json({
      success: true,
      stats: stats || { error: 'Watchdog not initialized' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
