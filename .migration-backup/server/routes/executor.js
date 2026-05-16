// GXEON Executor API Routes
// Control endpoints for the task automation engine

const express = require('express');
const router = express.Router();
const { GXEONExecutor, defaultConfig } = require('../../core/gxeon_executor');

// Global executor instance
let executor = null;
let executorStats = {
  tasksCompleted: 0,
  tasksFailed: 0,
  lastRun: null,
  totalRuns: 0,
  startTime: null
};

// Initialize executor with custom config
function getExecutor(config = null) {
  if (!executor) {
    executor = new GXEONExecutor(config || defaultConfig);
    
    // Override executeWorkflow to track stats
    const originalExecuteWorkflow = executor.executeWorkflow.bind(executor);
    executor.executeWorkflow = async function() {
      executorStats.totalRuns++;
      executorStats.lastRun = new Date().toISOString();
      
      const result = await originalExecuteWorkflow();
      
      if (result.completed) {
        executorStats.tasksCompleted++;
      } else if (result.error) {
        executorStats.tasksFailed++;
      }
      
      return result;
    };
  }
  return executor;
}

// GET /api/executor/status - Get executor status
router.get('/executor/status', (req, res) => {
  const exec = executor;
  
  res.json({
    success: true,
    status: {
      running: exec ? exec.isRunning : false,
      interval_seconds: defaultConfig.interval_seconds,
      config: {
        loop: defaultConfig.loop,
        steps_count: defaultConfig.steps.length
      },
      stats: executorStats,
      uptime: executorStats.startTime 
        ? Math.floor((Date.now() - new Date(executorStats.startTime).getTime()) / 1000)
        : 0
    }
  });
});

// POST /api/executor/start - Start the executor loop
router.post('/executor/start', (req, res) => {
  try {
    const exec = getExecutor(req.body.config || null);
    
    if (exec.isRunning) {
      return res.json({
        success: true,
        message: 'Executor already running',
        status: 'running'
      });
    }
    
    exec.start();
    executorStats.startTime = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'GXEON Executor started',
      status: 'running',
      interval_seconds: defaultConfig.interval_seconds,
      config: {
        module: defaultConfig.module,
        loop: defaultConfig.loop,
        steps: defaultConfig.steps.map(s => s.action)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/executor/stop - Stop the executor loop
router.post('/executor/stop', (req, res) => {
  if (!executor || !executor.isRunning) {
    return res.json({
      success: true,
      message: 'Executor not running',
      status: 'stopped'
    });
  }
  
  executor.stop();
  
  res.json({
    success: true,
    message: 'GXEON Executor stopped',
    status: 'stopped',
    stats: executorStats
  });
});

// POST /api/executor/run-once - Execute single workflow
router.post('/executor/run-once', async (req, res) => {
  try {
    const exec = getExecutor(req.body.config || null);
    
    const result = await exec.runOnce();
    
    res.json({
      success: result.success,
      completed: result.completed,
      reason: result.reason,
      error: result.error || null,
      context: {
        task_id: exec.context.task?.id || null,
        ai_response_preview: exec.context.ai?.response?.substring(0, 100) || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/executor/config - Get current executor configuration
router.get('/executor/config', (req, res) => {
  res.json({
    success: true,
    config: defaultConfig,
    customizable_fields: [
      'interval_seconds',
      'steps[].provider',
      'steps[].input',
      'steps[].message'
    ]
  });
});

// POST /api/executor/test-template - Test template substitution
router.post('/executor/test-template', (req, res) => {
  const { template, context } = req.body;
  
  if (!template) {
    return res.status(400).json({
      success: false,
      error: 'Template string required'
    });
  }
  
  const exec = getExecutor();
  // Set temporary context
  const originalContext = exec.context;
  exec.context = context || {};
  
  const result = exec.substituteTemplate(template);
  
  // Restore context
  exec.context = originalContext;
  
  res.json({
    success: true,
    template,
    result,
    context: context || {}
  });
});

// Reset stats endpoint (for testing)
router.post('/executor/reset-stats', (req, res) => {
  executorStats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    lastRun: null,
    totalRuns: 0,
    startTime: executorStats.startTime
  };
  
  res.json({
    success: true,
    message: 'Stats reset',
    stats: executorStats
  });
});

module.exports = router;
