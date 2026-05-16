#!/usr/bin/env node
/**
 * 🐝 GXEON SWARM M2M - Bootstrap Script
 * Executa swarm em modo autônomo (para Replit cron/background)
 */

const { initializeSwarm } = require('./index');

// Configurações do ambiente
const CONFIG = {
  executionInterval: parseInt(process.env.SWARM_INTERVAL) || 3600000, // 1h
  maxConcurrentAgents: parseInt(process.env.SWARM_MAX_AGENTS) || 50,
  encryptionEnabled: process.env.SWARM_ENCRYPT !== 'false',
  autoOptimize: process.env.SWARM_OPTIMIZE !== 'false',
  profitThreshold: parseFloat(process.env.SWARM_PROFIT_THRESHOLD) || 1.0,
  autoStart: true
};

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║           🤖 GXEON SWARM M2M v3.0 BOOTSTRAP 🤖            ║');
console.log('║                                                            ║');
console.log('║     Modo: ZERO_HUMAN_INTERVENTION                          ║');
console.log('║     Target: REPLIT_NODE_JS                                 ║');
console.log('║     Propósito: Colmeia Predadora de Mercado                ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

// Inicializa o swarm
initializeSwarm(CONFIG)
  .then(swarm => {
    console.log('\n✅ Swarm M2M ativo e operando');
    console.log('   Pressione Ctrl+C para interromper\n');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Interrompendo Swarm...');
      swarm.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Terminando Swarm...');
      swarm.stop();
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('\n❌ Erro ao iniciar Swarm:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
