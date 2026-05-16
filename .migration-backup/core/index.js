#!/usr/bin/env node
/**
 * GXEON Master Orchestrator
 * 
 * Central command hub that initializes and manages all GXEON agents
 * in a single unified process.
 * 
 * Agents:
 * - Gelato Scanner: Zero-Gas task hunter (2min interval)
 * - Autonolas AI Worker: AI task resolver (3min interval)
 * 
 * Usage: node core/index.js
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { startGelatoDaemon } = require('./gelato_scanner');
const { startAutonolasDaemon } = require('./autonolas_agent');

// ASCII Art Logo
const GXEON_LOGO = `
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║     ██████╗ ██╗  ██╗███████╗ ██████╗ ███╗   ██╗                 ║
    ║    ██╔════╝ ╚██╗██╔╝██╔════╝██╔═══██╗████╗  ██║                 ║
    ║    ██║  ███╗ ╚███╔╝ █████╗  ██║   ██║██╔██╗ ██║                 ║
    ║    ██║   ██║ ██╔██╗ ██╔══╝  ██║   ██║██║╚██╗██║                 ║
    ║    ╚██████╔╝██╔╝ ██╗███████╗╚██████╔╝██║ ╚████║                 ║
    ║     ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝                 ║
    ║                                                                  ║
    ║              🤖  AI CORE INITIALIZED  🤖                       ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
`;

const BOOT_SEQUENCE = `
    [SYSTEM] Initializing GXEON Neural Network...
    [SYSTEM] Loading Agent Modules...
    [SYSTEM] Connecting to Blockchain Nodes...
    [SYSTEM] Establishing Supabase Link...
    [SYSTEM] Warming up Hugging Face Brain...
`;

class GXEONOrchestrator {
  constructor() {
    this.agents = new Map();
    this.startTime = Date.now();
    this.isRunning = false;
  }

  async bootGXeonSystem() {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', GXEON_LOGO); // Cyan color
    
    // Boot sequence animation
    const lines = BOOT_SEQUENCE.trim().split('\n');
    for (const line of lines) {
      console.log('\x1b[32m%s\x1b[0m', line.trim()); // Green color
      await this.sleep(500);
    }

    console.log('\n    ════════════════════════════════════════════════════════════════');
    console.log('    🚀 INICIANDO AGENTES GXEON...');
    console.log('    ════════════════════════════════════════════════════════════════\n');

    // Start Gelato Scanner Daemon
    console.log('    [1/2] 🎯 Inicializando Gelato Scanner...');
    console.log('          └─ Modo: Caça contínua a tarefas Zero-Gas');
    console.log('          └─ Intervalo: 2 minutos');
    console.log('          └─ Redes: Polygon, Ethereum, Arbitrum\n');
    
    const gelatoAgent = startGelatoDaemon();
    this.agents.set('gelato', gelatoAgent);
    
    // Wait 5 seconds before starting Autonolas
    console.log('    ⏳ Aguardando 5 segundos para estabilização...\n');
    await this.sleep(5000);

    // Start Autonolas AI Worker Daemon
    console.log('    [2/2] 🧠 Inicializando Autonolas AI Worker...');
    console.log('          └─ Modo: Processamento de tarefas IA');
    console.log('          └─ Intervalo: 3 minutos');
    console.log('          └─ Redes: Gnosis, Base');
    console.log('          └─ Cérebro: Hugging Face (Mistral-7B)\n');
    
    const autonolasAgent = startAutonolasDaemon();
    this.agents.set('autonolas', autonolasAgent);

    // System ready
    this.isRunning = true;
    this.printSystemReady();
    this.startHealthMonitor();
  }

  printSystemReady() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    console.log('\n    ╔══════════════════════════════════════════════════════════════╗');
    console.log('    ║              ✅ SISTEMA GXEON TOTALMENTE OPERACIONAL          ║');
    console.log('    ╠══════════════════════════════════════════════════════════════╣');
    console.log('    ║  Agentes Ativos: 2                                           ║');
    console.log('    ║  • Gelato Scanner     [🟢 ONLINE]                            ║');
    console.log('    ║  • Autonolas AI       [🟢 ONLINE]                            ║');
    console.log('    ╠══════════════════════════════════════════════════════════════╣');
    console.log('    ║  Comandos Disponíveis:                                       ║');
    console.log('    ║  • Ctrl+C para encerrar todos os agentes                     ║');
    console.log('    ║  • Dashboard: https://gxeon-ai.vercel.app                    ║');
    console.log('    ╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('    📝 Logs de cada agente aparecerão abaixo:');
    console.log('    ──────────────────────────────────────────────────────────────\n');
  }

  startHealthMonitor() {
    // Monitor system health every 30 seconds
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(uptime / 60);
      const seconds = uptime % 60;
      
      if (uptime % 300 === 0) { // Every 5 minutes
        console.log(`\n    💓 [HEARTBEAT] GXEON vivo há ${minutes}m ${seconds}s | Agentes: ${this.agents.size}\n`);
      }
    }, 30000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('\n    ⚠️  DESLIGANDO SISTEMA GXEON...');
    console.log('    Encerrando agentes de forma segura...\n');
    
    this.agents.clear();
    this.isRunning = false;
    
    console.log('    ✅ Todos os agentes foram desligados.');
    console.log('    👋 Até logo, Comandante!\n');
    
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (orchestrator) {
    await orchestrator.shutdown();
  }
});

process.on('SIGTERM', async () => {
  if (orchestrator) {
    await orchestrator.shutdown();
  }
});

// Main entry point
const orchestrator = new GXEONOrchestrator();

console.log('\x1b[33m%s\x1b[0m', '\n    🔌 Inicializando GXEON Orchestrator v2.0...\n');

orchestrator.bootGXeonSystem().catch(error => {
  console.error('\n    ❌ ERRO FATAL AO INICIAR SISTEMA:', error.message);
  console.error(error.stack);
  process.exit(1);
});
