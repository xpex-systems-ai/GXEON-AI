#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DISTRIBUTION LAYER v1.0 - Multi-Channel Delivery System
 * 
 * Channels:
 * - Telegram (mantido como principal)
 * - REST API B2B (/signals/live)
 * - Webhooks
 * - Cornix Copy-Trading format
 * 
 * Features:
 * - Delay para FREE tier
 * - Real-time para PRO/ENTERPRISE
 * - Format adapters
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const DISTRIBUTION_CONFIG = {
  DELAYS: {
    FREE: 600, // 10 min
    PRO: 0,
    ENTERPRISE: 0
  },
  
  FORMATS: {
    STANDARD: 'standard', // GXEON native
    CORNIX: 'cornix', // Copy-trading
    TRADINGVIEW: 'tradingview', // Alerts
    WEBHOOK: 'webhook' // JSON raw
  },
  
  WEBHOOK: {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 5000,
    TIMEOUT_MS: 30000
  },
  
  RATE_LIMITS: {
    FREE: 10, // requests per minute
    PRO: 60,
    ENTERPRISE: 300,
    B2B: 600
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CORNIX FORMATTER
// ═══════════════════════════════════════════════════════════════════════════
class CornixFormatter {
  /**
   * Converte sinal GXEON para formato Cornix
   */
  format(signal, options = {}) {
    const {
      exchange = 'Binance',
      leverage = 1,
      marginMode = 'CROSSED'
    } = options;
    
    // Cornix format structure
    const cornixSignal = {
      version: '2.0',
      source: 'GXEON',
      
      // Trade info
      exchange: exchange,
      symbol: this.normalizeSymbol(signal.pair),
      side: signal.type.toLowerCase(), // 'long' or 'short'
      
      // Entry
      entry: {
        type: 'limit', // or 'market'
        price: signal.entry_price,
        orderType: 'limit'
      },
      
      // Targets (take profits)
      targets: [
        {
          price: signal.target_price,
          percent: 100 // All position at target
        }
      ],
      
      // Stop loss
      stopLoss: {
        price: signal.stop_price,
        type: 'limit' // or 'market'
      },
      
      // Advanced options
      advanced: {
        leverage: leverage,
        marginMode: marginMode,
        
        // Trailing stop (opcional)
        trailingStop: {
          enabled: false,
          activationPercent: 2,
          callbackPercent: 1
        },
        
        // Risk management
        riskManagement: {
          maxPositionSize: options.maxPositionSize || 100,
          riskPercent: options.riskPercent || 2
        }
      },
      
      // Metadata
      metadata: {
        signal_id: signal.signal_id,
        provider: signal.provider_name,
        confidence: signal.confidence,
        strategy: signal.strategy,
        timestamp: signal.created_at
      }
    };
    
    // Cornix text format (for Telegram/copy-paste)
    cornixSignal.textFormat = this.toTextFormat(cornixSignal);
    
    return cornixSignal;
  }
  
  /**
   * Normaliza símbolo para formato exchange
   */
  normalizeSymbol(pair) {
    // Convert BTC/USDT to BTCUSDT
    return pair.replace('/', '').replace(' ', '');
  }
  
  /**
   * Converte para formato texto (Cornix auto-detect)
   */
  toTextFormat(cornix) {
    return `
#${cornix.side.toUpperCase()} #${cornix.symbol}

Entry: ${cornix.entry.price}
Target: ${cornix.targets.map(t => t.price).join(', ')}
Stop: ${cornix.stopLoss.price}

Exchange: ${cornix.exchange}
Leverage: ${cornix.advanced.leverage}x
    `.trim();
  }
  
  /**
   * Batch format para múltiplos sinais
   */
  formatBatch(signals, options = {}) {
    return signals.map(s => this.format(s, options));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// B2B API CLIENT MANAGER
// ═══════════════════════════════════════════════════════════════════════════
class B2BClientManager {
  constructor(distribution) {
    this.distribution = distribution;
    this.supabase = distribution.supabase;
    this.clients = new Map(); // api_key -> client config
  }
  
  async init() {
    await this.loadClients();
  }
  
  /**
   * Carrega clientes B2B do banco
   */
  async loadClients() {
    try {
      const { data, error } = await this.supabase
        .from('b2b_clients')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      for (const client of data || []) {
        this.clients.set(client.api_key, client);
      }
      
      console.log(`[📡 Distribution] ${this.clients.size} clientes B2B carregados`);
      
    } catch (err) {
      console.error('[📡 Distribution] Erro ao carregar clientes:', err);
    }
  }
  
  /**
   * Cria novo cliente B2B
   */
  async createClient(config) {
    try {
      const apiKey = `gx_b2b_${crypto.randomBytes(24).toString('hex')}`;
      
      const client = {
        company_name: config.companyName,
        contact_email: config.email,
        api_key: apiKey,
        plan_tier: config.planTier || 'STARTER',
        monthly_limit: config.monthlyLimit || 1000,
        rate_limit_per_minute: config.rateLimit || 60,
        monthly_fee: config.monthlyFee || 500,
        overage_rate: config.overageRate || 0.50,
        webhook_url: config.webhookUrl,
        webhook_secret: config.webhookSecret || crypto.randomBytes(16).toString('hex'),
        webhook_events: config.webhookEvents || ['signal_new', 'signal_result'],
        is_active: true,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('b2b_clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      
      this.clients.set(apiKey, data);
      
      return {
        success: true,
        client_id: data.id,
        api_key: apiKey,
        webhook_secret: client.webhook_secret
      };
      
    } catch (err) {
      console.error('[📡 Distribution] Erro ao criar cliente:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Valida API key
   */
  validateApiKey(apiKey) {
    const client = this.clients.get(apiKey);
    if (!client) return null;
    
    return {
      id: client.id,
      tier: client.plan_tier,
      rateLimit: client.rate_limit_per_minute,
      webhookUrl: client.webhook_url
    };
  }
  
  /**
   * Atualiza último acesso
   */
  async updateLastAccess(apiKey) {
    try {
      await this.supabase
        .from('b2b_clients')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('api_key', apiKey);
    } catch (err) {
      // Silent
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════
class WebhookDispatcher {
  constructor(distribution) {
    this.distribution = distribution;
    this.supabase = distribution.supabase;
    this.deliveryQueue = [];
    this.retryMap = new Map(); // delivery_id -> attempts
    
    this.startDispatchLoop();
  }
  
  startDispatchLoop() {
    setInterval(() => {
      this.processQueue();
    }, 5000);
  }
  
  /**
   * Envia webhook
   */
  async sendWebhook(clientId, eventType, payload) {
    try {
      // Get client
      const { data: client } = await this.supabase
        .from('b2b_clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (!client || !client.webhook_url) {
        return { success: false, error: 'Client or webhook not configured' };
      }
      
      // Create delivery record
      const { data: delivery } = await this.supabase
        .from('webhook_delivery_log')
        .insert({
          client_id: clientId,
          event_type: eventType,
          payload: payload,
          status: 'pending',
          attempt_count: 0
        })
        .select()
        .single();
      
      // Add to queue
      this.deliveryQueue.push({
        delivery_id: delivery.id,
        client,
        eventType,
        payload
      });
      
      return { success: true, delivery_id: delivery.id };
      
    } catch (err) {
      console.error('[📡 Webhook] Erro ao enviar:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Processa fila de webhooks
   */
  async processQueue() {
    const now = Date.now();
    const toProcess = [];
    
    // Get items ready to process
    this.deliveryQueue = this.deliveryQueue.filter(item => {
      const retryDelay = this.retryMap.get(item.delivery_id) || 0;
      if (now >= retryDelay) {
        toProcess.push(item);
        return false;
      }
      return true;
    });
    
    for (const item of toProcess) {
      await this.executeDelivery(item);
    }
  }
  
  /**
   * Executa delivery
   */
  async executeDelivery(item) {
    const { delivery_id, client, eventType, payload } = item;
    
    try {
      // Increment attempt
      const attempts = (this.retryMap.get(delivery_id) || 0) + 1;
      
      // Sign payload
      const signature = this.signPayload(payload, client.webhook_secret);
      
      // Send
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DISTRIBUTION_CONFIG.WEBHOOK.TIMEOUT_MS);
      
      const response = await fetch(client.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GXEON-Signature': signature,
          'X-GXEON-Event': eventType,
          'X-GXEON-Delivery': delivery_id
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      const responseBody = await response.text();
      
      if (response.ok) {
        // Success
        await this.supabase
          .from('webhook_delivery_log')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            http_status: response.status,
            response_body: responseBody,
            attempt_count: attempts
          })
          .eq('id', delivery_id);
        
        this.retryMap.delete(delivery_id);
        
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (err) {
      console.error(`[📡 Webhook] Delivery ${delivery_id} failed:`, err.message);
      
      const attempts = (this.retryMap.get(delivery_id) || 0) + 1;
      
      if (attempts >= DISTRIBUTION_CONFIG.WEBHOOK.MAX_RETRIES) {
        // Give up
        await this.supabase
          .from('webhook_delivery_log')
          .update({
            status: 'failed',
            http_status: 0,
            response_body: err.message,
            attempt_count: attempts
          })
          .eq('id', delivery_id);
        
        this.retryMap.delete(delivery_id);
        
      } else {
        // Retry
        this.retryMap.set(delivery_id, attempts);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.deliveryQueue.push(item);
        }, DISTRIBUTION_CONFIG.WEBHOOK.RETRY_DELAY_MS * attempts);
        
        await this.supabase
          .from('webhook_delivery_log')
          .update({
            status: 'retrying',
            attempt_count: attempts
          })
          .eq('id', delivery_id);
      }
    }
  }
  
  signPayload(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
  
  /**
   * Broadcast para todos os clientes B2B
   */
  async broadcastToB2B(eventType, payload) {
    try {
      const { data: clients } = await this.supabase
        .from('b2b_clients')
        .select('id, webhook_events')
        .eq('is_active', true);
      
      for (const client of clients || []) {
        if (client.webhook_events?.includes(eventType)) {
          await this.sendWebhook(client.id, eventType, payload);
        }
      }
      
    } catch (err) {
      console.error('[📡 Webhook] Erro no broadcast:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEGRAM ENHANCED FORMATTER
// ═══════════════════════════════════════════════════════════════════════════
class TelegramEnhancedFormatter {
  /**
   * Formata sinal para Telegram com tags e tier info
   */
  formatSignal(signal, tier = 'FREE') {
    const emoji = signal.type === 'LONG' ? '🟢' : '🔴';
    const riskEmoji = signal.risk_level === 'low' ? '🟢' : signal.risk_level === 'medium' ? '🟡' : '🔴';
    
    // Tags
    const tagEmojis = {
      'PREMIUM': '💎',
      'EARLY': '⚡',
      'HIGH-RISK': '⚠️',
      'HIGH-REWARD': '🚀',
      'TOP-PROVIDER': '👑'
    };
    
    const tagsStr = (signal.tags || [])
      .map(t => `${tagEmojis[t] || '🏷️'} ${t}`)
      .join(' ');
    
    // Delay warning for FREE
    const delayWarning = tier === 'FREE' 
      ? '\n⚠️ *Sinal com 10min de atraso - /upgrade para tempo real*'
      : '';
    
    // Ranking info
    const rankingStr = signal.ranking 
      ? `📊 Score: *${signal.ranking.total}* | Cat: *${signal.ranking.category}*`
      : '';
    
    return `
${emoji} *GXEON SIGNAL* ${tier === 'ENTERPRISE' ? '👑' : ''}

${tagsStr}

💰 *${signal.pair}* • ${signal.exchange || 'Multiple'}
📈 ${signal.type} | ${signal.strategy?.toUpperCase()}

*ENTRY:* $${signal.entry_price}
*TARGET:* $${signal.target_price} (+${signal.profit_potential}%)
*STOP:* $${signal.stop_price}

${rankingStr}
🎯 Confiança: *${signal.confidence}%*
⏱️ Timeframe: ${signal.timeframe}

⏳ Válido até: ${new Date(signal.valid_until).toLocaleTimeString('pt-BR')}${delayWarning}

🆔 \`${signal.signal_id}\`
    `.trim();
  }
  
  /**
   * Formata leaderboard para Telegram
   */
  formatLeaderboard(leaderboardData) {
    if (!leaderboardData || leaderboardData.length === 0) {
      return '📊 *Leaderboard* — Aguardando resultados...';
    }
    
    let message = `🏆 *TOP SINAIS DO DIA*\n\n`;
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    leaderboardData.forEach((item, i) => {
      const medal = medals[i] || `${i+1}.`;
      message += `${medal} *${item.entity_name}*\n`;
      message += `   📈 +${item.score?.toFixed(2)}% | ${item.win_rate}% win rate\n\n`;
    });
    
    return message;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DISTRIBUTION LAYER
// ═══════════════════════════════════════════════════════════════════════════
class DistributionLayer extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.cornix = new CornixFormatter();
    this.b2b = new B2BClientManager(this);
    this.webhook = new WebhookDispatcher(this);
    this.telegram = new TelegramEnhancedFormatter();
    
    // Rate limiting
    this.requestCounts = new Map(); // api_key -> { count, resetTime }
    
    this.init();
  }
  
  async init() {
    console.log('[📡 DistributionLayer] Inicializando...');
    
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      await this.b2b.init();
    }
    
    // Start rate limit reset loop
    setInterval(() => this.resetRateLimits(), 60000);
    
    console.log('[📡 DistributionLayer] Pronto');
  }
  
  /**
   * Distribui sinal para todos os canais
   */
  async distribute(signal, options = {}) {
    const { 
      channels = ['telegram'],
      tiers = ['FREE', 'PRO', 'ENTERPRISE'],
      delay = true
    } = options;
    
    const results = {};
    
    for (const tier of tiers) {
      // Calculate delay
      const tierDelay = delay ? DISTRIBUTION_CONFIG.DELAYS[tier] || 0 : 0;
      
      for (const channel of channels) {
        const result = await this.sendToChannel(channel, signal, tier, tierDelay);
        results[`${channel}_${tier}`] = result;
      }
    }
    
    // Broadcast to B2B webhooks
    await this.webhook.broadcastToB2B('signal_new', {
      signal_id: signal.signal_id,
      pair: signal.pair,
      type: signal.type,
      entry: signal.entry_price,
      target: signal.target_price,
      stop: signal.stop_price,
      confidence: signal.confidence,
      timestamp: new Date().toISOString()
    });
    
    this.emit('distributed', { signal_id: signal.signal_id, results });
    
    return results;
  }
  
  /**
   * Envia para canal específico
   */
  async sendToChannel(channel, signal, tier, delaySeconds = 0) {
    switch (channel) {
      case 'telegram':
        return this.prepareTelegram(signal, tier, delaySeconds);
      case 'api':
        return this.prepareAPI(signal, tier);
      case 'cornix':
        return this.prepareCornix(signal);
      default:
        return { error: 'Unknown channel' };
    }
  }
  
  prepareTelegram(signal, tier, delay) {
    const message = this.telegram.formatSignal(signal, tier);
    
    return {
      channel: 'telegram',
      tier,
      message,
      delay_seconds: delay,
      scheduled_at: delay > 0 ? new Date(Date.now() + delay * 1000).toISOString() : null
    };
  }
  
  prepareAPI(signal, tier) {
    return {
      channel: 'api',
      tier,
      data: signal,
      endpoint: '/v1/signals/live'
    };
  }
  
  prepareCornix(signal) {
    const cornixFormat = this.cornix.format(signal);
    
    return {
      channel: 'cornix',
      data: cornixFormat,
      text_format: cornixFormat.textFormat
    };
  }
  
  /**
   * Verifica rate limit
   */
  checkRateLimit(apiKey, tier = 'FREE') {
    const now = Date.now();
    const limit = DISTRIBUTION_CONFIG.RATE_LIMITS[tier] || 10;
    
    let data = this.requestCounts.get(apiKey);
    
    if (!data || now > data.resetTime) {
      data = { count: 0, resetTime: now + 60000 };
      this.requestCounts.set(apiKey, data);
    }
    
    if (data.count >= limit) {
      return {
        allowed: false,
        retry_after: Math.ceil((data.resetTime - now) / 1000)
      };
    }
    
    data.count++;
    
    return {
      allowed: true,
      remaining: limit - data.count,
      reset_at: new Date(data.resetTime).toISOString()
    };
  }
  
  resetRateLimits() {
    const now = Date.now();
    
    for (const [key, data] of this.requestCounts) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
  
  /**
   * Formata para Cornix (endpoint específico)
   */
  formatForCornix(signalId) {
    // Fetch signal
    // Return cornix format
    return this.cornix.format(signalId);
  }
  
  /**
   * Estatísticas
   */
  getStats() {
    return {
      b2b_clients: this.b2b.clients.size,
      webhook_queue: this.webhook.deliveryQueue.length,
      rate_limits_active: this.requestCounts.size
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const distributionLayer = new DistributionLayer();

export {
  DistributionLayer,
  CornixFormatter,
  B2BClientManager,
  WebhookDispatcher,
  TelegramEnhancedFormatter,
  distributionLayer,
  DISTRIBUTION_CONFIG
};
export default distributionLayer;
