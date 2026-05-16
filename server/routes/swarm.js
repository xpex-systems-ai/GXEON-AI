/**
 * 🐝 GXEON SWARM API Routes
 * Endpoints para controle e monitoramento do enxame
 */

const express = require('express');
const router = express.Router();
const { getSwarmStatus, forceSwarmCycle, getSwarm, initializeSwarm, stopSwarm } = require('../agents');
const { gxeonAuthOnly } = require('../middleware/gxeonEnforcer');
const { persistence } = require('../runtime/persistence.cjs');

function persistSwarmEvent(event, payload = {}) {
  return persistence.persist('swarm_events', {
    id: `swarm:${event}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    event,
    payload,
    source: 'swarm-api'
  }).catch((error) => console.warn('[SWARM_PERSISTENCE] event persist failed:', error.message));
}


/**
 * @route   GET /api/v1/swarm/status
 * @desc    Status completo do swarm
 * @access  Private
 */
router.get('/status', gxeonAuthOnly, async (req, res) => {
  try {
    const status = getSwarmStatus();
    persistSwarmEvent('status_read', { status });
    res.json({
      success: true,
      swarm: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/v1/swarm/start
 * @desc    Inicializa e inicia o swarm
 * @access  Private (Admin)
 */
router.post('/start', gxeonAuthOnly, async (req, res) => {
  try {
    const config = req.body || {};
    const swarm = await initializeSwarm({
      ...config,
      autoStart: true
    });
    
    persistSwarmEvent('start', { config, status: swarm.getStatus() });
    res.json({
      success: true,
      message: 'Swarm M2M inicializado com sucesso',
      status: swarm.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/v1/swarm/stop
 * @desc    Para o swarm
 * @access  Private (Admin)
 */
router.post('/stop', gxeonAuthOnly, async (req, res) => {
  try {
    stopSwarm();
    persistSwarmEvent('stop');
    res.json({
      success: true,
      message: 'Swarm interrompido',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/v1/swarm/execute
 * @desc    Executa ciclo manualmente
 * @access  Private
 */
router.post('/execute', gxeonAuthOnly, async (req, res) => {
  try {
    const result = await forceSwarmCycle();
    persistSwarmEvent('execute_cycle', { result });
    res.json({
      success: true,
      executed: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/v1/swarm/stats
 * @desc    Estatísticas de ROI e performance
 * @access  Private
 */
router.get('/stats', gxeonAuthOnly, async (req, res) => {
  try {
    const swarm = getSwarm();
    if (!swarm) {
      return res.status(400).json({ success: false, error: 'Swarm não inicializado' });
    }
    
    const status = swarm.getStatus();
    persistSwarmEvent('stats_read', { status });
    
    res.json({
      success: true,
      stats: {
        roi: status.roi,
        scouter: status.scouter,
        infiltrator: status.infiltrator,
        executions: status.executionCount,
        isRunning: status.isRunning
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/v1/swarm/config
 * @desc    Atualiza configuração do swarm
 * @access  Private (Admin)
 */
router.post('/config', gxeonAuthOnly, async (req, res) => {
  try {
    const swarm = getSwarm();
    if (!swarm) {
      return res.status(400).json({ success: false, error: 'Swarm não inicializado' });
    }
    
    const { executionInterval, maxConcurrentAgents, profitThreshold } = req.body;
    
    const updatedConfig = {
      ...(executionInterval && { executionInterval }),
      ...(maxConcurrentAgents && { maxConcurrentAgents }),
      ...(profitThreshold && { profitThreshold })
    };
    swarm.updateConfig(updatedConfig);
    persistSwarmEvent('config_update', { updatedConfig });
    
    res.json({
      success: true,
      message: 'Configuração atualizada',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/v1/swarm/health
 * @desc    Health check público do swarm
 * @access  Public
 */
router.get('/health', async (req, res) => {
  const status = getSwarmStatus();
  res.json({
    swarm_active: status.isRunning || false,
    initialized: !!status.executionCount,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
