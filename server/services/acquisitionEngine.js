#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACQUISITION ENGINE v1.0 - User Growth & Viral System
 * 
 * Components:
 * - Antenna Bots: Posta sinais FREE em grupos externos
 * - Referral System: Indique e ganhe acesso grátis
 * - Viral Hooks: CTAs em todos os sinais
 * - Free Signal Spread: Delay-based scarcity
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const ACQUISITION_CONFIG = {
  REFERRAL: {
    REWARD_DAYS: 7, // Dias grátis por indicação convertida
    MAX_REFERRALS_PER_USER: 10,
    CONVERSION_MIN_TIER: 'PRO' // Indicado precisa comprar PRO
  },
  
  ANTENNA: {
    MAX_MESSAGES_PER_HOUR: 5,
    SIGNAL_DELAY_MINUTES: 10,
    CTA_TEMPLATE: '⚡ Acesso TEMPO REAL → @gxeon_bot'
  },
  
  VIRAL: {
    SHARE_BONUS_SIGNALS: 3, // Sinais extras por compartilhamento
    INVITE_BONUS_DAYS: 3 // Dias extras por convite aceito
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
class ReferralSystem {
  constructor(acquisition) {
    this.acquisition = acquisition;
    this.supabase = acquisition.supabase;
  }
  
  /**
   * Gera link de referral para usuário
   */
  async generateReferralLink(userId) {
    try {
      // Generate unique code
      const referralCode = `gx_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      
      // Store mapping
      if (this.supabase) {
        await this.supabase
          .from('referral_tracking')
          .insert({
            referrer_user_id: userId,
            referred_user_id: null, // Will be filled when used
            status: 'pending',
            reward_type: 'free_days',
            reward_value: ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS,
            created_at: new Date().toISOString()
          });
      }
      
      return {
        success: true,
        referral_code: referralCode,
        link: `https://t.me/gxeon_bot?start=ref_${referralCode}`,
        reward: `${ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS} dias grátis PRO por indicação convertida`,
        message: `
🎁 *Indique e Ganhe*

Convide amigos e ganhe ${ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS} dias de PRO grátis para cada um que ativar!

🔗 Seu link exclusivo:
\`https://t.me/gxeon_bot?start=ref_${referralCode}\`

📤 Compartilhe em grupos de trading
        `
      };
      
    } catch (err) {
      console.error('[📢 Acquisition] Erro ao gerar referral:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Processa entrada de novo usuário via referral
   */
  async processReferralEntry(referredUserId, referralCode) {
    try {
      // Extract referrer from code
      // In production: lookup code in database
      
      // Create referral record
      if (this.supabase) {
        // Check if already referred
        const { data: existing } = await this.supabase
          .from('referral_tracking')
          .select('*')
          .eq('referred_user_id', referredUserId)
          .single();
        
        if (existing) {
          return { success: false, error: 'User already referred' };
        }
        
        // Create tracking record
        await this.supabase
          .from('referral_tracking')
          .insert({
            referrer_user_id: referralCode, // Simplified - should lookup actual user
            referred_user_id: referredUserId,
            status: 'pending',
            created_at: new Date().toISOString()
          });
      }
      
      return {
        success: true,
        message: 'Referral registrado! Assine PRO para liberar recompensa para quem te indicou.'
      };
      
    } catch (err) {
      console.error('[📢 Acquisition] Erro ao processar referral:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Processa conversão (quando indicado compra PRO)
   */
  async processConversion(referredUserId, tier, amount) {
    try {
      if (tier !== ACQUISITION_CONFIG.REFERRAL.CONVERSION_MIN_TIER) {
        return { success: false, reason: 'Tier does not qualify for referral' };
      }
      
      // Get referral record
      const { data: referral } = await this.supabase
        .from('referral_tracking')
        .select('*')
        .eq('referred_user_id', referredUserId)
        .eq('status', 'pending')
        .single();
      
      if (!referral) {
        return { success: false, error: 'No pending referral found' };
      }
      
      const now = new Date().toISOString();
      
      // Update referral
      await this.supabase
        .from('referral_tracking')
        .update({
          status: 'converted',
          converted_at: now,
          conversion_value: amount
        })
        .eq('id', referral.id);
      
      // Grant reward to referrer
      await this.grantReferralReward(referral.referrer_user_id);
      
      this.acquisition.emit('referral:converted', {
        referrer_id: referral.referrer_user_id,
        referred_id: referredUserId,
        reward_days: ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS
      });
      
      return {
        success: true,
        referrer_rewarded: true,
        reward_days: ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS
      };
      
    } catch (err) {
      console.error('[📢 Acquisition] Erro na conversão:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Concede recompensa ao referrer
   */
  async grantReferralReward(userId) {
    try {
      // Get current subscription
      const { data: sub } = await this.supabase
        .from('marketplace_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!sub) return;
      
      // Extend expiration
      const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS);
      
      await this.supabase
        .from('marketplace_subscriptions')
        .update({
          expires_at: newExpiry.toISOString(),
          next_payment_due: newExpiry.toISOString()
        })
        .eq('user_id', userId);
      
      // Notify user
      this.acquisition.emit('reward:granted', {
        user_id: userId,
        type: 'referral',
        days: ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS,
        new_expiry: newExpiry.toISOString()
      });
      
    } catch (err) {
      console.error('[📢 Acquisition] Erro ao conceder recompensa:', err);
    }
  }
  
  /**
   * Retorna estatísticas de referral
   */
  async getReferralStats(userId) {
    try {
      const { data: referrals } = await this.supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_user_id', userId);
      
      const total = referrals?.length || 0;
      const converted = referrals?.filter(r => r.status === 'converted').length || 0;
      const rewarded = referrals?.filter(r => r.status === 'rewarded').length || 0;
      const pending = referrals?.filter(r => r.status === 'pending').length || 0;
      
      return {
        total_referrals: total,
        converted,
        rewarded,
        pending,
        total_earned_days: rewarded * ACQUISITION_CONFIG.REFERRAL.REWARD_DAYS
      };
      
    } catch (err) {
      return { error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTENA BOT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
class AntennaBot {
  constructor(acquisition) {
    this.acquisition = acquisition;
    this.supabase = acquisition.supabase;
    this.activeCampaigns = new Map();
  }
  
  /**
   * Cria campanha de aquisição
   */
  async createCampaign(config) {
    try {
      const campaign = {
        name: config.name,
        target_groups: config.targetGroups,
        message_template: config.messageTemplate,
        signals_to_send: config.signalsToSend || 3,
        signal_delay_minutes: config.signalDelay || 10,
        cta_text: config.cta || ACQUISITION_CONFIG.ANTENNA.CTA_TEMPLATE,
        landing_url: config.landingUrl,
        is_active: false,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('antenna_campaigns')
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        campaign_id: data.id,
        config: campaign
      };
      
    } catch (err) {
      console.error('[📢 Antenna] Erro ao criar campanha:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Inicia campanha
   */
  async startCampaign(campaignId) {
    try {
      await this.supabase
        .from('antenna_campaigns')
        .update({
          is_active: true,
          started_at: new Date().toISOString()
        })
        .eq('id', campaignId);
      
      // Load campaign
      const { data: campaign } = await this.supabase
        .from('antenna_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      this.activeCampaigns.set(campaignId, campaign);
      
      // Start signal distribution
      this.distributeCampaignSignals(campaign);
      
      return { success: true, campaign_id: campaignId };
      
    } catch (err) {
      console.error('[📢 Antenna] Erro ao iniciar campanha:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Distribui sinais da campanha
   */
  async distributeCampaignSignals(campaign) {
    // Get recent FREE signals
    const { data: signals } = await this.supabase
      .from('unified_signals')
      .select('*')
      .eq('tier_access', 'FREE')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(campaign.signals_to_send);
    
    if (!signals || signals.length === 0) return;
    
    // Schedule messages
    for (let i = 0; i < signals.length; i++) {
      const delay = i * campaign.signal_delay_minutes * 60 * 1000;
      
      setTimeout(() => {
        this.postToGroups(campaign, signals[i]);
      }, delay);
    }
  }
  
  /**
   * Posta em grupos
   */
  async postToGroups(campaign, signal) {
    const message = this.formatCampaignMessage(campaign, signal);
    
    for (const group of campaign.target_groups) {
      try {
        // Log activity
        await this.supabase
          .from('antenna_activity_log')
          .insert({
            campaign_id: campaign.id,
            action: 'signal_shared',
            target_group: group,
            signal_id: signal.id,
            message_text: message,
            success: true,
            created_at: new Date().toISOString()
          });
        
        // Emit for external bot to actually send
        this.acquisition.emit('antenna:post', {
          campaign_id: campaign.id,
          group,
          message,
          signal_id: signal.signal_id
        });
        
        // Update stats
        await this.supabase
          .from('antenna_campaigns')
          .update({
            messages_sent: campaign.messages_sent + 1
          })
          .eq('id', campaign.id);
        
      } catch (err) {
        console.error('[📢 Antenna] Erro ao postar:', err);
        
        await this.supabase
          .from('antenna_activity_log')
          .insert({
            campaign_id: campaign.id,
            action: 'signal_shared',
            target_group: group,
            signal_id: signal.id,
            success: false,
            error_message: err.message
          });
      }
    }
  }
  
  /**
   * Formata mensagem da campanha
   */
  formatCampaignMessage(campaign, signal) {
    const emoji = signal.type === 'LONG' ? '🟢' : '🔴';
    
    return `
${emoji} *SINAL GRATUITO GXEON*

💰 *${signal.pair}* 
📈 ${signal.type} | Confiança: ${signal.confidence}%

Entry: $${signal.entry_price}
Target: $${signal.target_price}
Stop: $${signal.stop_price}

⏳ *Nota:* Este sinal foi enviado com ${campaign.signal_delay_minutes}min de atraso.
Para sinais em tempo real, sem delay:

${campaign.cta_text}

🆔 ID: \`${signal.signal_id}\`
    `.trim();
  }
  
  /**
   * Track click de campanha
   */
  async trackClick(campaignId, userId, group) {
    try {
      await this.supabase
        .from('antenna_activity_log')
        .insert({
          campaign_id: campaignId,
          action: 'user_clicked',
          target_group: group,
          user_id: userId,
          created_at: new Date().toISOString()
        });
      
      // Update campaign stats
      await this.supabase.rpc('increment_campaign_clicks', {
        p_campaign_id: campaignId
      });
      
    } catch (err) {
      // Silent
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VIRAL HOOKS
// ═══════════════════════════════════════════════════════════════════════════
class ViralHooks {
  constructor(acquisition) {
    this.acquisition = acquisition;
  }
  
  /**
   * Gera CTA contextual para sinal
   */
  generateCTA(signal, context = {}) {
    const ctas = {
      free_limit: `
⚠️ *Limite de sinais FREE atingido*

💎 Upgrade para PRO: apenas R$ 25/mês
✅ Sinais ilimitados em tempo real
✅ Acesso a sinais PREMIUM de alta confiança

👉 Clique /upgrade
      `,
      
      high_confidence: `
🔥 *Sinal de Alta Confiança Detectado!*

Confiança: ${signal.confidence}%
Potencial: +${signal.profit_potential}%

💎 Este sinal está disponível apenas para PRO
👉 /upgrade para receber agora
      `,
      
      share_bonus: `
🎁 *Ganhe Sinais Extras!*

Compartilhe este sinal em 3 grupos de trading
e ganhe ${ACQUISITION_CONFIG.VIRAL.SHARE_BONUS_SIGNALS} sinais PRO grátis!

📤 Botão Compartilhar →
      `,
      
      invite_friend: `
👥 *Indique um Amigo*

Convide um amigo para o GXEON PRO
e vocês dois ganham ${ACQUISITION_CONFIG.VIRAL.INVITE_BONUS_DAYS} dias extras!

🔗 Seu link: /referral
      `,
      
      upgrade_reminder: `
💎 *Ainda usando FREE?*

Você está perdendo:
• ${signal.ranking?.category === 'HOT' ? '🔥 Sinais HOT em tempo real' : ''}
• ⏱️ Sem delay de 10 minutos
• 📊 Acesso a análises completas

👉 /upgrade agora - R$ 25/mês
      `
    };
    
    return ctas[context.type] || ctas.upgrade_reminder;
  }
  
  /**
   * Gera mensagem viral para compartilhamento
   */
  generateShareMessage(signal) {
    const emoji = signal.type === 'LONG' ? '🟢' : '🔴';
    
    return `
${emoji} *SINAL ${signal.pair} - GXEON*

${signal.type} | Confiança: ${signal.confidence}%

Entrada: $${signal.entry_price}
Alvo: $${signal.target_price}

📲 Receba sinais em tempo real:
@GXEONSignalsBot
    `.trim();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE SIGNAL SPREAD
// ═══════════════════════════════════════════════════════════════════════════
class FreeSignalSpread {
  constructor(acquisition) {
    this.acquisition = acquisition;
  }
  
  /**
   * Seleciona sinais para distribuição FREE
   */
  async selectForFreeDistribution(limit = 5) {
    try {
      const { data: signals } = await this.supabase
        .from('unified_signals')
        .select('*')
        .eq('tier_access', 'FREE')
        .eq('status', 'active')
        .gt('confidence', 70) // Apenas confiança alta para FREE
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return signals || [];
      
    } catch (err) {
      console.error('[📢 Spread] Erro ao selecionar sinais:', err);
      return [];
    }
  }
  
  /**
   * Cria mensagem de espalhamento
   */
  createSpreadMessage(signal) {
    const emoji = signal.type === 'LONG' ? '🟢' : '🔴';
    
    return {
      text: `
${emoji} *GXEON FREE SIGNAL*

💰 ${signal.pair} | ${signal.type}
🎯 Confiança: ${signal.confidence}%

📊 Sinais em tempo real:
👉 @GXEONSignalsBot

⏰ Válido até: ${new Date(signal.valid_until).toLocaleTimeString('pt-BR')}
      `.trim(),
      
      buttons: [
        { text: '🚀 Acessar Bot', url: 'https://t.me/gxeon_bot' },
        { text: '📊 Sinais PRO', url: 'https://t.me/gxeon_bot?start=upgrade' }
      ]
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ACQUISITION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
class AcquisitionEngine extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.referral = new ReferralSystem(this);
    this.antenna = new AntennaBot(this);
    this.viral = new ViralHooks();
    this.spread = new FreeSignalSpread(this);
    
    this.init();
  }
  
  async init() {
    console.log('[📢 AcquisitionEngine] Inicializando...');
    
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    console.log('[📢 AcquisitionEngine] Pronto');
  }
  
  /**
   * Processa novo usuário
   */
  async processNewUser(userId, referralCode = null) {
    try {
      // Create FREE subscription
      await this.supabase
        .from('marketplace_subscriptions')
        .insert({
          user_id: userId,
          tier: 'FREE',
          daily_signals_limit: 5,
          is_active: true,
          created_at: new Date().toISOString()
        });
      
      // Process referral if present
      if (referralCode) {
        await this.referral.processReferralEntry(userId, referralCode);
      }
      
      // Send welcome message
      this.emit('user:welcome', {
        user_id: userId,
        message: `
🌑 *Bem-vindo ao GXEON Signal Marketplace!*

Você tem acesso FREE ativado:
✅ 5 sinais por dia
✅ Sinais com 10min de delay
✅ Acesso ao histórico

💎 *Upgrade PRO* (R$ 25/mês):
✅ Sinais ilimitados
✅ Tempo real
✅ Sinais PREMIUM

👉 Use /upgrade para ativar PRO
        `
      });
      
      return { success: true, tier: 'FREE' };
      
    } catch (err) {
      console.error('[📢 Acquisition] Erro ao processar usuário:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Estatísticas de aquisição
   */
  async getStats() {
    try {
      const { count: totalUsers } = await this.supabase
        .from('marketplace_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      const { count: freeUsers } = await this.supabase
        .from('marketplace_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'FREE');
      
      const { count: proUsers } = await this.supabase
        .from('marketplace_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'PRO');
      
      const { count: referrals } = await this.supabase
        .from('referral_tracking')
        .select('*', { count: 'exact', head: true });
      
      const { count: converted } = await this.supabase
        .from('referral_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'converted');
      
      return {
        total_users: totalUsers || 0,
        by_tier: {
          FREE: freeUsers || 0,
          PRO: proUsers || 0,
          ENTERPRISE: (totalUsers || 0) - (freeUsers || 0) - (proUsers || 0)
        },
        referrals: {
          total: referrals || 0,
          converted: converted || 0,
          conversion_rate: referrals > 0 ? ((converted / referrals) * 100).toFixed(2) : 0
        }
      };
      
    } catch (err) {
      return { error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const acquisitionEngine = new AcquisitionEngine();

export {
  AcquisitionEngine,
  ReferralSystem,
  AntennaBot,
  ViralHooks,
  FreeSignalSpread,
  acquisitionEngine,
  ACQUISITION_CONFIG
};
export default acquisitionEngine;
