#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIGNAL MARKETPLACE ENGINE v1.0 - Core Ranking & Dispatch System
 * 
 * Features:
 * - Ranking algorithm (confidence 30%, provider 25%, timing 20%, profit 15%, risk 10%)
 * - Real-time dispatcher com delay para FREE tier
 * - Tier filtering (FREE/PRO/ENTERPRISE)
 * - Multi-channel distribution (Telegram, API, Webhook)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const MARKETPLACE_CONFIG = {
  // Ranking weights
  RANKING_WEIGHTS: {
    confidence: 0.30,
    provider: 0.25,
    timing: 0.20,
    profit: 0.15,
    risk: 0.10
  },
  
  // Tier limits
  TIER_LIMITS: {
    FREE: {
      max_signals_per_day: 5,
      delay_seconds: 600, // 10 min delay
      min_confidence: 0,
      max_risk_level: 'medium',
      can_access: ['FREE']
    },
    PRO: {
      max_signals_per_day: 100,
      delay_seconds: 0, // Real-time
      min_confidence: 0,
      max_risk_level: 'high',
      can_access: ['FREE', 'PRO']
    },
    ENTERPRISE: {
      max_signals_per_day: 1000,
      delay_seconds: 0, // Real-time + priority
      min_confidence: 0,
      max_risk_level: 'high',
      can_access: ['FREE', 'PRO', 'ENTERPRISE'],
      priority: true
    }
  },
  
  // Categories
  CATEGORY_THRESHOLDS: {
    HOT: 80,
    TRENDING: 65,
    STANDARD: 40,
    RISKY: 0
  },
  
  // Dispatch
  DISPATCH_BATCH_SIZE: 50,
  DISPATCH_INTERVAL_MS: 1000, // Check queue every second
  
  // Treasury
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// ═══════════════════════════════════════════════════════════════════════════
// RANKING ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════
class RankingEngine {
  constructor(config = MARKETPLACE_CONFIG) {
    this.weights = config.RANKING_WEIGHTS;
  }
  
  /**
   * Calcula score completo de um sinal
   */
  calculateScore(signal, providerScore = 50) {
    const now = Date.now();
    const createdAt = new Date(signal.created_at || signal.valid_from).getTime();
    
    // Component scores (0-100)
    const confidenceScore = signal.confidence || 50;
    const providerScoreNorm = Math.min(providerScore, 100);
    
    // Timing score: decai com o tempo (100 -> 0 em 6 horas)
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    const timingScore = Math.max(0, 100 - (hoursSinceCreation * 16.67));
    
    // Profit score: até 20% = 100 pontos
    const profitScore = Math.min((signal.profit_potential || 0) * 5, 100);
    
    // Risk score: inverso do risco
    const riskMap = { low: 80, medium: 50, high: 20 };
    const riskScore = riskMap[signal.risk_level] || 50;
    
    // Weighted total
    const totalScore = 
      (confidenceScore * this.weights.confidence) +
      (providerScoreNorm * this.weights.provider) +
      (timingScore * this.weights.timing) +
      (profitScore * this.weights.profit) +
      (riskScore * this.weights.risk);
    
    // Determine category
    let category = 'RISKY';
    if (totalScore >= MARKETPLACE_CONFIG.CATEGORY_THRESHOLDS.HOT) category = 'HOT';
    else if (totalScore >= MARKETPLACE_CONFIG.CATEGORY_THRESHOLDS.TRENDING) category = 'TRENDING';
    else if (totalScore >= MARKETPLACE_CONFIG.CATEGORY_THRESHOLDS.STANDARD) category = 'STANDARD';
    
    return {
      total: Math.round(totalScore * 100) / 100,
      components: {
        confidence: Math.round(confidenceScore * 100) / 100,
        provider: Math.round(providerScoreNorm * 100) / 100,
        timing: Math.round(timingScore * 100) / 100,
        profit: Math.round(profitScore * 100) / 100,
        risk: Math.round(riskScore * 100) / 100
      },
      category,
      calculated_at: new Date().toISOString()
    };
  }
  
  /**
   * Rankea lista de sinais
   */
  rankSignals(signals, providerScores = {}) {
    const ranked = signals.map(signal => {
      const providerScore = providerScores[signal.provider_id] || 50;
      const ranking = this.calculateScore(signal, providerScore);
      
      return {
        ...signal,
        ranking,
        sort_score: ranking.total
      };
    });
    
    // Sort by total score descending
    ranked.sort((a, b) => b.sort_score - a.sort_score);
    
    // Assign positions
    ranked.forEach((signal, index) => {
      signal.rank_position = index + 1;
    });
    
    return ranked;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════
class RealTimeDispatcher extends EventEmitter {
  constructor(marketplace) {
    super();
    this.marketplace = marketplace;
    this.dispatchQueue = []; // Signals waiting for dispatch (for delay)
    this.activeDispatches = new Map(); // signal_id -> timeout
    
    // Stats
    this.stats = {
      totalDispatched: 0,
      byChannel: new Map(),
      byTier: new Map()
    };
    
    // Start dispatch loop
    this.startDispatchLoop();
  }
  
  startDispatchLoop() {
    setInterval(() => {
      this.processQueue();
    }, MARKETPLACE_CONFIG.DISPATCH_INTERVAL_MS);
    
    console.log('[📡 Dispatcher] Loop iniciado');
  }
  
  /**
   * Adiciona sinal à fila de dispatch
   */
  async dispatchSignal(signal, options = {}) {
    const { 
      channels = ['telegram'], 
      forceTier = null,
      priority = false 
    } = options;
    
    // Get subscribers for each tier
    const tiersToDispatch = forceTier ? [forceTier] : ['FREE', 'PRO', 'ENTERPRISE'];
    
    for (const tier of tiersToDispatch) {
      const tierConfig = MARKETPLACE_CONFIG.TIER_LIMITS[tier];
      
      // Check if signal tier is accessible
      if (!tierConfig.can_access.includes(signal.tier_access)) {
        continue;
      }
      
      // Check risk level
      const riskLevels = { low: 1, medium: 2, high: 3 };
      const signalRisk = riskLevels[signal.risk_level] || 2;
      const maxRisk = riskLevels[tierConfig.max_risk_level] || 3;
      
      if (signalRisk > maxRisk) {
        continue;
      }
      
      // Calculate delay
      const delayMs = tierConfig.delay_seconds * 1000;
      
      const dispatchItem = {
        signal,
        tier,
        channels,
        scheduledAt: Date.now() + delayMs,
        priority: priority || tier === 'ENTERPRISE',
        status: 'queued'
      };
      
      if (delayMs === 0 || priority) {
        // Immediate dispatch
        await this.executeDispatch(dispatchItem);
      } else {
        // Add to queue for delayed dispatch
        this.dispatchQueue.push(dispatchItem);
        
        // Sort by scheduled time
        this.dispatchQueue.sort((a, b) => a.scheduledAt - b.scheduledAt);
      }
    }
    
    return {
      queued: true,
      signal_id: signal.signal_id
    };
  }
  
  /**
   * Processa fila de dispatch
   */
  async processQueue() {
    const now = Date.now();
    const toDispatch = [];
    
    // Find items ready to dispatch
    this.dispatchQueue = this.dispatchQueue.filter(item => {
      if (item.scheduledAt <= now) {
        toDispatch.push(item);
        return false; // Remove from queue
      }
      return true; // Keep in queue
    });
    
    // Execute dispatches
    for (const item of toDispatch) {
      await this.executeDispatch(item);
    }
  }
  
  /**
   * Executa dispatch para um sinal
   */
  async executeDispatch(dispatchItem) {
    const { signal, tier, channels } = dispatchItem;
    
    try {
      dispatchItem.status = 'dispatching';
      
      // Get subscribers for this tier
      const subscribers = await this.getSubscribers(tier);
      
      const dispatchResults = [];
      
      for (const channel of channels) {
        const result = await this.sendToChannel(channel, signal, subscribers, tier);
        dispatchResults.push(result);
        
        // Update stats
        this.stats.totalDispatched++;
        this.stats.byChannel.set(channel, (this.stats.byChannel.get(channel) || 0) + 1);
        this.stats.byTier.set(tier, (this.stats.byTier.get(tier) || 0) + 1);
      }
      
      dispatchItem.status = 'completed';
      
      // Log dispatch
      await this.logDispatch(signal, tier, channels, dispatchResults);
      
      // Emit event
      this.emit('signal:dispatched', {
        signal_id: signal.signal_id,
        tier,
        channels,
        recipients: subscribers.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('[📡 Dispatcher] Erro no dispatch:', err);
      dispatchItem.status = 'failed';
    }
  }
  
  /**
   * Envia para canal específico
   */
  async sendToChannel(channel, signal, subscribers, tier) {
    switch (channel) {
      case 'telegram':
        return await this.sendTelegram(signal, subscribers, tier);
      case 'api':
        return await this.sendAPI(signal, subscribers, tier);
      case 'webhook':
        return await this.sendWebhook(signal, subscribers, tier);
      default:
        return { success: false, error: 'Unknown channel' };
    }
  }
  
  /**
   * Envia via Telegram
   */
  async sendTelegram(signal, subscribers, tier) {
    // This will be integrated with existing telegramDispatcher
    // For now, return mock
    return {
      channel: 'telegram',
      sent: subscribers.length,
      tier
    };
  }
  
  /**
   * Envia via API REST
   */
  async sendAPI(signal, subscribers, tier) {
    // B2B API delivery
    return {
      channel: 'api',
      sent: subscribers.filter(s => s.api_key).length,
      tier
    };
  }
  
  /**
   * Envia via Webhook
   */
  async sendWebhook(signal, subscribers, tier) {
    // Webhook delivery for integrations
    return {
      channel: 'webhook',
      sent: subscribers.filter(s => s.webhook_url).length,
      tier
    };
  }
  
  /**
   * Retorna subscribers para um tier
   */
  async getSubscribers(tier) {
    if (!this.marketplace.supabase) return [];
    
    try {
      const { data, error } = await this.marketplace.supabase
        .from('marketplace_subscriptions')
        .select('*')
        .eq('tier', tier)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return data || [];
      
    } catch (err) {
      console.error('[📡 Dispatcher] Erro ao buscar subscribers:', err);
      return [];
    }
  }
  
  /**
   * Log de dispatch no banco
   */
  async logDispatch(signal, tier, channels, results) {
    if (!this.marketplace.supabase) return;
    
    try {
      await this.marketplace.supabase
        .from('signal_dispatch_log')
        .insert({
          signal_id: signal.id,
          channel: channels.join(','),
          tier_delivered: tier,
          dispatched_at: new Date().toISOString(),
          status: 'delivered',
          metadata: {
            results,
            signal_tier: signal.tier_access,
            category: signal.ranking?.category
          }
        });
    } catch (err) {
      console.error('[📡 Dispatcher] Erro ao logar dispatch:', err);
    }
  }
  
  /**
   * Estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.dispatchQueue.length,
      byChannel: Object.fromEntries(this.stats.byChannel),
      byTier: Object.fromEntries(this.stats.byTier)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER FILTER
// ═══════════════════════════════════════════════════════════════════════════
class TierFilter {
  constructor(config = MARKETPLACE_CONFIG) {
    this.limits = config.TIER_LIMITS;
  }
  
  /**
   * Filtra sinais por tier do usuário
   */
  filterForTier(signals, userTier, userUsage = {}) {
    const tierConfig = this.limits[userTier];
    if (!tierConfig) return [];
    
    // Filter accessible tiers
    let filtered = signals.filter(s => 
      tierConfig.can_access.includes(s.tier_access)
    );
    
    // Filter by risk level
    const riskLevels = { low: 1, medium: 2, high: 3 };
    const maxRisk = riskLevels[tierConfig.max_risk_level] || 3;
    
    filtered = filtered.filter(s => {
      const signalRisk = riskLevels[s.risk_level] || 2;
      return signalRisk <= maxRisk;
    });
    
    // Apply daily limits
    const usedToday = userUsage.daily_signals_used || 0;
    const limit = tierConfig.max_signals_per_day;
    const remaining = Math.max(0, limit - usedToday);
    
    // Sort by ranking score and take remaining
    filtered.sort((a, b) => (b.ranking?.total || 0) - (a.ranking?.total || 0));
    
    const limited = filtered.slice(0, remaining);
    
    return {
      signals: limited,
      total_available: filtered.length,
      delivered: limited.length,
      limit,
      remaining: remaining - limited.length,
      has_more: filtered.length > limited.length,
      upgrade_prompt: userTier === 'FREE' && filtered.length > limited.length
        ? `💎 ${filtered.length - limited.length} sinais exclusivos PRO disponíveis`
        : null
    };
  }
  
  /**
   * Verifica se usuário pode receber mais sinais hoje
   */
  canReceiveMore(userTier, userUsage = {}) {
    const tierConfig = this.limits[userTier];
    if (!tierConfig) return false;
    
    const used = userUsage.daily_signals_used || 0;
    return used < tierConfig.max_signals_per_day;
  }
  
  /**
   * Retorna delay para tier
   */
  getDelaySeconds(userTier) {
    const tierConfig = this.limits[userTier];
    return tierConfig?.delay_seconds || 600;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MARKETPLACE ENGINE
// ═══════════════════════════════════════════════════════════════════════════
class SignalMarketplaceEngine extends EventEmitter {
  constructor() {
    super();
    this.ranking = new RankingEngine();
    this.dispatcher = new RealTimeDispatcher(this);
    this.tierFilter = new TierFilter();
    this.supabase = null;
    
    // Cache
    this.activeSignals = new Map();
    this.providerScores = new Map();
    
    this.init();
  }
  
  async init() {
    console.log('[🏪 MarketplaceEngine] Inicializando...');
    
    // Init Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      await this.loadActiveSignals();
      await this.loadProviderScores();
    }
    
    console.log('[🏪 MarketplaceEngine] Pronto');
  }
  
  /**
   * Recebe sinal do Provider Layer
   */
  async receiveSignal(signal) {
    try {
      // Calculate ranking
      const providerScore = this.providerScores.get(signal.provider_id) || 50;
      const ranking = this.ranking.calculateScore(signal, providerScore);
      
      // Enrich signal
      const enrichedSignal = {
        ...signal,
        ranking,
        received_at: new Date().toISOString()
      };
      
      // Cache
      this.activeSignals.set(signal.signal_id, enrichedSignal);
      
      // Persist ranking to database
      if (this.supabase) {
        await this.saveRanking(enrichedSignal);
      }
      
      // Dispatch to appropriate tiers
      const dispatchResult = await this.dispatcher.dispatchSignal(enrichedSignal, {
        channels: ['telegram', 'api'],
        priority: enrichedSignal.tier_access === 'ENTERPRISE'
      });
      
      // Emit
      this.emit('signal:listed', {
        signal_id: signal.signal_id,
        tier: signal.tier_access,
        category: ranking.category,
        score: ranking.total,
        dispatch: dispatchResult
      });
      
      console.log(`[🏪 Marketplace] Sinal listado: ${signal.signal_id} | Score: ${ranking.total} | Cat: ${ranking.category}`);
      
      return {
        success: true,
        signal_id: signal.signal_id,
        ranking,
        tier_access: signal.tier_access
      };
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao receber sinal:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Retorna sinais disponíveis para usuário
   */
  async getSignalsForUser(userId, userTier, options = {}) {
    try {
      // Get user's usage
      const userUsage = await this.getUserUsage(userId);
      
      // Filter active signals
      const activeSignals = Array.from(this.activeSignals.values())
        .filter(s => s.status === 'active' && new Date(s.valid_until) > new Date());
      
      // Apply tier filter
      const filtered = this.tierFilter.filterForTier(
        activeSignals, 
        userTier, 
        userUsage
      );
      
      // Apply additional filters
      let signals = filtered.signals;
      
      if (options.category) {
        signals = signals.filter(s => s.ranking?.category === options.category);
      }
      
      if (options.strategy) {
        signals = signals.filter(s => s.strategy === options.strategy);
      }
      
      if (options.minConfidence) {
        signals = signals.filter(s => s.confidence >= options.minConfidence);
      }
      
      if (options.pair) {
        signals = signals.filter(s => s.pair === options.pair.toUpperCase());
      }
      
      // Sort
      if (options.sort === 'confidence') {
        signals.sort((a, b) => b.confidence - a.confidence);
      } else if (options.sort === 'profit') {
        signals.sort((a, b) => b.profit_potential - a.profit_potential);
      } else {
        // Default: ranking score
        signals.sort((a, b) => (b.ranking?.total || 0) - (a.ranking?.total || 0));
      }
      
      // Limit
      const limit = Math.min(options.limit || 10, 50);
      const limited = signals.slice(0, limit);
      
      return {
        signals: limited,
        meta: {
          total_available: filtered.total_available,
          delivered: limited.length,
          tier: userTier,
          daily_limit: filtered.limit,
          remaining_today: filtered.remaining,
          has_more: filtered.has_more,
          upgrade_prompt: filtered.upgrade_prompt,
          hot_signals: signals.filter(s => s.ranking?.category === 'HOT').length
        }
      };
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao buscar sinais:', err);
      return { error: err.message };
    }
  }
  
  /**
   * Retorna top sinais (para leaderboard)
   */
  async getTopSignals(period = 'daily', category = 'all', limit = 10) {
    try {
      if (!this.supabase) {
        // Memory-only fallback
        const signals = Array.from(this.activeSignals.values())
          .filter(s => s.status === 'active')
          .sort((a, b) => (b.ranking?.total || 0) - (a.ranking?.total || 0))
          .slice(0, limit);
        
        return { signals };
      }
      
      // Query from leaderboard table
      const { data, error } = await this.supabase
        .from('signal_leaderboard')
        .select('*')
        .eq('period', period)
        .eq('entity_type', 'signal')
        .order('rank_position', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return {
        signals: data || [],
        period,
        calculated_at: data?.[0]?.calculated_at
      };
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao buscar top sinais:', err);
      return { error: err.message };
    }
  }
  
  /**
   * Retorna top providers
   */
  async getTopProviders(limit = 10) {
    try {
      if (!this.supabase) {
        // Memory-only fallback
        const providers = Array.from(this.providerScores.entries())
          .map(([id, score]) => ({ id, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        
        return { providers };
      }
      
      const { data, error } = await this.supabase
        .from('signal_providers')
        .select('id, name, provider_score, win_rate, total_signals, avg_roi')
        .eq('is_active', true)
        .order('provider_score', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return { providers: data || [] };
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao buscar top providers:', err);
      return { error: err.message };
    }
  }
  
  /**
   * Load active signals from database
   */
  async loadActiveSignals() {
    try {
      const { data, error } = await this.supabase
        .from('unified_signals')
        .select('*')
        .eq('status', 'active')
        .gt('valid_until', new Date().toISOString());
      
      if (error) throw error;
      
      for (const signal of data || []) {
        this.activeSignals.set(signal.signal_id, signal);
      }
      
      console.log(`[🏪 Marketplace] ${this.activeSignals.size} sinais ativos carregados`);
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao carregar sinais:', err);
    }
  }
  
  /**
   * Load provider scores
   */
  async loadProviderScores() {
    try {
      const { data, error } = await this.supabase
        .from('signal_providers')
        .select('id, provider_score');
      
      if (error) throw error;
      
      for (const provider of data || []) {
        this.providerScores.set(provider.id, provider.provider_score);
      }
      
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao carregar scores:', err);
    }
  }
  
  /**
   * Get user usage
   */
  async getUserUsage(userId) {
    try {
      const { data, error } = await this.supabase
        .from('marketplace_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) return { daily_signals_used: 0 };
      
      return {
        daily_signals_used: data.daily_signals_used || 0,
        daily_signals_limit: data.daily_signals_limit || 5,
        tier: data.tier
      };
      
    } catch (err) {
      return { daily_signals_used: 0 };
    }
  }
  
  /**
   * Save ranking to database
   */
  async saveRanking(signal) {
    try {
      await this.supabase
        .from('signal_rankings')
        .upsert({
          signal_id: signal.id,
          confidence_score: signal.ranking.components.confidence,
          provider_score: signal.ranking.components.provider,
          timing_score: signal.ranking.components.timing,
          profit_score: signal.ranking.components.profit,
          risk_score: signal.ranking.components.risk,
          total_score: signal.ranking.total,
          category: signal.ranking.category,
          calculated_at: signal.ranking.calculated_at,
          expires_at: signal.valid_until
        });
    } catch (err) {
      console.error('[🏪 Marketplace] Erro ao salvar ranking:', err);
    }
  }
  
  /**
   * Cleanup expired signals
   */
  async cleanupExpired() {
    const now = new Date();
    let removed = 0;
    
    for (const [id, signal] of this.activeSignals) {
      if (new Date(signal.valid_until) < now) {
        this.activeSignals.delete(id);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[🏪 Marketplace] ${removed} sinais expirados removidos`);
    }
    
    return removed;
  }
  
  /**
   * Estatísticas do marketplace
   */
  getStats() {
    return {
      active_signals: this.activeSignals.size,
      providers: this.providerScores.size,
      ranking: this.ranking,
      dispatcher: this.dispatcher.getStats()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const marketplaceEngine = new SignalMarketplaceEngine();

export { 
  SignalMarketplaceEngine, 
  RankingEngine, 
  RealTimeDispatcher, 
  TierFilter,
  marketplaceEngine,
  MARKETPLACE_CONFIG 
};
export default marketplaceEngine;
