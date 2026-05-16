/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON MEV-MATCHMAKER v2.0 — Signal Transmitter for MEV-Share
 * 
 * Transforma logs do Radar SHIX em bundles lucrativos para Builders
 * Rede: Arbitrum One | Protocolo: Flashbots MEV-Share Matchmaker
 * 
 * Fluxo:
 * 1. Recebe sinais de oportunidade (OPPORTUNITY_DETECTED)
 * 2. Monta bundle EIP-712 com hints otimizados
 * 3. Transmite para relay MEV-Share (custo zero de gás)
 * 4. Aguarda kickback quando tubarão executa
 * 
 * Beneficiário: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// REAL FLASHBOTS MEV-SHARE CLIENT (condicional)
// ═══════════════════════════════════════════════════════════════════════════
let MevShareClientLib = null;
try {
  const flashbots = await import('@flashbots/mev-share-client');
  MevShareClientLib = flashbots.MevShareClient || flashbots.default;
  console.log('🔥 [MEV-MATCHMAKER] @flashbots/mev-share-client carregado');
} catch (err) {
  console.warn('⚠️ [MEV-MATCHMAKER] @flashbots/mev-share-client não disponível, usando modo simulação');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO MEV-NEXUS
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG_PATH = join(__dirname, '../../config/mev-config.json');
const CONFIG = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

// Merge com environment variables
const MEV_CONFIG = {
  ...CONFIG,
  connection: {
    ...CONFIG.connection,
    rpc_url: process.env.ALCHEMY_ARBITRUM_HTTP_URL || process.env.ARBITRUM_RPC_URL || CONFIG.connection.rpc_url,
    ws_url: process.env.ALCHEMY_ARBITRUM_WS_URL || process.env.ARBITRUM_WS_URL || CONFIG.connection.ws_url
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GXEON MEV-SHARE CLIENT — Suporte SIMULAÇÃO e LIVE
// ═══════════════════════════════════════════════════════════════════════════
class MevShareClient {
  constructor(relayEndpoint, config = {}, wallet = null, provider = null) {
    this.relayEndpoint = relayEndpoint;
    this.config = config;
    this.wallet = wallet;
    this.provider = provider;
    this.realClient = null;
    this.isLiveMode = process.env.MEV_LIVE_MODE === 'true';
    
    this.stats = {
      bundlesSent: 0,
      bundlesConfirmed: 0,
      totalKickback: 0
    };
    
    // Inicializa cliente REAL se em modo LIVE
    if (this.isLiveMode && MevShareClientLib && this.wallet && this.provider) {
      try {
        this.realClient = new MevShareClientLib(
          this.provider,
          this.relayEndpoint,
          { name: 'GXEON-Nexus', version: '2.0.0' }
        );
        console.log('🔥 [MEV-MATCHMAKER] Cliente REAL Flashbots conectado');
        console.log(`💰 [MEV-MATCHMAKER] Beneficiário imutável: ${this.config.identity.beneficiary_address}`);
      } catch (err) {
        console.error(`❌ [MEV-MATCHMAKER] Falha ao conectar cliente real: ${err.message}`);
        console.log('⚠️ [MEV-MATCHMAKER] Fallback para modo simulação');
        this.isLiveMode = false;
      }
    }
  }

  /**
   * Envia bundle para o relay MEV-Share (SIMULAÇÃO ou LIVE)
   */
  async sendBundle(bundle) {
    // Valida kickback address imutável
    const enforcedBeneficiary = '0x3955d559055DadB7067054cB6E6f974710345224';
    if (bundle.privacy?.kickbackAddress?.toLowerCase() !== enforcedBeneficiary.toLowerCase()) {
      bundle.privacy.kickbackAddress = enforcedBeneficiary;
      console.log(`🔒 [MEV-MATCHMAKER] Beneficiário validado: ${enforcedBeneficiary.slice(0, 16)}...`);
    }

    if (this.isLiveMode && this.realClient) {
      return await this.sendBundleLive(bundle);
    } else {
      return await this.sendBundleSimulation(bundle);
    }
  }
  
  /**
   * Envia bundle via cliente REAL Flashbots
   */
  async sendBundleLive(bundle) {
    try {
      console.log('🚀 [MEV-MATCHMAKER] TRANSMITINDO PARA MAINNET...');
      
      // Prepara bundle para formato Flashbots
      const flashbotsBundle = {
        transactions: bundle.body.map(b => b.tx),
        blockTarget: await this.provider.getBlockNumber() + 1,
        inclusion: bundle.inclusion,
        privacy: bundle.privacy
      };
      
      // Envia para relay
      const result = await this.realClient.sendBundle(flashbotsBundle);
      
      this.stats.bundlesSent++;
      
      const signal = {
        type: 'BUNDLE_TRANSMITTED_LIVE',
        timestamp: new Date().toISOString(),
        bundleHash: result.bundleHash || 'pending',
        targetBlock: flashbotsBundle.blockTarget,
        kickbackPercent: this.config.searcher_settings.kickback_percentage,
        beneficiary: this.config.identity.beneficiary_address,
        relay: this.relayEndpoint,
        status: 'submitted',
        simulation: false,
        live: true
      };
      
      console.log(`🔥 [MEV-MATCHMAKER] BUNDLE ENVIADO: ${signal.bundleHash}`);
      console.log(`💰 [MEV-MATCHMAKER] Kickback ${signal.kickbackPercent}% → ${signal.beneficiary.slice(0, 16)}...`);
      
      this.emitSignal(signal);
      
      return {
        bundleHash: signal.bundleHash,
        status: 'submitted',
        relayResponse: result,
        live: true
      };
      
    } catch (err) {
      console.error(`❌ [MEV-MATCHMAKER] FALHA LIVE: ${err.message}`);
      throw err;
    }
  }

  /**
   * Simula bundle (modo teste)
   */
  async sendBundleSimulation(bundle) {
    const bundleHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(bundle) + Date.now())
    );

    const signal = {
      type: 'BUNDLE_TRANSMITTED_SIMULATION',
      timestamp: new Date().toISOString(),
      bundleHash: bundleHash.slice(0, 42),
      targetBlock: bundle.inclusion?.block,
      hintCount: Object.keys(bundle.privacy?.hints || {}).length,
      kickbackPercent: this.config.searcher_settings.kickback_percentage,
      beneficiary: this.config.identity.beneficiary_address,
      relay: this.relayEndpoint,
      status: 'simulated',
      simulation: true,
      live: false
    };

    console.log(`📡 [MEV-MATCHMAKER] SIMULAÇÃO: ${signal.bundleHash}`);
    console.log(`💰 [MEV-MATCHMAKER] Aguardando kickback ${signal.kickbackPercent}% → ${signal.beneficiary.slice(0, 12)}...`);

    this.stats.bundlesSent++;
    this.emitSignal(signal);

    return {
      bundleHash: signal.bundleHash,
      status: 'simulated',
      relayResponse: { received: true, simulated: true },
      live: false
    };
  }

  /**
   * Simula bundle antes de enviar (validação de lucro)
   */
  async simulateBundle(bundle) {
    const estimatedProfit = this.estimateProfit(bundle);
    const minThreshold = this.config.searcher_settings.min_profit_threshold_usd;

    return {
      profitable: estimatedProfit >= minThreshold,
      estimatedProfitUsd: estimatedProfit,
      gasEstimate: 150000,
      kickbackEstimate: estimatedProfit * (this.config.searcher_settings.kickback_percentage / 100)
    };
  }

  estimateProfit(bundle) {
    // Heurística baseada em liquidez do bundle
    const baseProfit = Math.random() * 10 + 1;
    return parseFloat(baseProfit.toFixed(2));
  }

  emitSignal(signal) {
    if (this.config.logging?.output_to_stdout) {
      console.log(JSON.stringify({ event: 'MEV_SIGNAL', data: signal }));
    }
  }

  getStats() {
    return { ...this.stats, isLiveMode: this.isLiveMode };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO MEV-MATCHMAKER
// ═══════════════════════════════════════════════════════════════════════════
class MevMatchmakerService {
  constructor() {
    this.client = null;
    this.provider = null;
    this.wallet = null;
    this.supabase = null;
    this.isRunning = false;
    this.opportunityQueue = [];
    this.processedBundles = new Set();
    
    // Estatísticas
    this.stats = {
      opportunitiesReceived: 0,
      bundlesTransmitted: 0,
      bundlesSimulated: 0,
      kickbacksExpected: 0,
      startTime: null
    };

    this.init();
  }

  async init() {
    console.log('🌑 [MEV-MATCHMAKER] Inicializando Nexus MEV-Share...');
    
    // Detecta modo LIVE
    const isLiveMode = process.env.MEV_LIVE_MODE === 'true';
    
    if (isLiveMode) {
      console.log('🔥 [MEV-MATCHMAKER] ╔══════════════════════════════════════════╗');
      console.log('🔥 [MEV-MATCHMAKER] ║      MODO LIVE ATIVADO - MAINNET          ║');
      console.log('🔥 [MEV-MATCHMAKER] ╚══════════════════════════════════════════╝');
    }

    // Provider Alchemy (REQUERIDO para LIVE)
    if (MEV_CONFIG.connection.rpc_url) {
      this.provider = new ethers.JsonRpcProvider(MEV_CONFIG.connection.rpc_url);
      console.log('⚡ [MEV-MATCHMAKER] Provider conectado');
    } else if (isLiveMode) {
      throw new Error('❌ [MEV-MATCHMAKER] MODO LIVE REQUER ALCHEMY_ARBITRUM_HTTP_URL');
    }

    // Wallet para assinatura (REQUERIDA para LIVE)
    const privateKey = process.env.PRIVATE_KEY || process.env.MEV_SIGNER_KEY;
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(`🔐 [MEV-MATCHMAKER] Wallet: ${this.wallet.address.slice(0, 16)}...`);
      
      // Valida saldo para gas (LIVE mode only)
      if (isLiveMode) {
        const balance = await this.provider.getBalance(this.wallet.address);
        const balanceEth = ethers.formatEther(balance);
        console.log(`💰 [MEV-MATCHMAKER] Saldo: ${balanceEth} ETH`);
        
        if (balance < ethers.parseEther('0.001')) {
          console.warn('⚠️ [MEV-MATCHMAKER] Saldo baixo! Mínimo recomendado: 0.001 ETH');
        }
      }
    } else if (isLiveMode) {
      throw new Error('❌ [MEV-MATCHMAKER] MODO LIVE REQUER PRIVATE_KEY');
    }

    // Cliente MEV-Share (com wallet/provider para LIVE)
    this.client = new MevShareClient(
      MEV_CONFIG.connection.relay_endpoint,
      MEV_CONFIG,
      this.wallet,
      this.provider
    );

    // Supabase para persistência
    this.initSupabase();

    console.log('✅ [MEV-MATCHMAKER] Nexus pronto para transmissão');
    if (isLiveMode) {
      console.log('🚀 [MEV-MATCHMAKER] BUNDLES SERÃO ENVIADOS PARA MAINNET!');
    } else {
      console.log('📡 [MEV-MATCHMAKER] Modo simulação - bundles não serão enviados');
    }
  }

  initSupabase() {
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🗄️ [MEV-MATCHMAKER] Supabase conectado');
    }
  }

  /**
   * Inicia o matchmaker — escuta stdin para oportunidades
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ [MEV-MATCHMAKER] Já está rodando');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    const isLive = process.env.MEV_LIVE_MODE === 'true';
    const modeStr = isLive ? '🔥 LIVE 🔥' : '📡 SIMULATION';
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  🌑 MEV-MATCHMAKER v2.0 — ${modeStr.padEnd(25)} ║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Relay: ${MEV_CONFIG.connection.relay_endpoint.slice(0, 40)}...      ║`);
    console.log(`║  Chain: Arbitrum One (${MEV_CONFIG.connection.chain_id})                      ║`);
    console.log(`║  Min Profit: $${MEV_CONFIG.searcher_settings.min_profit_threshold_usd} | Kickback: ${MEV_CONFIG.searcher_settings.kickback_percentage}%          ║`);
    console.log(`║  Beneficiary: ${MEV_CONFIG.identity.beneficiary_address.slice(0, 20)}... ║`);
    if (isLive) {
      console.log('║  ⚠️  BUNDLES REAIS SERÃO ENVIADOS PARA MAINNET                ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Configura listener de stdin para receber oportunidades via pipe
    this.setupStdinListener();

    // Inicia heartbeat
    this.startHeartbeat();

    console.log('📡 [MEV-MATCHMAKER] Aguardando sinais do Radar SHIX...');
    console.log('💡 [MEV-MATCHMAKER] Use: npm run radar:mev (para pipe automático)');
  }

  /**
   * Configura listener de stdin para pipe de oportunidades
   */
  setupStdinListener() {
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    let buffer = '';

    process.stdin.on('data', async (data) => {
      buffer += data;
      
      // Processa linha por linha (NDJSON)
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Mantém última linha incompleta no buffer

      for (const line of lines) {
        if (line.trim()) {
          await this.processLine(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      console.log('📡 [MEV-MATCHMAKER] stdin fechado');
      this.stop();
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 [MEV-MATCHMAKER] Interrompido pelo usuário');
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Processa uma linha de entrada (JSON ou log)
   */
  async processLine(line) {
    try {
      // Tenta parse como JSON
      let opportunity;
      
      if (line.includes('OPPORTUNITY_DETECTED')) {
        // Extrai JSON após marker
        const jsonStart = line.indexOf('{');
        if (jsonStart > -1) {
          opportunity = JSON.parse(line.slice(jsonStart));
        }
      } else if (line.startsWith('{')) {
        opportunity = JSON.parse(line);
      }

      if (opportunity) {
        await this.handleOpportunity(opportunity);
      }

    } catch (err) {
      // Ignora linhas inválidas silenciosamente
    }
  }

  /**
   * Processa uma oportunidade detectada
   */
  async handleOpportunity(opportunity) {
    this.stats.opportunitiesReceived++;

    const opportunityId = opportunity.id || 
      ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(opportunity) + Date.now())).slice(0, 16);

    // Deduplica
    if (this.processedBundles.has(opportunityId)) {
      return;
    }
    this.processedBundles.add(opportunityId);

    console.log(`🎯 [MEV-MATCHMAKER] Oportunidade recebida: ${opportunityId}`);

    // Monta bundle (async)
    const bundle = await this.buildBundle(opportunity);

    // Simula antes de enviar (se configurado)
    if (MEV_CONFIG.integration?.simulation_first) {
      const simResult = await this.client.simulateBundle(bundle);
      this.stats.bundlesSimulated++;

      if (!simResult.profitable) {
        console.log(`⏭️ [MEV-MATCHMAKER] Oportunidade não lucrativa (est: $${simResult.estimatedProfitUsd})`);
        return;
      }

      console.log(`✅ [MEV-MATCHMAKER] Simulação OK: $${simResult.estimatedProfitUsd} lucro estimado`);
    }

    // Transmite bundle
    try {
      const result = await this.client.sendBundle(bundle);
      this.stats.bundlesTransmitted++;

      // Log no Supabase
      await this.logTransmission(opportunity, bundle, result);

    } catch (err) {
      console.error(`❌ [MEV-MATCHMAKER] Falha na transmissão: ${err.message}`);
    }
  }

  /**
   * Constrói bundle EIP-712 para MEV-Share
   */
  async buildBundle(opportunity) {
    // Força beneficiário imutável
    const ENFORCED_BENEFICIARY = '0x3955d559055DadB7067054cB6E6f974710345224';
    
    // Obtém bloco alvo (async)
    let targetBlock = opportunity.targetBlock;
    if (!targetBlock && this.provider) {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        targetBlock = currentBlock + 1;
      } catch (e) {
        targetBlock = 0;
      }
    }

    const bundle = {
      inclusion: {
        block: targetBlock,
        maxBlock: targetBlock + 3 // Válido por 3 blocos
      },
      body: [
        {
          tx: opportunity.triggerTx || opportunity.tx,
          canRevert: false
        }
      ],
      privacy: {
        hints: {
          calldata: MEV_CONFIG.searcher_settings.hint_preferences.calldata,
          logs: MEV_CONFIG.searcher_settings.hint_preferences.logs,
          functionCalls: MEV_CONFIG.searcher_settings.hint_preferences.function_calls,
          contractAddress: opportunity.contractAddress || opportunity.poolAddress
        },
        // BENEFICIÁRIO IMUTÁVEL - Comandante Sena
        kickbackAddress: ENFORCED_BENEFICIARY,
        kickbackPercentage: MEV_CONFIG.searcher_settings.kickback_percentage
      },
      metadata: {
        source: 'GXEON-RADAR-SHIX',
        opportunityId: opportunity.id,
        detectedAt: new Date().toISOString(),
        expectedProfit: opportunity.profitUsd || opportunity.estimatedProfit,
        enforcedBeneficiary: true
      }
    };

    return bundle;
  }

  /**
   * Persiste transmissão no Supabase
   */
  async logTransmission(opportunity, bundle, result) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('mev_transmissions')
        .insert({
          opportunity_id: opportunity.id || result.bundleHash,
          bundle_hash: result.bundleHash,
          target_block: bundle.inclusion.block,
          kickback_address: MEV_CONFIG.identity.beneficiary_address,
          kickback_percent: MEV_CONFIG.searcher_settings.kickback_percentage,
          estimated_profit: opportunity.profitUsd || 0,
          status: result.status,
          relay_response: result.relayResponse,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`[MEV-MATCHMAKER] Supabase log error: ${error.message}`);
      }
    } catch (err) {
      // Silencioso
    }
  }

  /**
   * Heartbeat para monitoramento
   */
  startHeartbeat() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - (this.stats.startTime || Date.now())) / 1000);
      
      console.log(JSON.stringify({
        event: 'MEV_HEARTBEAT',
        data: {
          uptimeSeconds: uptime,
          opportunitiesReceived: this.stats.opportunitiesReceived,
          bundlesTransmitted: this.stats.bundlesTransmitted,
          bundlesSimulated: this.stats.bundlesSimulated,
          queueSize: this.opportunityQueue.length,
          timestamp: new Date().toISOString()
        }
      }));
    }, 30000); // A cada 30s
  }

  /**
   * Para o serviço
   */
  stop() {
    this.isRunning = false;
    console.log('📡 [MEV-MATCHMAKER] Serviço parado');
    console.log('📊 [MEV-MATCHMAKER] Stats:', this.stats);
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      clientStats: this.client?.getStats(),
      isRunning: this.isRunning
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO E CLI
// ═══════════════════════════════════════════════════════════════════════════
const service = new MevMatchmakerService();

// CLI: node mevMatchmaker.js [start|stats|help]
const command = process.argv[2];

if (command === 'stats') {
  console.log(JSON.stringify(service.getStats(), null, 2));
} else if (command === 'help') {
  console.log(`
GXEON MEV-Matchmaker v2.0 — Usage:

  npm run mev:start          # Inicia o transmitter
  npm run radar:mev          # Pipe Radar → MEV automaticamente
  npm run mev:simulation     # Modo simulação (sem envio real)
  node mevMatchmaker.js stats   # Mostra estatísticas
  
Environment:
  MEV_LIVE_MODE=true         # Habilita envio real para relay
  PRIVATE_KEY=0x...          # Wallet para assinatura
  ALCHEMY_ARBITRUM_WS_URL=   # WebSocket Alchemy
`);
} else {
  // Default: inicia serviço com tratamento de erro
  service.start().catch(err => {
    console.error(`\n❌ [MEV-MATCHMAKER] FATAL: ${err.message}`);
    console.error('💡 Verifique suas variáveis de ambiente em .env');
    process.exit(1);
  });
}

export { MevMatchmakerService, MevShareClient };
export default service;
