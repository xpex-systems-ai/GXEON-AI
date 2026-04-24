#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTINEL-NEXUS BRIDGE v1.0
 * Integração: SENTINEL_GUARDIAN_v1 ↔ NEXUS_MULTICHAIN_v12
 * 
 * Responsabilidade: Conectar o Sentinel ao Nexus para monitoramento real-time
 * Protocolo: SYSTEM_IMMUNITY_CHECK
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SentinelGuardian } from '../server/agents/sentinel_guardian.js';
import { NexusCore } from './multichain_parallel_processor.js';

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE: SentinelNexusBridge
// ═══════════════════════════════════════════════════════════════════════════
class SentinelNexusBridge {
  constructor() {
    this.nexus = null;
    this.sentinel = null;
    this.isConnected = false;
    this.bridgeMetrics = {
      connectionTime: null,
      lastSync: null,
      alertsForwarded: 0,
      restartsTriggered: 0
    };
  }

  async initialize() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     🔗 SENTINEL-NEXUS BRIDGE v1.0                              ║');
    console.log('║        Integração de Imunidade Ativa                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Inicializar Nexus Core
    this.nexus = new NexusCore();
    await this.nexus.initialize();

    // Inicializar Sentinel com referência ao Nexus
    this.sentinel = new SentinelGuardian(this.nexus);
    await this.sentinel.initialize();

    // Configurar listeners de eventos
    this.setupEventBridge();

    this.isConnected = true;
    this.bridgeMetrics.connectionTime = Date.now();
    
    console.log('✅ Bridge ativa: Nexus ↔ Sentinel');
    console.log('✅ Monitoramento de imunidade: ATIVO');
    console.log('✅ Auto-restart: HABILITADO');
    console.log('');

    return true;
  }

  setupEventBridge() {
    // Sentinel → Nexus: Comandos de controle
    this.sentinel.on('latency_peak', (latency) => {
      console.log(`[BRIDGE] Latência pico encaminhada: ${latency}ms`);
      this.bridgeMetrics.alertsForwarded++;
      
      // Ação: Ajustar paralelismo do Nexus
      if (this.nexus && latency > 200) {
        console.log('[BRIDGE] Reduzindo paralelismo devido a latência alta');
      }
    });

    this.sentinel.on('buffer_overflow', (size) => {
      console.log(`[BRIDGE] Buffer overflow detectado: ${size}`);
      this.bridgeMetrics.alertsForwarded++;
    });

    this.sentinel.on('auto_restart_initiated', (data) => {
      console.log(`[BRIDGE] Auto-restart iniciado: ${data.reason}`);
      this.bridgeMetrics.restartsTriggered++;
    });

    this.sentinel.on('max_restarts_exceeded', (data) => {
      console.log('[BRIDGE] ALERTA CRÍTICO: Máximo de restarts excedido!');
      // Notificar operador humano
    });

    this.sentinel.on('whale_alert', (tx) => {
      console.log(`[BRIDGE] Whale alert: ${tx.value} ETH`);
      // Encaminhar para dashboard em tempo real
    });

    this.sentinel.on('priority_sync_required', (data) => {
      console.log('[BRIDGE] Sync prioritário solicitado pelo Sentinel');
      // Forçar sync imediato com Grafana
    });

    // Nexus → Sentinel: Status updates
    this.nexus.on('opportunities', (ops) => {
      // O Nexus já envia oportunidades, o Sentinel valida o fluxo
      if (ops.length > 0 && this.sentinel) {
        // Notificar que o Nexus está operacional
      }
    });
  }

  async start() {
    if (!this.isConnected) {
      throw new Error('Bridge não inicializada');
    }

    // Iniciar Nexus (o Sentinel já está monitorando)
    await this.nexus.start();

    console.log('[BRIDGE] Sistema operacional sob proteção Sentinel');
    
    // Loop de status
    setInterval(() => {
      this.printBridgeStatus();
    }, 30000);
  }

  printBridgeStatus() {
    const sentinelStatus = this.sentinel.getStatus();
    const nexusStatus = this.nexus.getStatus();
    
    console.log('');
    console.log(`[BRIDGE STATUS] ${new Date().toISOString()}`);
    console.log(`  Sentinel: ${sentinelStatus.status} | Nexus: ${nexusStatus.running ? 'RUNNING' : 'STOPPED'}`);
    console.log(`  Latency peaks: ${sentinelStatus.metrics.latencyPeaks.length} | Buffer overflows: ${sentinelStatus.metrics.bufferOverflows}`);
    console.log(`  Restarts: ${sentinelStatus.metrics.restartCount} | Auto-heals: ${sentinelStatus.metrics.autoHeals}`);
    console.log(`  Whale alerts: ${sentinelStatus.metrics.whaleAlerts} | Grafana syncs: ${sentinelStatus.metrics.grafanaSyncs}`);
    console.log('');
  }

  getFullStatus() {
    return {
      bridge: {
        connected: this.isConnected,
        metrics: this.bridgeMetrics
      },
      sentinel: this.sentinel?.getStatus(),
      nexus: this.nexus?.getStatus()
    };
  }

  async emergencyStop() {
    console.log('[BRIDGE] EMERGENCY STOP ativado');
    await this.sentinel.stop();
    this.isConnected = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const bridge = new SentinelNexusBridge();

async function main() {
  await bridge.initialize();
  await bridge.start();
}

main().catch(async (error) => {
  console.error('[BRIDGE ERROR]', error);
  await bridge.emergencyStop();
  process.exit(1);
});

export { SentinelNexusBridge };
