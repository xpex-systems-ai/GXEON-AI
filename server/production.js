#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON PRODUCTION SERVER v4.0 - Premium Edition
 * 
 * Otimizado para Railway Deploy com:
 * - Zero WebSocket dependencies on startup
 * - Lazy loading de serviços pesados
 * - SignalHub API prioritizado
 * - Error handling premium para 429/rate limits
 * 
 * Comandante: Júnior Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ PRE-LOAD ERROR SHIELD - Must be first
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  const msg = err?.message || '';
  
  // Silent kill for network errors
  if (msg.includes('429') || msg.includes('WebSocket') || msg.includes('ECONNRESET') || 
      msg.includes('ETIMEDOUT') || msg.includes('socket hang up') || 
      msg.includes('Unexpected server response')) {
    console.log('[🛡️ SHIELD] Network error neutralized:', msg.substring(0, 50));
    return;
  }
  
  console.error('[🛡️ SHIELD] Exception:', msg.substring(0, 100));
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || '';
  if (msg.includes('429') || msg.includes('WebSocket')) {
    console.log('[🛡️ SHIELD] Rejection silenced');
    return;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 ENV & CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const PORT = process.env.PORT || 3000;
const TREASURY = '0x3955d559055DadB7067054cB6E6f974710345224';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
const serverState = {
  startTime: Date.now(),
  version: '4.0.0-premium',
  treasury: TREASURY,
  services: {
    signalHub: false,
    telegram: false,
    supabase: false,
    scanners: false
  },
  stats: {
    signalsGenerated: 0,
    apiCalls: 0,
    revenue: 0
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 SUPABASE CONNECTION (Lazy)
// ═══════════════════════════════════════════════════════════════════════════
let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  
  const url = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[⚠️] Supabase not configured');
    return null;
  }
  
  try {
    supabase = createClient(url, key);
    serverState.services.supabase = true;
    console.log('[✅] Supabase connected');
    return supabase;
  } catch (err) {
    console.error('[❌] Supabase error:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SIGNAL HUB - Core Revenue Engine
// ═══════════════════════════════════════════════════════════════════════════
class PremiumSignalHub {
  constructor() {
    this.signals = new Map();
    this.apiKeys = new Map();
    this.subscribers = new Map();
    this.pricePerSignal = 0.01;
    this.tiers = {
      BASIC: { daily: 10, monthly: 100 },
      PRO: { daily: 100, monthly: 1000 },
      ENTERPRISE: { daily: 1000, monthly: 10000 }
    };
    
    // Cleanup interval
    setInterval(() => this.cleanup(), 60000);
  }
  
  generateId() {
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  calculateRisk(signal) {
    let risk = 5;
    if (signal.estimatedProfitUsd > 100) risk -= 2;
    if (signal.estimatedProfitUsd > 50) risk -= 1;
    if (signal.gasCostUsd > signal.estimatedProfitUsd * 0.5) risk += 2;
    if (signal.confidence > 0.8) risk -= 1;
    return Math.max(1, Math.min(10, Math.round(risk)));
  }
  
  async registerSignal(data) {
    const signal = {
      id: this.generateId(),
      timestamp: Date.now(),
      expiresAt: Date.now() + 300000, // 5 min TTL
      source: data.source || 'unknown',
      network: data.network || 'arbitrum',
      type: data.type || 'arbitrage',
      tokenPair: `${data.tokenIn}/${data.tokenOut}`,
      dex: data.dex,
      poolAddress: data.poolAddress,
      estimatedProfitUsd: data.estimatedProfitUsd || 0,
      estimatedProfitPercent: data.estimatedProfitPercent || 0,
      riskScore: this.calculateRisk(data),
      confidence: data.confidence || 0.5,
      gasCostUsd: data.gasCostUsd || 0,
      minCapitalRequired: data.minCapitalRequired || 100,
      rawData: data.rawData || {},
      consumed: false,
      consumers: []
    };
    
    this.signals.set(signal.id, signal);
    serverState.stats.signalsGenerated++;
    
    // Persist to Supabase
    const db = getSupabase();
    if (db) {
      try {
        await db.from('signals').insert({
          signal_id: signal.id,
          source: signal.source,
          network: signal.network,
          type: signal.type,
          estimated_profit_usd: signal.estimatedProfitUsd,
          risk_score: signal.riskScore,
          confidence: signal.confidence,
          expires_at: new Date(signal.expiresAt).toISOString(),
          created_at: new Date().toISOString(),
          data: signal
        });
      } catch (e) {
        // Silent fail - memory cache still works
      }
    }
    
    console.log(`[📡] Signal registered: ${signal.id.substring(0, 20)}... Profit: $${signal.estimatedProfitUsd.toFixed(2)}`);
    return signal;
  }
  
  sanitizeSignal(signal) {
    return {
      id: signal.id,
      timestamp: signal.timestamp,
      network: signal.network,
      type: signal.type,
      tokenPair: signal.tokenPair,
      dex: signal.dex,
      estimatedProfitUsd: signal.estimatedProfitUsd,
      estimatedProfitPercent: signal.estimatedProfitPercent,
      riskScore: signal.riskScore,
      confidence: signal.confidence,
      gasCostUsd: signal.gasCostUsd,
      minCapitalRequired: signal.minCapitalRequired,
      expiresIn: signal.expiresAt - Date.now()
    };
  }
  
  getSignals(filters = {}) {
    let results = Array.from(this.signals.values())
      .filter(s => s.expiresAt > Date.now());
    
    if (filters.network) results = results.filter(s => s.network === filters.network);
    if (filters.minProfit) results = results.filter(s => s.estimatedProfitUsd >= filters.minProfit);
    if (filters.maxRisk) results = results.filter(s => s.riskScore <= filters.maxRisk);
    if (filters.minConfidence) results = results.filter(s => s.confidence >= filters.minConfidence);
    
    results.sort((a, b) => b.estimatedProfitUsd - a.estimatedProfitUsd);
    return results.slice(0, filters.limit || 50).map(s => this.sanitizeSignal(s));
  }
  
  async consumeSignal(apiKey, signalId) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) return { error: 'Invalid API key', code: 401 };
    
    const signal = this.signals.get(signalId);
    if (!signal || signal.expiresAt < Date.now()) {
      return { error: 'Signal not found or expired', code: 404 };
    }
    
    // Check limits
    const limits = this.tiers[keyData.tier];
    if (keyData.usage.daily >= limits.daily) {
      return { error: `Daily limit exceeded (${limits.daily})`, code: 429 };
    }
    
    // Update usage
    keyData.usage.daily++;
    keyData.usage.monthly++;
    keyData.usage.total++;
    
    if (!signal.consumers.includes(apiKey)) {
      signal.consumers.push(apiKey);
    }
    
    // Log billing
    const revenue = this.pricePerSignal;
    serverState.stats.revenue += revenue;
    
    const db = getSupabase();
    if (db) {
      try {
        await db.from('GX_Billing_Ledger').insert({
          execution_id: `signal_${signalId}`,
          timestamp: new Date().toISOString(),
          cost_usd: revenue,
          revenue_type: 'SIGNAL_CONSUMPTION',
          customer_email: keyData.email,
          tier: keyData.tier,
          signal_id: signalId,
          metadata: { apiKey: apiKey.substring(0, 10) + '...' }
        });
      } catch (e) {
        // Silent fail
      }
    }
    
    return {
      signal: this.sanitizeSignal(signal),
      charged: revenue,
      remainingQuota: {
        daily: limits.daily - keyData.usage.daily,
        monthly: limits.monthly - keyData.usage.monthly
      }
    };
  }
  
  createApiKey(email, tier = 'BASIC') {
    const apiKey = `gx_${Buffer.from(email + Date.now()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 32)}`;
    
    const keyData = {
      apiKey,
      email,
      tier: tier.toUpperCase(),
      createdAt: Date.now(),
      usage: { daily: 0, monthly: 0, total: 0 },
      active: true
    };
    
    this.apiKeys.set(apiKey, keyData);
    
    // Persist
    const db = getSupabase();
    if (db) {
      db.from('api_keys').insert({
        api_key: apiKey,
        email,
        tier: keyData.tier,
        usage: keyData.usage,
        active: true,
        created_at: new Date().toISOString()
      }).catch(() => {});
    }
    
    return { apiKey, tier: keyData.tier, limits: this.tiers[keyData.tier] };
  }
  
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [id, signal] of this.signals) {
      if (signal.expiresAt < now) {
        this.signals.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[🧹] Cleaned up ${removed} expired signals`);
    }
  }
  
  getStats() {
    return {
      activeSignals: this.signals.size,
      totalApiKeys: this.apiKeys.size,
      totalSignals: serverState.stats.signalsGenerated,
      totalRevenue: serverState.stats.revenue,
      pricePerSignal: this.pricePerSignal,
      tiers: this.tiers
    };
  }
}

const signalHub = new PremiumSignalHub();
serverState.services.signalHub = true;

// ═══════════════════════════════════════════════════════════════════════════
// � SIGNAL ORCHESTRATOR - DNA SUPREMO
// Geração automática + Dispatch Telegram + Monetização Hook
// ═══════════════════════════════════════════════════════════════════════════
let signalOrchestrator = null;

async function initSignalOrchestrator(telegramBotInstance) {
  try {
    const { GxeonSignalOrchestrator } = await import('./services/gxeonSignalEngine.js');
    signalOrchestrator = new GxeonSignalOrchestrator(telegramBotInstance, signalHub);
    
    // Iniciar geração automática (60 segundos para teste)
    signalOrchestrator.startAutoGeneration(60000);
    
    serverState.services.signalOrchestrator = true;
    console.log('[🧬 DNA SUPREMO] SignalOrchestrator ativo - Auto-generation: 60s');
    
    // Rodar validação E2E inicial
    await signalOrchestrator.runValidation();
    
    return signalOrchestrator;
  } catch (err) {
    console.error('[❌ DNA] Erro ao iniciar SignalOrchestrator:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// � TELEGRAM DISPATCHER - DNA CONVERSÃO ATIVO
// Bot: @gxeonai_bot | Hardcoded & Operational
// PIX: Integrado Mercado Pago
// ═══════════════════════════════════════════════════════════════════════════
let telegramBot = null;
const TELEGRAM_BOT_TOKEN = '8659197490:AAG-4X50tQahi0mnngfSeUyi49fpr1sDjBk';
const TELEGRAM_CHAT_ID = '8506789322';

// Importar sistema PIX (lazy load para evitar circular deps)
let pixSystem = null;
async function getPixSystem() {
  if (!pixSystem) {
    const { pixSystem: pix } = await import('./services/mercadoPagoIntegration.js');
    pixSystem = pix;
  }
  return pixSystem;
}

async function initTelegram() {
  try {
    const { Telegraf } = await import('telegraf');
    telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN);
    
    // 🧬 DNA CONVERSÃO: Start → Educação → Registro → Monetização
    telegramBot.command('start', (ctx) => {
      const welcomeMsg = `🌑 *GXEON Alpha - Smart Money Signals*

Detectamos oportunidades em tempo real na blockchain.

*🎯 O que você recebe:*
• Arbitragem DeFi detectada por IA
• Smart money movements
• MEV opportunities
• Keeper rewards

*💎 Planos:*
🆓 *BASIC* (Gratuito): 10 sinais/dia
⭐ *PRO* ($5/mês): Sinais ilimitados + tempo real
🚀 *ENTERPRISE* ($50/mês): 1000 sinais + prioridade

*🚀 Comece agora:*
Use /register seu@email.com PRO

📊 /status - Ver sistema
❓ /help - Ajuda completa`;
      
      ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
      
      // Log conversion event
      console.log(`[🧬 DNA] Novo usuário: ${ctx.from.username || ctx.from.id}`);
    });
    
    // 🧬 DNA CONVERSÃO: Registro → API Key → Acesso
    telegramBot.command('register', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const email = args[0];
      const tier = args[1] || 'BASIC';
      
      if (!email?.includes('@')) {
        return ctx.reply('❌ Email inválido\nUse: /register seu@email.com PRO');
      }
      
      const validTiers = ['BASIC', 'PRO', 'ENTERPRISE'];
      const upperTier = tier.toUpperCase();
      
      if (!validTiers.includes(upperTier)) {
        return ctx.reply('❌ Tier inválido. Use: BASIC, PRO ou ENTERPRISE');
      }
      
      // Criar API key instantaneamente
      const result = signalHub.createApiKey(email, upperTier);
      
      // Mensagem de conversão otimizada
      let monetizationMsg = '';
      if (upperTier === 'BASIC') {
        monetizationMsg = '\n\n💡 *Upgrade para PRO:* /upgrade PRO\nSinais ilimitados por apenas $5/mês';
      } else {
        monetizationMsg = '\n\n💰 *Pagamento:* PIX ou Crypto\nContate @juniorsena para ativação imediata';
      }
      
      ctx.reply(`✅ *Registro Confirmado!*

📧 Email: ${email}
🔑 API Key: \`${result.apiKey}\`
🏷️ Tier: ${result.tier}
📊 Limite: ${result.limits.daily} sinais/dia
💰 Preço: $${signalHub.pricePerSignal} por sinal

*🚀 Acesso imediato:*
https://api.gxeon.ai/v1/signals
Header: X-API-Key: ${result.apiKey.substring(0, 20)}...

*📱 Comandos úteis:*
/signals - Ver sinais disponíveis
/status - Status da conta
/api - Documentação completa${monetizationMsg}`, { parse_mode: 'Markdown' });
      
      // Notificar admin
      if (telegramBot) {
        telegramBot.telegram.sendMessage(TELEGRAM_CHAT_ID, 
          `🆕 *Novo Registro*\n\n${email}\nTier: ${upperTier}\nRevenue potential: $${upperTier === 'PRO' ? '5' : upperTier === 'ENTERPRISE' ? '50' : '0'}/mês`, 
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
      
      console.log(`[🧬 DNA] Registro: ${email} | Tier: ${upperTier} | Revenue: +$${upperTier === 'PRO' ? 5 : upperTier === 'ENTERPRISE' ? 50 : 0}`);
    });
    
    // 🧬 DNA: Upgrade path com PIX automático
    telegramBot.command('upgrade', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const targetTier = args[0]?.toUpperCase();
      const email = args[1]; // Opcional: email para associar pagamento
      
      if (!targetTier || !['PRO', 'ENTERPRISE'].includes(targetTier)) {
        return ctx.reply('💎 *Upgrade disponível:*\n\n⭐ PRO - R$25 (~$5/mês)\n✅ Sinais ilimitados + tempo real\n✅ API Key dedicada\n✅ Suporte prioritário\n\n🚀 ENTERPRISE - R$250 (~$50/mês)\n✅ 1000 sinais/dia\n✅ Prioridade máxima\n✅ Webhooks B2B\n✅ Dashboard privado\n\nUse: /upgrade PRO seu@email.com', { parse_mode: 'Markdown' });
      }
      
      // Gerar PIX automaticamente
      try {
        const pix = await getPixSystem();
        const userEmail = email || `${ctx.from.id}@gxeon.telegram`;
        
        const payment = pix.gerarPagamento(userEmail, targetTier);
        
        if (payment.error) {
          return ctx.reply(`❌ Erro: ${payment.error}`);
        }
        
        // Mensagem com PIX Copia e Cola
        const pixMessage = `🎯 *UPGRADE ${targetTier}*

📧 Email: ${payment.email}
💰 Valor: R$${payment.valor_brl.toFixed(2)}
🔑 TXID: \`${payment.txid}\`

*📋 PIX COPIA E COLA:*
\`\`\`
${payment.pix_copia_cola}
\`\`\`

*💳 Chave PIX direta:*
\`${pix.pixSystem?.PIX_CONFIG?.chaves?.aleatoria || '6a7601d8-c20d-4057-99de-b84c8e55aa30'}\`

*✅ Como pagar:*
1️⃣ Copie o código acima
2️⃣ Abra seu banco/app
3️⃣ Cole no PIX Copia e Cola
4️⃣ Confirme o valor

*🚀 Após pagamento:*
Sua API será ativada em até 2 minutos.

⏳ *Expira em:* 24 horas

❓ Dúvidas? @juniorsena`;
        
        ctx.reply(pixMessage, { parse_mode: 'Markdown' });
        
        // Notificar admin
        telegramBot.telegram.sendMessage(TELEGRAM_CHAT_ID, 
          `🆕 *UPGRADE PENDENTE*\n\n${targetTier}\n${payment.email}\nR$${payment.valor_brl}\nTXID: ${payment.txid}`, 
          { parse_mode: 'Markdown' }
        ).catch(() => {});
        
        console.log(`[🧬 DNA PIX] Upgrade gerado: ${payment.txid} | ${targetTier} | ${payment.email}`);
        
      } catch (err) {
        console.error('[❌ PIX] Erro ao gerar:', err);
        ctx.reply('❌ Erro ao gerar PIX. Tente novamente ou contate @juniorsena');
      }
    });
    
    // 🧬 DNA: Confirmar pagamento (admin only)
    telegramBot.command('confirmar', async (ctx) => {
      // Verificar se é admin (simplificado)
      const isAdmin = ctx.from.username === 'juniorsena' || ctx.chat.id.toString() === TELEGRAM_CHAT_ID;
      
      if (!isAdmin) {
        return ctx.reply('⛔ Apenas administradores podem confirmar pagamentos.');
      }
      
      const args = ctx.message.text.split(' ').slice(1);
      const txid = args[0];
      
      if (!txid) {
        return ctx.reply('Use: /confirmar <TXID>');
      }
      
      try {
        const pix = await getPixSystem();
        const result = pix.confirmarPagamento(txid, 'Confirmado via Telegram');
        
        if (result.error) {
          return ctx.reply(`❌ ${result.error}`);
        }
        
        ctx.reply(`✅ *Pagamento Confirmado!*\n\nTXID: ${result.txid}\nEmail: ${result.email}\nTier: ${result.tier}\nValor: R$${result.valor_brl}\n\nAPI Key ativada!`);
        
      } catch (err) {
        ctx.reply('❌ Erro ao confirmar.');
      }
    });
    
    // 🧬 DNA: Verificar pagamento
    telegramBot.command('verificar', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const txid = args[0];
      
      if (!txid) {
        return ctx.reply('Use: /verificar <TXID>');
      }
      
      try {
        const pix = await getPixSystem();
        const status = pix.verificarPagamento(txid);
        
        if (status.status === 'NOT_FOUND') {
          return ctx.reply('❌ Pagamento não encontrado.');
        }
        
        const emoji = status.status === 'COMPLETED' ? '✅' : '⏳';
        ctx.reply(`${emoji} *Status do Pagamento*\n\nTXID: ${txid}\nStatus: ${status.status}\nTier: ${status.data.tier}\nValor: R$${status.data.valor_brl}`);
        
      } catch (err) {
        ctx.reply('❌ Erro ao verificar.');
      }
    });
    
    // 🧬 DNA: Estatísticas de PIX (admin)
    telegramBot.command('pixstats', async (ctx) => {
      const isAdmin = ctx.from.username === 'juniorsena' || ctx.chat.id.toString() === TELEGRAM_CHAT_ID;
      
      if (!isAdmin) {
        return ctx.reply('⛔ Comando restrito.');
      }
      
      try {
        const pix = await getPixSystem();
        const stats = pix.getStats();
        const pendentes = pix.listarPendentes();
        
        let msg = `💰 *Estatísticas PIX*\n\n`;
        msg += `✅ Recebido: R$${stats.total_recebido_brl.toFixed(2)}\n`;
        msg += `⏳ Pendente: R$${stats.receita_potencial_brl.toFixed(2)}\n`;
        msg += `📊 Completados: ${stats.completados}\n`;
        msg += `🕐 Pendentes: ${stats.pendentes}\n\n`;
        
        if (pendentes.length > 0) {
          msg += `*Pagamentos Pendentes:*\n`;
          pendentes.slice(0, 5).forEach(p => {
            msg += `• ${p.txid.substring(0, 15)}... ${p.tier} R$${p.valor_brl}\n`;
          });
        }
        
        ctx.reply(msg, { parse_mode: 'Markdown' });
        
      } catch (err) {
        ctx.reply('❌ Erro ao carregar estatísticas.');
      }
    });
    
    // 🧬 Sinais - DNA Supremo (usando SignalOrchestrator)
    telegramBot.command('signals', (ctx) => {
      try {
        // Usar signalOrchestrator se disponível, senão fallback para signalHub
        if (signalOrchestrator) {
          const formatted = signalOrchestrator.formatSignalListForTelegram({ 
            limit: 5, 
            tier: 'BASIC' // Default, usuário real teria tier da API
          });
          return ctx.reply(formatted, { parse_mode: 'Markdown' });
        }
        
        // Fallback para signalHub legacy
        const signals = signalHub.getSignals({ limit: 5 });
        
        if (signals.length === 0) {
          return ctx.reply('📡 *Nenhum sinal ativo no momento*\n\n_Geração automática em andamento..._', { parse_mode: 'Markdown' });
        }
        
        let msg = '📡 *Sinais Ativos*\n\n';
        signals.forEach((sig, i) => {
          msg += `${i+1}. 💰 $${sig.estimatedProfitUsd?.toFixed(2) || '0.00'} | ${sig.tokenPair || 'N/A'}\n`;
          msg += `   Risk: ${sig.riskScore || 0}/10 | Conf: ${((sig.confidence || 0)*100).toFixed(0)}%\n\n`;
        });
        
        msg += '\n⚡ *Acesso TEMPO REAL* → /upgrade PRO\n💎 Sinais ilimitados • Sem delay • Prioridade máxima';
        
        ctx.reply(msg, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Error in signals command:', err);
        ctx.reply('❌ Erro ao buscar sinais. Tente novamente.');
      }
    });

    // Help completo
    telegramBot.command('help', (ctx) => {
      ctx.reply(`📚 *GXEON Alpha - Guia Completo*

*Como funciona:*
Nossa IA monitora a blockchain 24/7 detectando oportunidades de lucro.

*Planos:*
🆓 BASIC: Grátis, 10 sinais/dia, delay 10min
⭐ PRO: $5/mês, ilimitado, tempo real
🚀 ENTERPRISE: $50/mês, 1000/dia, prioridade

*Comandos:*
/start - Início
/register <email> <tier> - Criar conta
/signals - Ver sinais
/status - Estatísticas
/upgrade <tier> - Upgrade
/help - Este menu

*Suporte:* @juniorsena`, { parse_mode: 'Markdown' });
    });
    
    // API docs
    telegramBot.command('api', (ctx) => {
      ctx.reply(`🔌 *API Documentation*

*Endpoint:*
GET https://api.gxeon.ai/v1/signals

*Headers:*
X-API-Key: sua-api-key-aqui

*Query params:*
?network=arbitrum
?min_profit=10
?max_risk=5

*Resposta:*
{\n  "signals": [...],\n  "count": 10,\n  "quota": {...}\n}

*Full docs:* Em breve em docs.gxeon.ai`, { parse_mode: 'Markdown' });
    });
    
    await telegramBot.launch();
    serverState.services.telegram = true;
    console.log('[✅] Telegram bot ACTIVE - DNA Conversão operacional');
    console.log('   Bot: @gxeonai_bot');
    console.log('   Chat: ' + TELEGRAM_CHAT_ID);
    
    // 🧬 Iniciar SignalOrchestrator para geração automática
    await initSignalOrchestrator(telegramBot);
    
    // Notificar canal de ativação
    telegramBot.telegram.sendMessage(TELEGRAM_CHAT_ID, 
      '🌑 *GXEON Signals - Online*\n\nBot operacional.\nUse /start para começar.\n\n_Comandante Júnior Sena_', 
      { parse_mode: 'Markdown' }
    ).catch(() => {});
    
    return true;
    
  } catch (err) {
    console.warn('[⚠️] Telegram init failed:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 EXPRESS APP
// ═══════════════════════════════════════════════════════════════════════════
const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  serverState.stats.apiCalls++;
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏥 HEALTH CHECKS (Priority for Railway)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: serverState.version }));

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 A2A MONETIZATION API (Agent-to-Agent Revenue)
// ═══════════════════════════════════════════════════════════════════════════
// Import A2A routes dynamically
let a2aRoutes = null;
try {
  const { default: a2aRouter } = await import('./routes/a2aMonetization.js');
  app.use('/', a2aRouter);
  console.log('[✅] A2A Monetization API mounted: /v1/register-agent, /v1/agent/*');
} catch (err) {
  console.log('[⚠️] A2A routes not available:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// � FALLBACK REGISTRATION ENDPOINT (Guaranteed to work)
// ═══════════════════════════════════════════════════════════════════════════
app.post('/v1/register', async (req, res) => {
  try {
    const { email, name, tier = 'BASIC' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const crypto = await import('crypto');
    const actorCode = 'GX' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const apiKey = 'gx_' + crypto.randomBytes(24).toString('hex');
    const price = tier === 'BASIC' ? 29.90 : tier === 'PRO' ? 99.90 : 299.90;
    
    // Generate simulated PIX
    const txId = `REG-${Date.now()}-${actorCode}`;
    const qrData = `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${price.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO`;
    
    res.json({
      success: true,
      actor: {
        code: actorCode,
        email: email,
        name: name || 'Agent',
        tier: tier,
        status: 'pending_payment'
      },
      payment: {
        transaction_id: txId,
        amount: price,
        currency: 'BRL',
        method: 'PIX',
        pix_qr_code: Buffer.from(qrData).toString('base64'),
        pix_copy_paste: qrData,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      credentials: {
        api_key: apiKey,
        note: 'API key will be activated after payment'
      }
    });
    
    console.log(`[✅] Agent registered: ${actorCode} (${email}) - ${tier}`);
  } catch (err) {
    console.error('[❌] Registration error:', err.message);
    res.status(500).json({ error: 'REGISTRATION_FAILED', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// �📡 SIGNAL API v1 (Core Revenue Endpoints)
// ═══════════════════════════════════════════════════════════════════════════

// Get signals (requires API key)
app.get('/v1/signals', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required', header: 'X-API-Key' });
  }
  
  if (!signalHub.apiKeys.has(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  const filters = {
    network: req.query.network,
    minProfit: req.query.min_profit ? parseFloat(req.query.min_profit) : undefined,
    maxRisk: req.query.max_risk ? parseInt(req.query.max_risk) : undefined,
    minConfidence: req.query.min_confidence ? parseFloat(req.query.min_confidence) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit) : 10
  };
  
  const signals = signalHub.getSignals(filters);
  const keyData = signalHub.apiKeys.get(apiKey);
  const limits = signalHub.tiers[keyData.tier];
  
  res.json({
    success: true,
    signals,
    count: signals.length,
    quota: {
      tier: keyData.tier,
      used: keyData.usage,
      remaining: {
        daily: limits.daily - keyData.usage.daily,
        monthly: limits.monthly - keyData.usage.monthly
      }
    },
    price_per_signal: signalHub.pricePerSignal
  });
});

// Consume specific signal
app.get('/v1/signals/:id', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const result = await signalHub.consumeSignal(apiKey, req.params.id);
  
  if (result.error) {
    return res.status(result.code || 500).json({ error: result.error });
  }
  
  res.json({
    success: true,
    signal: result.signal,
    charged: result.charged,
    remaining_quota: result.remainingQuota
  });
});

// Stats (public)
app.get('/v1/signals/stats', (req, res) => {
  const stats = signalHub.getStats();
  res.json({
    success: true,
    stats: {
      active_signals: stats.activeSignals,
      total_api_keys: stats.totalApiKeys,
      total_signals_generated: stats.totalSignals,
      total_revenue_usd: stats.totalRevenue.toFixed(2),
      price_per_signal_usd: stats.pricePerSignal,
      tiers: stats.tiers
    },
    server: {
      version: serverState.version,
      uptime_ms: Date.now() - serverState.startTime,
      services: serverState.services
    }
  });
});

// Pricing (public)
app.get('/v1/signals/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      per_signal_usd: signalHub.pricePerSignal,
      tiers: signalHub.tiers,
      features_by_tier: {
        BASIC: ['Real-time signals', 'Basic filtering'],
        PRO: ['Real-time signals', 'Advanced filtering', 'Telegram alerts'],
        ENTERPRISE: ['Unlimited signals', 'Custom filters', 'Webhook delivery', 'Priority support']
      }
    }
  });
});

// Register new user
app.post('/v1/register', async (req, res) => {
  const { email, tier = 'BASIC', referral_code } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  
  // Check if email exists
  for (const [key, data] of signalHub.apiKeys) {
    if (data.email === email) {
      return res.status(409).json({ 
        error: 'Email already registered',
        api_key: key.substring(0, 20) + '...'
      });
    }
  }
  
  const result = signalHub.createApiKey(email, tier);
  
  res.status(201).json({
    success: true,
    api_key: result.apiKey,
    tier: result.tier,
    limits: result.limits,
    price_per_signal: signalHub.pricePerSignal,
    documentation: 'https://docs.gxeon.ai/signals',
    quick_start: {
      list_signals: 'GET /v1/signals',
      auth_header: `X-API-Key: ${result.apiKey.substring(0, 15)}...`
    }
  });
});

// Internal: Inject signal (for scanners)
app.post('/v1/signals/inject', async (req, res) => {
  const internalKey = req.headers['x-internal-key'];
  
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const signal = await signalHub.registerSignal(req.body);
    
    // Notify Telegram subscribers (PRO/Enterprise)
    if (telegramBot && signal.confidence >= 0.7) {
      const msg = `🚨 *SIGNAL*\n\n💰 Profit: $${signal.estimatedProfitUsd.toFixed(2)}\n🎯 Risk: ${signal.riskScore}/10\n🔗 ${signal.network} | ${signal.dex}`;
      
      // Send to all PRO/Enterprise subscribers (simplified)
      for (const [chatId, sub] of signalHub.subscribers) {
        if (sub.tier !== 'BASIC') {
          telegramBot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(() => {});
        }
      }
    }
    
    res.status(201).json({
      success: true,
      signal_id: signal.id,
      estimated_delivery: signalHub.apiKeys.size
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 PREMIUM FEATURES
// ═══════════════════════════════════════════════════════════════════════════

// Revenue dashboard
app.get('/v1/admin/revenue', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  // Simple admin check - in production, use proper auth
  if (!apiKey || !apiKey.startsWith('gx_admin_')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const stats = signalHub.getStats();
  
  res.json({
    revenue: {
      total: stats.totalRevenue,
      today: serverState.stats.revenue,
      signals_sold: stats.totalSignals
    },
    users: {
      total: stats.totalApiKeys,
      by_tier: {}
    },
    treasury: TREASURY
  });
});

// System status
app.get('/v1/status', (req, res) => {
  res.json({
    status: 'operational',
    version: serverState.version,
    timestamp: new Date().toISOString(),
    treasury: TREASURY,
    uptime_ms: Date.now() - serverState.startTime,
    services: serverState.services,
    stats: {
      signals: signalHub.getStats(),
      api_calls: serverState.stats.apiCalls
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ❌ ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error(`[❌ ERROR ${req.id}]:`, err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', path: req.path });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🏥 HEALTHCHECK ENDPOINT (Required for Railway)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '4.0.0-premium'
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     🌑 GXEON PRODUCTION SERVER v4.0 - PREMIUM                   ║');
  console.log('║                                                                  ║');
  console.log(`║     Port: ${PORT.toString().padEnd(54)}║`);
  console.log(`║     Treasury: ${TREASURY.substring(0, 20)}...${' '.repeat(24)}║`);
  console.log('║                                                                  ║');
  console.log('║     Endpoints:                                                   ║');
  console.log('║       • GET  /health                                             ║');
  console.log('║       • GET  /v1/signals/stats                                  ║');
  console.log('║       • GET  /v1/signals/pricing                                ║');
  console.log('║       • POST /v1/register                                        ║');
  console.log('║       • GET  /v1/signals (Auth: X-API-Key)                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 BACKGROUND INITIALIZATION (Lazy Load)
// ═══════════════════════════════════════════════════════════════════════════
setTimeout(async () => {
  // Connect Supabase
  getSupabase();
  
  // Initialize Telegram (optional)
  await initTelegram();
  
  console.log('[✅] Background services initialized');
}, 100);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[🛑] SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (telegramBot) telegramBot.stop();
    process.exit(0);
  });
});

export { app, signalHub, serverState };
