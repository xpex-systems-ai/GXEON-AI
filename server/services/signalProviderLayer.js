#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIGNAL PROVIDER LAYER v1.0 - Multi-Provider Integration System
 * 
 * Suporta: interno + externos via webhook/API
 * Features: Schema normalizador, Provider scoring automático
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL SCHEMA STANDARD (JSON Schema para validação)
// ═══════════════════════════════════════════════════════════════════════════
export const SIGNAL_SCHEMA = {
  type: 'object',
  required: ['pair', 'type', 'entry', 'target', 'stop', 'confidence', 'provider'],
  properties: {
    pair: { type: 'string', pattern: '^[A-Z0-9]+/[A-Z0-9]+$' }, // BTC/USDT
    type: { type: 'string', enum: ['LONG', 'SHORT'] },
    entry: { type: 'number', minimum: 0 },
    target: { type: 'number', minimum: 0 },
    stop: { type: 'number', minimum: 0 },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    provider: { type: 'string' }, // provider_id ou nome
    
    // Opcionais
    timestamp: { type: 'integer' }, // unix timestamp
    valid_until: { type: 'integer' }, // unix timestamp
    strategy: { type: 'string', enum: ['arbitrage', 'scalp', 'trend', 'breakout', 'momentum'] },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    timeframe: { type: 'string', enum: ['5m', '15m', '1h', '4h', '1d'] },
    
    // Metadata extra
    exchange: { type: 'string' },
    notes: { type: 'string' },
    raw: { type: 'object' } // dados originais do provider
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER CONNECTOR INTERFACE
// ═══════════════════════════════════════════════════════════════════════════
class ProviderConnector extends EventEmitter {
  constructor(providerConfig) {
    super();
    this.id = providerConfig.id;
    this.name = providerConfig.name;
    this.type = providerConfig.provider_type; // internal, external, verified
    this.webhookUrl = providerConfig.webhook_url;
    this.apiKey = providerConfig.api_key;
    this.revenueShare = providerConfig.revenue_share_percent || 30;
    this.isActive = providerConfig.is_active;
    
    // Scoring
    this.score = providerConfig.provider_score || 50;
    this.winRate = providerConfig.win_rate || 0;
    this.totalSignals = providerConfig.total_signals || 0;
    
    // Stats
    this.todaySignals = 0;
    this.todayWins = 0;
  }
  
  /**
   * Valida sinal recebido contra schema padrão
   */
  validateSignal(rawSignal) {
    const errors = [];
    
    // Check required fields
    const required = ['pair', 'type', 'entry', 'target', 'stop', 'confidence'];
    for (const field of required) {
      if (rawSignal[field] === undefined || rawSignal[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate types
    if (rawSignal.type && !['LONG', 'SHORT'].includes(rawSignal.type)) {
      errors.push(`Invalid type: ${rawSignal.type}. Must be LONG or SHORT`);
    }
    
    if (rawSignal.confidence !== undefined) {
      const conf = parseInt(rawSignal.confidence);
      if (isNaN(conf) || conf < 0 || conf > 100) {
        errors.push(`Invalid confidence: ${rawSignal.confidence}. Must be 0-100`);
      }
    }
    
    // Validate price logic
    if (rawSignal.entry && rawSignal.target && rawSignal.stop) {
      const entry = parseFloat(rawSignal.entry);
      const target = parseFloat(rawSignal.target);
      const stop = parseFloat(rawSignal.stop);
      
      if (rawSignal.type === 'LONG') {
        if (target <= entry) errors.push('Target must be > entry for LONG');
        if (stop >= entry) errors.push('Stop must be < entry for LONG');
      } else {
        if (target >= entry) errors.push('Target must be < entry for SHORT');
        if (stop <= entry) errors.push('Stop must be > entry for SHORT');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Normaliza sinal para schema padrão GXEON
   */
  normalizeSignal(rawSignal) {
    const validation = this.validateSignal(rawSignal);
    if (!validation.valid) {
      throw new Error(`Invalid signal: ${validation.errors.join(', ')}`);
    }
    
    const entry = parseFloat(rawSignal.entry);
    const target = parseFloat(rawSignal.target);
    const stop = parseFloat(rawSignal.stop);
    
    // Calculate derived fields
    const profitPotential = rawSignal.type === 'LONG'
      ? ((target - entry) / entry * 100)
      : ((entry - target) / entry * 100);
    
    const riskAmount = Math.abs(entry - stop);
    const rewardAmount = Math.abs(target - entry);
    const riskReward = riskAmount > 0 ? rewardAmount / riskAmount : 0;
    
    // Determine risk level if not provided
    let riskLevel = rawSignal.risk_level;
    if (!riskLevel) {
      if (riskReward >= 3) riskLevel = 'low';
      else if (riskReward >= 1.5) riskLevel = 'medium';
      else riskLevel = 'high';
    }
    
    // Determine strategy if not provided
    const strategy = rawSignal.strategy || 'trend';
    
    // Determine tier access based on confidence + provider score
    let tierAccess = 'FREE';
    if (rawSignal.confidence >= 85 && this.score >= 70) {
      tierAccess = 'PRO';
    }
    if (rawSignal.confidence >= 95 && this.score >= 85) {
      tierAccess = 'ENTERPRISE';
    }
    
    // Generate tags
    const tags = [];
    if (rawSignal.confidence >= 90) tags.push('PREMIUM');
    if (this.score >= 80) tags.push('TOP-PROVIDER');
    if (riskLevel === 'high') tags.push('HIGH-RISK');
    if (profitPotential > 10) tags.push('HIGH-REWARD');
    
    // Validity (default 30 min if not specified)
    const now = Date.now();
    const validUntil = rawSignal.valid_until 
      ? new Date(rawSignal.valid_until * 1000)
      : new Date(now + 30 * 60 * 1000);
    
    return {
      signal_id: `GX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      provider_id: this.id,
      provider_name: this.name,
      
      // Core data
      pair: rawSignal.pair.toUpperCase(),
      type: rawSignal.type,
      entry_price: entry,
      target_price: target,
      stop_price: stop,
      
      // Metadata
      confidence: parseInt(rawSignal.confidence),
      strategy: strategy,
      risk_level: riskLevel,
      timeframe: rawSignal.timeframe || '15m',
      
      // Calculated
      profit_potential: parseFloat(profitPotential.toFixed(4)),
      risk_reward_ratio: parseFloat(riskReward.toFixed(2)),
      
      // Validity
      valid_from: new Date(now).toISOString(),
      valid_until: validUntil.toISOString(),
      
      // Tier/Tags
      tags: tags,
      tier_access: tierAccess,
      
      // Status
      status: 'active',
      result: 'pending',
      
      // Raw data preservation
      raw_data: {
        original: rawSignal,
        received_at: now,
        normalized_by: 'signalProviderLayer v1.0',
        provider_type: this.type
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTERNAL WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════
class WebhookHandler {
  constructor(providerLayer) {
    this.providerLayer = providerLayer;
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'gxeon-webhook-secret';
  }
  
  /**
   * Valida assinatura do webhook (HMAC)
   */
  validateSignature(payload, signature, providerApiKey) {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret + providerApiKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  
  /**
   * Processa webhook recebido
   */
  async processWebhook(providerId, payload, signature) {
    try {
      // Get provider
      const provider = this.providerLayer.getProvider(providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      // Validate signature
      if (!this.validateSignature(payload, signature, provider.apiKey)) {
        console.warn(`[🔌 Webhook] Invalid signature from ${provider.name}`);
        return { success: false, error: 'Invalid signature' };
      }
      
      // Validate provider active
      if (!provider.isActive) {
        return { success: false, error: 'Provider inactive' };
      }
      
      // Process signal(s)
      const signals = Array.isArray(payload.signals) ? payload.signals : [payload];
      const results = [];
      
      for (const rawSignal of signals) {
        try {
          // Enrich with provider info
          rawSignal.provider = provider.name;
          
          // Normalize
          const normalized = provider.normalizeSignal(rawSignal);
          
          // Emit to provider layer
          this.providerLayer.emit('signal:received', {
            provider: provider,
            signal: normalized,
            source: 'webhook'
          });
          
          results.push({
            signal_id: normalized.signal_id,
            status: 'accepted'
          });
          
        } catch (err) {
          results.push({
            signal_id: null,
            status: 'rejected',
            error: err.message
          });
        }
      }
      
      return {
        success: true,
        processed: results.length,
        accepted: results.filter(r => r.status === 'accepted').length,
        results
      };
      
    } catch (err) {
      console.error('[🔌 Webhook] Error:', err);
      return { success: false, error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROVIDER LAYER CLASS
// ═══════════════════════════════════════════════════════════════════════════
class SignalProviderLayer extends EventEmitter {
  constructor() {
    super();
    this.providers = new Map(); // id -> ProviderConnector
    this.webhookHandler = new WebhookHandler(this);
    this.stats = {
      totalReceived: 0,
      totalAccepted: 0,
      totalRejected: 0,
      byProvider: new Map()
    };
    
    this.init();
  }
  
  async init() {
    console.log('[🔌 SignalProviderLayer] Inicializando...');
    
    // Init Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      await this.loadProviders();
    } else {
      console.warn('[🔌 SignalProviderLayer] Supabase não configurado');
    }
    
    console.log(`[🔌 SignalProviderLayer] ${this.providers.size} providers carregados`);
  }
  
  /**
   * Carrega providers do banco
   */
  async loadProviders() {
    if (!this.supabase) return;
    
    const { data, error } = await this.supabase
      .from('signal_providers')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('[🔌 ProviderLayer] Erro ao carregar providers:', error);
      return;
    }
    
    for (const providerData of data || []) {
      const connector = new ProviderConnector(providerData);
      this.providers.set(providerData.id, connector);
      this.stats.byProvider.set(providerData.id, {
        received: 0,
        accepted: 0,
        rejected: 0
      });
    }
  }
  
  /**
   * Adiciona novo provider
   */
  async registerProvider(config) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase não configurado');
      }
      
      // Generate API key
      const apiKey = `gx_provider_${crypto.randomBytes(16).toString('hex')}`;
      
      const providerData = {
        name: config.name,
        provider_type: config.type || 'external',
        webhook_url: config.webhookUrl,
        api_key: apiKey,
        contact_email: config.email,
        revenue_share_percent: config.revenueShare || 30,
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('signal_providers')
        .insert(providerData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to memory
      const connector = new ProviderConnector(data);
      this.providers.set(data.id, connector);
      
      console.log(`[🔌 ProviderLayer] Provider registrado: ${config.name}`);
      
      return {
        success: true,
        provider_id: data.id,
        api_key: apiKey,
        message: 'Provider registered successfully'
      };
      
    } catch (err) {
      console.error('[🔌 ProviderLayer] Erro ao registrar:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Recebe sinal de provider interno
   */
  async receiveInternalSignal(rawSignal, strategy = 'arbitrage') {
    const internalProvider = this.getInternalProvider();
    if (!internalProvider) {
      throw new Error('Internal provider not found');
    }
    
    // Enrich signal
    rawSignal.provider = 'GXEON Internal';
    rawSignal.strategy = strategy;
    
    return this.processSignal(internalProvider, rawSignal, 'internal');
  }
  
  /**
   * Processa sinal normalizado
   */
  async processSignal(provider, normalizedSignal, source) {
    try {
      this.stats.totalReceived++;
      
      if (!this.supabase) {
        // Memory-only mode
        this.emit('signal:normalized', normalizedSignal);
        return { success: true, signal: normalizedSignal };
      }
      
      // Save to database
      const { data, error } = await this.supabase
        .from('unified_signals')
        .insert(normalizedSignal)
        .select()
        .single();
      
      if (error) throw error;
      
      this.stats.totalAccepted++;
      
      // Update provider stats
      const providerStats = this.stats.byProvider.get(provider.id);
      if (providerStats) {
        providerStats.received++;
        providerStats.accepted++;
      }
      
      // Emit for marketplace
      this.emit('signal:normalized', {
        ...normalizedSignal,
        id: data.id,
        db_record: data
      });
      
      console.log(`[🔌 ProviderLayer] Sinal aceito: ${normalizedSignal.signal_id} de ${provider.name}`);
      
      return {
        success: true,
        signal_id: data.signal_id,
        id: data.id,
        tier_access: normalizedSignal.tier_access
      };
      
    } catch (err) {
      this.stats.totalRejected++;
      
      const providerStats = this.stats.byProvider.get(provider.id);
      if (providerStats) {
        providerStats.rejected++;
      }
      
      console.error(`[🔌 ProviderLayer] Erro ao processar sinal:`, err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Retorna provider interno
   */
  getInternalProvider() {
    for (const [id, provider] of this.providers) {
      if (provider.type === 'internal') {
        return provider;
      }
    }
    return null;
  }
  
  /**
   * Retorna provider por ID
   */
  getProvider(id) {
    return this.providers.get(id);
  }
  
  /**
   * Lista todos providers
   */
  listProviders(options = {}) {
    let providers = Array.from(this.providers.values());
    
    if (options.type) {
      providers = providers.filter(p => p.type === options.type);
    }
    
    if (options.verified) {
      providers = providers.filter(p => p.isVerified);
    }
    
    if (options.sortBy === 'score') {
      providers.sort((a, b) => b.score - a.score);
    }
    
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      score: p.score,
      win_rate: p.winRate,
      total_signals: p.totalSignals,
      revenue_share: p.revenueShare,
      is_verified: p.isVerified,
      is_active: p.isActive
    }));
  }
  
  /**
   * Calcula/atualiza score de provider
   */
  async calculateProviderScore(providerId) {
    if (!this.supabase) return null;
    
    try {
      // Call database function
      const { data, error } = await this.supabase.rpc('calculate_provider_score', {
        provider_uuid: providerId
      });
      
      if (error) throw error;
      
      // Update local cache
      const provider = this.providers.get(providerId);
      if (provider) {
        provider.score = data;
      }
      
      return data;
      
    } catch (err) {
      console.error('[🔌 ProviderLayer] Erro ao calcular score:', err);
      return null;
    }
  }
  
  /**
   * Handler para webhooks HTTP
   */
  async handleWebhookRequest(providerId, payload, signature) {
    return this.webhookHandler.processWebhook(providerId, payload, signature);
  }
  
  /**
   * Estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      providers: this.providers.size,
      by_provider: Object.fromEntries(this.stats.byProvider)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const providerLayer = new SignalProviderLayer();

export { SignalProviderLayer, ProviderConnector, providerLayer };
export default providerLayer;
