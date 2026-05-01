#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MARKETPLACE ORCHESTRATOR v1.0 - Supreme Integration Layer
 * 
 * Integra todos os módulos:
 * - Signal Provider Layer (multi-provider)
 * - Signal Marketplace Engine (ranking + dispatch)
 * - Monetization Engine (revenue + PIX)
 * - Proof of Value (tracking + validator)
 * - Distribution Layer (Telegram + API + Cornix)
 * - Acquisition Engine (referral + viral)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// Import all modules
import { providerLayer } from './signalProviderLayer.js';
import { marketplaceEngine } from './signalMarketplaceEngine.js';
import { marketplaceMonetization } from './marketplaceMonetization.js';
import { proofOfValue } from './proofOfValue.js';
import { distributionLayer } from './distributionLayer.js';
import { acquisitionEngine } from './acquisitionEngine.js';

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════
class MarketplaceOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.isInitialized = false;
    
    // Module references
    this.modules = {
      provider: providerLayer,
      engine: marketplaceEngine,
      monetization: marketplaceMonetization,
      proof: proofOfValue,
      distribution: distributionLayer,
      acquisition: acquisitionEngine
    };
    
    // Stats
    this.stats = {
      signals_processed: 0,
      revenue_generated: 0,
      users_acquired: 0,
      start_time: null
    };
    
    this.init();
  }
  
  async init() {
    console.log('\n🏪 ═══════════════════════════════════════════════════════════════');
    console.log('   GXEON SIGNAL MARKETPLACE SUPREME');
    console.log('   ═══════════════════════════════════════════════════════════════\n');
    
    try {
      // Init Supabase
      const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Wait for all modules to be ready
      await this.waitForModules();
      
      this.isInitialized = true;
      this.stats.start_time = new Date().toISOString();
      
      console.log('✅ Marketplace Supreme: TODOS os módulos integrados');
      console.log('   📡 Signal Provider Layer: PRONTO');
      console.log('   🏪 Marketplace Engine: PRONTO');
      console.log('   💰 Monetization Engine: PRONTO');
      console.log('   ✅ Proof of Value: PRONTO');
      console.log('   📡 Distribution Layer: PRONTO');
      console.log('   📢 Acquisition Engine: PRONTO');
      console.log('\n═══════════════════════════════════════════════════════════════════\n');
      
      this.emit('marketplace:ready');
      
    } catch (err) {
      console.error('❌ Erro na inicialização:', err);
      this.emit('marketplace:error', err);
    }
  }
  
  /**
   * Aguarda inicialização dos módulos
   */
  async waitForModules() {
    const checkInterval = 100;
    const maxAttempts = 50; // 5 segundos
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const check = () => {
        attempts++;
        
        const allReady = 
          providerLayer &&
          marketplaceEngine &&
          marketplaceMonetization &&
          proofOfValue &&
          distributionLayer &&
          acquisitionEngine;
        
        if (allReady) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout waiting for modules'));
        } else {
          setTimeout(check, checkInterval);
        }
      };
      
      check();
    });
  }
  
  /**
   * Configura listeners de eventos entre módulos
   */
  setupEventListeners() {
    // Provider Layer -> Marketplace Engine
    providerLayer.on('signal:normalized', async (signal) => {
      console.log(`[🔗 Orquestrador] Sinal normalizado recebido: ${signal.signal_id}`);
      
      // Send to marketplace engine
      const result = await marketplaceEngine.receiveSignal(signal);
      
      if (result.success) {
        // Start proof tracking
        await proofOfValue.tracker.trackSignal(signal);
        
        // Distribute
        await this.distributeSignal(signal);
        
        this.stats.signals_processed++;
      }
    });
    
    // Marketplace Engine -> Distribution
    marketplaceEngine.on('signal:listed', async (data) => {
      console.log(`[🔗 Orquestrador] Sinal listado: ${data.signal_id} | Score: ${data.score}`);
      
      // Broadcast to B2B
      await distributionLayer.webhook.broadcastToB2B('signal_new', data);
    });
    
    // Signal closed (hit target/stop)
    proofOfValue.on('signal:closed', async (data) => {
      console.log(`[🔗 Orquestrador] Sinal fechado: ${data.signal_id} | ${data.result}`);
      
      // Recalculate provider score
      await providerLayer.calculateProviderScore(data.provider_id);
      
      // Broadcast result
      await distributionLayer.webhook.broadcastToB2B('signal_result', data);
      
      // Update leaderboard
      await proofOfValue.leaderboard.calculateAllLeaderboards();
    });
    
    // Revenue events
    marketplaceMonetization.on('payment:confirmed', async (data) => {
      console.log(`[🔗 Orquestrador] Pagamento confirmado: R$ ${data.amount}`);
      
      this.stats.revenue_generated += data.amount;
      
      // Check if it's a subscription (for referral)
      if (data.type === 'SUBSCRIPTION_PAYMENT') {
        // Process referral conversion
        // acquisitionEngine.referral.processConversion(...)
      }
    });
    
    // Referral conversion
    acquisitionEngine.on('referral:converted', async (data) => {
      console.log(`[🔗 Orquestrador] Referral convertido: ${data.referrer_id}`);
      
      // Grant reward
      await acquisitionEngine.referral.grantReferralReward(data.referrer_id);
    });
    
    // User acquisition
    acquisitionEngine.on('user:welcome', (data) => {
      console.log(`[🔗 Orquestrador] Novo usuário: ${data.user_id}`);
      this.stats.users_acquired++;
    });
    
    // Antenna posts
    acquisitionEngine.on('antenna:post', (data) => {
      console.log(`[🔗 Orquestrador] Antenna post: ${data.campaign_id} -> ${data.group}`);
    });
  }
  
  /**
   * Distribui sinal para todos os canais
   */
  async distributeSignal(signal) {
    try {
      // Determine tiers to distribute
      const tiers = ['FREE', 'PRO', 'ENTERPRISE'];
      const channels = ['telegram', 'api'];
      
      for (const tier of tiers) {
        // Check tier access
        const tierAccess = { 
          FREE: ['FREE'], 
          PRO: ['FREE', 'PRO'], 
          ENTERPRISE: ['FREE', 'PRO', 'ENTERPRISE'] 
        };
        
        if (!tierAccess[tier].includes(signal.tier_access)) {
          continue;
        }
        
        // Get subscribers
        const subscribers = await marketplaceEngine.dispatcher.getSubscribers(tier);
        
        // Format message
        const message = distributionLayer.telegram.formatSignal(signal, tier);
        
        // Log dispatch
        await this.supabase?.from('signal_dispatch_log').insert({
          signal_id: signal.id,
          tier_delivered: tier,
          channel: 'telegram',
          dispatched_at: new Date().toISOString(),
          recipients_count: subscribers.length
        });
        
        // Emit for Telegram bot to send
        this.emit('telegram:send', {
          tier,
          message,
          subscribers: subscribers.map(s => s.telegram_chat_id).filter(Boolean)
        });
      }
      
    } catch (err) {
      console.error('[🔗 Orquestrador] Erro na distribuição:', err);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Processa sinal do provider interno
   */
  async processInternalSignal(rawSignal, strategy = 'arbitrage') {
    try {
      // Validate
      const validation = providerLayer.getInternalProvider()?.validateSignal(rawSignal);
      
      if (!validation?.valid) {
        return { success: false, errors: validation?.errors };
      }
      
      // Normalize
      const normalized = providerLayer.getInternalProvider()?.normalizeSignal(rawSignal);
      
      // Process
      const result = await providerLayer.receiveInternalSignal(normalized, strategy);
      
      return result;
      
    } catch (err) {
      console.error('[🔗 Orquestrador] Erro ao processar sinal:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Cria novo provider externo
   */
  async registerExternalProvider(config) {
    return await providerLayer.registerProvider(config);
  }
  
  /**
   * Processa webhook de provider externo
   */
  async processProviderWebhook(providerId, payload, signature) {
    return await providerLayer.handleWebhookRequest(providerId, payload, signature);
  }
  
  /**
   * Cria subscription para usuário
   */
  async createSubscription(userId, email, tier) {
    return await marketplaceMonetization.subscriptions.createSubscription(
      userId,
      email,
      tier
    );
  }
  
  /**
   * Confirma pagamento PIX
   */
  async confirmPixPayment(userId, pixTransactionId, amount) {
    return await marketplaceMonetization.subscriptions.confirmPayment(
      userId,
      pixTransactionId,
      amount
    );
  }
  
  /**
   * Processa novo usuário (com referral opcional)
   */
  async processNewUser(userId, referralCode = null) {
    return await acquisitionEngine.processNewUser(userId, referralCode);
  }
  
  /**
   * Gera link de referral
   */
  async generateReferralLink(userId) {
    return await acquisitionEngine.referral.generateReferralLink(userId);
  }
  
  /**
   * Valida resultado de sinal (admin)
   */
  async validateSignalResult(signalId, result, exitPrice, evidenceUrl, validatedBy) {
    return await proofOfValue.validator.validateManual(
      signalId,
      result,
      exitPrice,
      evidenceUrl,
      validatedBy
    );
  }
  
  /**
   * Cria campanha de aquisição
   */
  async createAcquisitionCampaign(config) {
    return await acquisitionEngine.antenna.createCampaign(config);
  }
  
  /**
   * Inicia campanha de aquisição
   */
  async startAcquisitionCampaign(campaignId) {
    return await acquisitionEngine.antenna.startCampaign(campaignId);
  }
  
  /**
   * Retorna estatísticas completas
   */
  async getFullStats() {
    const [revenue, proof, acquisition] = await Promise.all([
      marketplaceMonetization.getRevenueStats('daily'),
      proofOfValue.getStats(),
      acquisitionEngine.getStats()
    ]);
    
    return {
      marketplace: {
        active_signals: marketplaceEngine.activeSignals.size,
        providers: providerLayer.providers.size,
        signals_processed: this.stats.signals_processed
      },
      revenue,
      proof,
      acquisition,
      uptime: this.stats.start_time 
        ? Math.floor((Date.now() - new Date(this.stats.start_time).getTime()) / 1000)
        : 0
    };
  }
  
  /**
   * Health check
   */
  healthCheck() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      modules: {
        provider: !!providerLayer,
        engine: !!marketplaceEngine,
        monetization: !!marketplaceMonetization,
        proof: !!proofOfValue,
        distribution: !!distributionLayer,
        acquisition: !!acquisitionEngine
      },
      timestamp: new Date().toISOString()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEGRAM BOT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════
class TelegramBotIntegration {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.setupListeners();
  }
  
  setupListeners() {
    // Listen for send events
    this.orchestrator.on('telegram:send', async (data) => {
      // This would be connected to actual Telegram bot
      console.log(`[🤖 Telegram] Enviando para ${data.subscribers.length} usuários (tier: ${data.tier})`);
    });
  }
  
  /**
   * Handler para comando /signals
   */
  async handleSignalsCommand(userId, tier) {
    const signals = await marketplaceEngine.getSignalsForUser(userId, tier, { limit: 5 });
    
    if (signals.signals.length === 0) {
      return '📭 Nenhum sinal ativo no momento.';
    }
    
    let message = `🌑 *SINAIS ATIVOS* — ${signals.signals.length} disponíveis\n\n`;
    
    signals.signals.forEach((s, i) => {
      const emoji = s.type === 'LONG' ? '🟢' : '🔴';
      const catEmoji = s.ranking?.category === 'HOT' ? '🔥' : s.ranking?.category === 'TRENDING' ? '📈' : '📊';
      
      message += `${i+1}. ${emoji} *${s.pair}* ${catEmoji}\n`;
      message += `   💰 $${s.entry_price} → $${s.target_price}\n`;
      message += `   📊 Conf: ${s.confidence}% | Score: ${s.ranking?.total}\n\n`;
    });
    
    if (signals.meta.upgrade_prompt) {
      message += `\n${signals.meta.upgrade_prompt}`;
    }
    
    return message;
  }
  
  /**
   * Handler para comando /upgrade
   */
  async handleUpgradeCommand(userId, currentTier) {
    const pricing = await this.orchestrator.modules.monetization.subscriptions
      .generatePaymentInstructions('PRO', 'user@example.com');
    
    return pricing.message || `
💎 *UPGRADE PARA PRO*

R$ 25/mês = Acesso completo:
✅ Sinais ilimitados
✅ Tempo real (sem delay)
✅ Sinais PREMIUM exclusivos
✅ Suporte prioritário

👉 Use /subscribe PRO para ativar
    `;
  }
  
  /**
   * Handler para comando /history
   */
  async handleHistoryCommand(userId) {
    return await proofOfValue.getTelegramHistory(userId, 10);
  }
  
  /**
   * Handler para comando /leaderboard
   */
  async handleLeaderboardCommand() {
    const leaderboard = await proofOfValue.leaderboard.getLeaderboard('daily', 'top_signals', 5);
    return proofOfValue.leaderboard.formatForTelegram(leaderboard);
  }
  
  /**
   * Handler para comando /referral
   */
  async handleReferralCommand(userId) {
    const result = await this.orchestrator.generateReferralLink(userId);
    return result.message || 'Erro ao gerar link de referral.';
  }
  
  /**
   * Handler para comando /simulate
   */
  async handleSimulateCommand(signalId, capital = 1000) {
    const signal = marketplaceEngine.activeSignals.get(signalId);
    
    if (!signal) {
      return '❌ Sinal não encontrado.';
    }
    
    const simulation = proofOfValue.simulator.simulate(signal, capital);
    
    return `
📊 *SIMULAÇÃO* — ${signal.pair}

💰 Capital: $${capital}

*Cenário de Lucro:*
📈 ${simulation.profit_scenario.percent.toFixed(2)}% = $${simulation.profit_scenario.usd.toFixed(2)}

*Cenário de Perda:*
📉 ${simulation.loss_scenario.percent.toFixed(2)}% = -$${simulation.loss_scenario.usd.toFixed(2)}

⚖️ R/R: ${simulation.risk_reward_ratio.toFixed(2)}:1
🎯 Valor Esperado: $${simulation.expected_value_usd.toFixed(2)}

*Recomendação:* ${simulation.recommendation}
    `;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const orchestrator = new MarketplaceOrchestrator();
const telegramIntegration = new TelegramBotIntegration(orchestrator);

export { 
  MarketplaceOrchestrator, 
  TelegramBotIntegration,
  orchestrator,
  telegramIntegration 
};
export default orchestrator;
