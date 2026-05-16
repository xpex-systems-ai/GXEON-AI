/**
 * 🐝 GXEON SWARM M2M - Entry Point
 * Sistema de Enxame Autônomo M2M
 */

const SwarmController = require('./swarm_controller');

// Instância global do swarm
let swarmInstance = null;

/**
 * Inicializa o sistema de Swarm M2M
 */
async function initializeSwarm(config = {}) {
  if (swarmInstance) {
    console.log('[🐝 SWARM] Já inicializado');
    return swarmInstance;
  }
  
  console.log('\n🔥═══════════════════════════════════════════════════════🔥');
  console.log('  GXEON SWARM M2M v3.0 - ZERO HUMAN INTERVENTION');
  console.log('  Modo: Colmeia Predadora de Mercado');
  console.log('🔥═══════════════════════════════════════════════════════🔥\n');
  
  swarmInstance = new SwarmController({
    executionInterval: config.executionInterval || 3600000, // 1h
    maxConcurrentAgents: config.maxConcurrentAgents || 50,
    encryptionEnabled: true,
    autoOptimize: true,
    profitThreshold: 1.0,
    ...config
  });
  
  await swarmInstance.initialize();
  
  // Inicia modo autônomo se configurado
  if (config.autoStart !== false) {
    await swarmInstance.start();
  }
  
  return swarmInstance;
}

/**
 * Para o swarm
 */
function stopSwarm() {
  if (swarmInstance) {
    swarmInstance.stop();
    swarmInstance = null;
    console.log('[🐝 SWARM] Sistema interrompido');
  }
}

/**
 * Retorna instância atual
 */
function getSwarm() {
  return swarmInstance;
}

/**
 * Status do swarm
 */
function getSwarmStatus() {
  if (!swarmInstance) {
    return { status: 'not_initialized', isRunning: false };
  }
  return swarmInstance.getStatus();
}

/**
 * Executa ciclo manualmente
 */
async function forceSwarmCycle() {
  if (!swarmInstance) {
    throw new Error('Swarm não inicializado');
  }
  return await swarmInstance.forceExecution();
}

module.exports = {
  initializeSwarm,
  stopSwarm,
  getSwarm,
  getSwarmStatus,
  forceSwarmCycle,
  SwarmController,
  SwarmScouter: require('./scouter'),
  SwarmInfiltrator: require('./infiltrator')
};
