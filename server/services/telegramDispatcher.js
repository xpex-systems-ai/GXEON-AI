#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TELEGRAM DISPATCHER v1.0 - Zero Capital Revenue Mode
 * Envia alertas de sinais em tempo real para usuários PRO/Enterprise
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const TELEGRAM_CONFIG = {
  ALERT_COOLDOWN_MS: 60000, // 1 min entre alertas do mesmo sinal
  MAX_ALERTS_PER_HOUR: 20,
  PRICE_PER_SIGNAL: 0.01,
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// ═══════════════════════════════════════════════════════════════════════════
// TELEGRAM DISPATCHER CLASS
// ═══════════════════════════════════════════════════════════════════════════
class TelegramDispatcher extends EventEmitter {
  constructor(signalHub) {
    super();
    this.signalHub = signalHub;
    this.bot = null;
    this.subscribers = new Map(); // chatId -> { tier, apiKey, alertsEnabled }
    this.alertHistory = new Map(); // signalId -> timestamp
    this.stats = {
      alertsSent: 0,
      subscribers: 0,
      revenue: 0
    };
    
    this.init();
  }

  async init() {
    console.log('[📱 TelegramDispatcher] Inicializando...');
    
    // Initialize bot if token exists
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      this.bot = new Telegraf(botToken);
      this.setupBotHandlers();
      
      try {
        await this.bot.launch();
        console.log('[📱 TelegramDispatcher] Bot iniciado com sucesso');
      } catch (error) {
        console.error('[📱 TelegramDispatcher] Erro ao iniciar bot:', error.message);
      }
    } else {
      console.warn('[📱 TelegramDispatcher] TELEGRAM_BOT_TOKEN não configurado - modo standalone');
    }
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      await this.loadSubscribers();
    }
    
    // Listen for new signals
    if (this.signalHub) {
      this.signalHub.on('newSignal', (signal) => this.handleNewSignal(signal));
    }
    
    console.log('[📱 TelegramDispatcher] Pronto');
  }

  setupBotHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `
🌑 *GXEON Signal Alerts*

Bem-vindo ao sistema de alertas de arbitragem em tempo real!

*Comandos disponíveis:*
/register <email> <tier> - Registrar para receber alertas
/status - Ver status da sua conta
/stats - Estatísticas do sistema
/help - Ajuda

*Planos:*
• BASIC (gratuito): 10 sinais/dia
• PRO ($10/mês): 100 sinais/dia + alertas Telegram
• ENTERPRISE ($100/mês): 1000 sinais/dia + alertas instantâneos

_Para começar, use /register seu@email.com PRO_
      `;
      
      ctx.replyWithMarkdown(welcomeMessage);
    });

    // Register command
    this.bot.command('register', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const email = args[0];
      const tier = args[1] || 'BASIC';
      
      if (!email || !email.includes('@')) {
        return ctx.reply('❌ Email inválido. Use: /register seu@email.com PRO');
      }
      
      try {
        // Create API key through SignalHub
        const result = await this.signalHub.createApiKey(email, tier.toUpperCase());
        
        // Register subscriber
        const subscriber = {
          chatId: ctx.chat.id,
          username: ctx.from.username,
          email,
          tier: tier.toUpperCase(),
          apiKey: result.apiKey,
          alertsEnabled: tier.toUpperCase() !== 'BASIC',
          joinedAt: Date.now()
        };
        
        this.subscribers.set(ctx.chat.id, subscriber);
        await this.saveSubscriber(subscriber);
        
        this.stats.subscribers++;
        
        let tierMessage = '';
        if (tier.toUpperCase() === 'PRO') {
          tierMessage = '\n✅ Alertas Telegram ativados!';
        } else if (tier.toUpperCase() === 'ENTERPRISE') {
          tierMessage = '\n✅ Alertas Telegram PRIORITÁRIOS ativados!';
        }
        
        ctx.replyWithMarkdown(`
✅ *Registro concluído!*

📧 Email: ${email}
🔑 API Key: \`${result.apiKey.slice(0, 20)}...\`
🏷️ Tier: ${tier.toUpperCase()}
📊 Limite diário: ${result.limits.daily} sinais
💰 Preço: $${TELEGRAM_CONFIG.PRICE_PER_SIGNAL} por sinal

🚀 Use sua API Key para acessar: https://api.gxeon.ai/v1/signals
${tierMessage}
        `);
        
      } catch (error) {
        console.error('[📱 Telegram] Registration error:', error);
        ctx.reply('❌ Erro ao registrar. Tente novamente mais tarde.');
      }
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      const subscriber = this.subscribers.get(ctx.chat.id);
      
      if (!subscriber) {
        return ctx.reply('❌ Você não está registrado. Use /register primeiro.');
      }
      
      const keyData = this.signalHub.apiKeys.get(subscriber.apiKey);
      const usage = keyData?.usage || { daily: 0, monthly: 0 };
      
      ctx.replyWithMarkdown(`
📊 *Sua Conta*

📧 Email: ${subscriber.email}
🏷️ Tier: ${subscriber.tier}
🔔 Alertas: ${subscriber.alertsEnabled ? '✅ Ativados' : '❌ Desativados'}

📈 *Uso:*
• Hoje: ${usage.daily} sinais
• Este mês: ${usage.monthly} sinais

💰 *Custos:*
• Hoje: $${(usage.daily * TELEGRAM_CONFIG.PRICE_PER_SIGNAL).toFixed(2)}
• Este mês: $${(usage.monthly * TELEGRAM_CONFIG.PRICE_PER_SIGNAL).toFixed(2)}
      `);
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      const hubStats = this.signalHub.getStats();
      
      ctx.replyWithMarkdown(`
🌑 *GXEON Signal Hub - Estatísticas*

📡 Sinais ativos: ${hubStats.activeSignals}
👥 Usuários: ${hubStats.totalApiKeys}

📊 *Entregas hoje:*
• Sinais: ${hubStats.revenue.today.signals}
• Receita: $${hubStats.revenue.today.revenue.toFixed(2)}

📈 *Total:*
• Sinais entregues: ${hubStats.revenue.totalSignals}
• Receita total: $${hubStats.revenue.totalRevenue.toFixed(2)}

💰 Preço por sinal: $${hubStats.pricePerSignal}
      `);
    });

    // Help command
    this.bot.command('help', (ctx) => {
      ctx.replyWithMarkdown(`
*Comandos disponíveis:*

/start - Iniciar bot
/register <email> <tier> - Criar conta
/status - Ver sua conta
/stats - Estatísticas gerais
/help - Esta mensagem

*API REST:*
• GET /v1/signals - Listar sinais
• Header: X-API-Key: sua_chave

*Documentação:*
https://docs.gxeon.ai/signals
      `);
    });

    // Handle errors
    this.bot.catch((err, ctx) => {
      console.error('[📱 Telegram] Bot error:', err);
      ctx.reply('❌ Ocorreu um erro. Tente novamente.');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  
  async handleNewSignal(signal) {
    // Only alert for high-confidence signals
    if (signal.confidence < 0.6 || signal.riskScore > 7) {
      return;
    }
    
    // Check cooldown
    const lastAlert = this.alertHistory.get(signal.id);
    if (lastAlert && Date.now() - lastAlert < TELEGRAM_CONFIG.ALERT_COOLDOWN_MS) {
      return;
    }
    
    this.alertHistory.set(signal.id, Date.now());
    
    // Build alert message
    const alertMessage = this.buildAlertMessage(signal);
    
    // Send to subscribers
    let sent = 0;
    for (const [chatId, subscriber] of this.subscribers) {
      // Skip BASIC tier (no Telegram alerts)
      if (subscriber.tier === 'BASIC') continue;
      
      // Skip if alerts disabled
      if (!subscriber.alertsEnabled) continue;
      
      // For PRO tier, only medium+ confidence signals
      if (subscriber.tier === 'PRO' && signal.confidence < 0.7) continue;
      
      try {
        if (this.bot) {
          await this.bot.telegram.sendMessage(chatId, alertMessage, { parse_mode: 'Markdown' });
          sent++;
        }
      } catch (error) {
        console.error(`[📱 Telegram] Failed to send to ${chatId}:`, error.message);
      }
    }
    
    this.stats.alertsSent += sent;
    console.log(`[📱 TelegramDispatcher] Alerta enviado para ${sent} assinantes`);
  }

  buildAlertMessage(signal) {
    const riskEmoji = signal.riskScore <= 3 ? '🟢' : signal.riskScore <= 6 ? '🟡' : '🔴';
    const confidencePercent = Math.round(signal.confidence * 100);
    
    return `
🚨 *NOVO SINAL DE ARBITRAGEM*

${riskEmoji} *Risk Score:* ${signal.riskScore}/10
🎯 *Confiança:* ${confidencePercent}%
💰 *Lucro estimado:* $${signal.estimatedProfitUsd.toFixed(2)}
📊 *ROI:* ${signal.estimatedProfitPercent?.toFixed(2) || 'N/A'}%

🔗 *Detalhes:*
• Rede: ${signal.network}
• DEX: ${signal.dex}
• Par: ${signal.tokenPair}
• Gas: $${signal.gasCostUsd.toFixed(2)}
• Capital mínimo: $${signal.minCapitalRequired}

⏰ *Expira em:* ${Math.floor(signal.expiresIn / 1000 / 60)} minutos

🔑 Use sua API Key para executar:
\`GET /v1/signals/${signal.id}\`

⚡ _Alerta GXEON SignalHub_
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  async loadSubscribers() {
    if (!this.supabase) return;
    
    const { data, error } = await this.supabase
      .from('telegram_subscribers')
      .select('*')
      .eq('alerts_enabled', true);
    
    if (error) {
      console.error('[📱 Telegram] Error loading subscribers:', error.message);
      return;
    }
    
    data.forEach(row => {
      this.subscribers.set(row.chat_id, {
        chatId: row.chat_id,
        username: row.username,
        email: row.email,
        tier: row.tier,
        apiKey: row.api_key,
        alertsEnabled: row.alerts_enabled,
        joinedAt: new Date(row.joined_at).getTime()
      });
    });
    
    this.stats.subscribers = this.subscribers.size;
    console.log(`[📱 TelegramDispatcher] ${this.subscribers.size} assinantes carregados`);
  }

  async saveSubscriber(subscriber) {
    if (!this.supabase) return;
    
    await this.supabase.from('telegram_subscribers').upsert({
      chat_id: subscriber.chatId,
      username: subscriber.username,
      email: subscriber.email,
      tier: subscriber.tier,
      api_key: subscriber.apiKey,
      alerts_enabled: subscriber.alertsEnabled,
      joined_at: new Date(subscriber.joinedAt).toISOString()
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  getStats() {
    return {
      ...this.stats,
      alertHistory: this.alertHistory.size,
      subscribers: this.subscribers.size
    };
  }

  async stop() {
    if (this.bot) {
      await this.bot.stop();
      console.log('[📱 TelegramDispatcher] Bot parado');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export { TelegramDispatcher, TELEGRAM_CONFIG };
export default TelegramDispatcher;
