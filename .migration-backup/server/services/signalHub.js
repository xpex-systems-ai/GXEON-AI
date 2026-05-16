#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIGNAL HUB v1.0 - Zero Capital Revenue Mode
 * 
 * Central hub para distribuição de sinais de arbitragem
 * Autorizado por: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const SIGNAL_HUB_CONFIG = {
  PRICE_PER_SIGNAL_USD: 0.01,
  TIER_LIMITS: {
    BASIC: { daily: 10, monthly: 100 },
    PRO: { daily: 100, monthly: 1000 },
    ENTERPRISE: { daily: 1000, monthly: 10000 }
  },
  SIGNAL_TTL_MS: 300000, // 5 minutos
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL HUB CLASS
// ═══════════════════════════════════════════════════════════════════════════
class SignalHub extends EventEmitter {
  constructor() {
    super();
    this.signals = new Map(); // signalId -> signal
    this.apiKeys = new Map(); // apiKey -> { tier, usage, limits }
    this.consumptionLog = []; // Array of consumption events
    this.revenueTracker = {
      totalSignals: 0,
      totalRevenue: 0,
      today: { signals: 0, revenue: 0 },
      thisMonth: { signals: 0, revenue: 0 }
    };
    
    this.init();
  }

  async init() {
    console.log('[🔔 SignalHub] Inicializando hub de sinais...');
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[🔔 SignalHub] Supabase conectado');
      
      // Load existing API keys
      await this.loadApiKeys();
    } else {
      console.warn('[🔔 SignalHub] Supabase não configurado - modo standalone');
    }
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSignals(), 60000);
    
    console.log('[🔔 SignalHub] Pronto para receber sinais');
    console.log(`[🔔 SignalHub] Preço por sinal: $${SIGNAL_HUB_CONFIG.PRICE_PER_SIGNAL_USD}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL REGISTRATION (from scanners)
  // ═══════════════════════════════════════════════════════════════════════════
  
  async registerSignal(signalData) {
    const signal = {
      id: this.generateSignalId(),
      timestamp: Date.now(),
      expiresAt: Date.now() + SIGNAL_HUB_CONFIG.SIGNAL_TTL_MS,
      source: signalData.source || 'unknown',
      network: signalData.network || 'unknown',
      type: signalData.type || 'arbitrage',
      
      // Core data
      tokenIn: signalData.tokenIn,
      tokenOut: signalData.tokenOut,
      dex: signalData.dex,
      poolAddress: signalData.poolAddress,
      
      // Profit estimate
      estimatedProfitUsd: signalData.estimatedProfitUsd || 0,
      estimatedProfitPercent: signalData.estimatedProfitPercent || 0,
      
      // Risk assessment
      riskScore: this.calculateRiskScore(signalData),
      confidence: signalData.confidence || 0.5,
      
      // Execution data
      gasCostUsd: signalData.gasCostUsd || 0,
      minCapitalRequired: signalData.minCapitalRequired || 100,
      executionPath: signalData.executionPath || [],
      
      // Metadata
      rawData: signalData.rawData || {},
      consumed: false,
      consumers: []
    };
    
    // Store signal
    this.signals.set(signal.id, signal);
    
    // Emit new signal event
    this.emit('newSignal', signal);
    
    // Persist to database
    if (this.supabase) {
      await this.supabase.from('signals').insert({
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
    }
    
    console.log(`[🔔 SignalHub] Novo sinal registrado: ${signal.id}`);
    console.log(`              Profit: $${signal.estimatedProfitUsd.toFixed(2)} | Risk: ${signal.riskScore}/10 | Source: ${signal.source}`);
    
    return signal;
  }

  generateSignalId() {
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateRiskScore(signalData) {
    // Risk 1-10 (lower is better)
    let risk = 5;
    
    // Higher profit = lower risk (counter-intuitive but true for arbitrage)
    if (signalData.estimatedProfitUsd > 100) risk -= 2;
    if (signalData.estimatedProfitUsd > 50) risk -= 1;
    if (signalData.estimatedProfitUsd < 5) risk += 2;
    
    // Gas cost impact
    if (signalData.gasCostUsd > signalData.estimatedProfitUsd * 0.5) risk += 2;
    
    // Confidence
    if (signalData.confidence > 0.8) risk -= 1;
    if (signalData.confidence < 0.3) risk += 2;
    
    return Math.max(1, Math.min(10, Math.round(risk)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL CONSUMPTION (API delivery)
  // ═══════════════════════════════════════════════════════════════════════════
  
  async consumeSignal(apiKey, signalId) {
    // Validate API key
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { error: 'Invalid API key', code: 401 };
    }
    
    // Check if signal exists and is valid
    const signal = this.signals.get(signalId);
    if (!signal) {
      return { error: 'Signal not found or expired', code: 404 };
    }
    
    if (signal.expiresAt < Date.now()) {
      return { error: 'Signal expired', code: 410 };
    }
    
    // Check rate limits
    const limitCheck = this.checkRateLimit(apiKey, keyData);
    if (!limitCheck.allowed) {
      return { error: limitCheck.reason, code: 429 };
    }
    
    // Update usage
    keyData.usage.daily++;
    keyData.usage.monthly++;
    keyData.usage.total++;
    
    // Mark signal as consumed by this user
    if (!signal.consumers.includes(apiKey)) {
      signal.consumers.push(apiKey);
    }
    
    // Calculate revenue
    const revenue = SIGNAL_HUB_CONFIG.PRICE_PER_SIGNAL_USD;
    
    // Log consumption
    await this.logConsumption(apiKey, signalId, revenue, keyData);
    
    // Update revenue tracker
    this.revenueTracker.totalSignals++;
    this.revenueTracker.totalRevenue += revenue;
    this.revenueTracker.today.signals++;
    this.revenueTracker.today.revenue += revenue;
    this.revenueTracker.thisMonth.signals++;
    this.revenueTracker.thisMonth.revenue += revenue;
    
    console.log(`[🔔 SignalHub] Sinal consumido: ${signalId} por ${keyData.email} ($${revenue})`);
    
    // Return signal data (sanitized)
    return {
      signal: this.sanitizeSignal(signal),
      remainingQuota: {
        daily: SIGNAL_HUB_CONFIG.TIER_LIMITS[keyData.tier].daily - keyData.usage.daily,
        monthly: SIGNAL_HUB_CONFIG.TIER_LIMITS[keyData.tier].monthly - keyData.usage.monthly
      }
    };
  }

  async getSignalsForApiKey(apiKey, filters = {}) {
    // Validate API key
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { error: 'Invalid API key', code: 401 };
    }
    
    // Check rate limits
    const limitCheck = this.checkRateLimit(apiKey, keyData);
    if (!limitCheck.allowed) {
      return { error: limitCheck.reason, code: 429 };
    }
    
    // Filter signals
    let availableSignals = Array.from(this.signals.values())
      .filter(s => s.expiresAt > Date.now())
      .filter(s => !s.consumers.includes(apiKey)); // Don't show already consumed
    
    // Apply filters
    if (filters.network) {
      availableSignals = availableSignals.filter(s => s.network === filters.network);
    }
    if (filters.minProfit) {
      availableSignals = availableSignals.filter(s => s.estimatedProfitUsd >= filters.minProfit);
    }
    if (filters.maxRisk) {
      availableSignals = availableSignals.filter(s => s.riskScore <= filters.maxRisk);
    }
    if (filters.minConfidence) {
      availableSignals = availableSignals.filter(s => s.confidence >= filters.minConfidence);
    }
    
    // Sort by profit potential (descending)
    availableSignals.sort((a, b) => b.estimatedProfitUsd - a.estimatedProfitUsd);
    
    // Limit results
    const limit = Math.min(filters.limit || 10, 50);
    const signals = availableSignals.slice(0, limit);
    
    // Log bulk fetch
    if (signals.length > 0) {
      await this.logBulkConsumption(apiKey, signals.length, keyData);
    }
    
    return {
      signals: signals.map(s => this.sanitizeSignal(s)),
      count: signals.length,
      quota: {
        tier: keyData.tier,
        used: { daily: keyData.usage.daily, monthly: keyData.usage.monthly },
        remaining: {
          daily: SIGNAL_HUB_CONFIG.TIER_LIMITS[keyData.tier].daily - keyData.usage.daily,
          monthly: SIGNAL_HUB_CONFIG.TIER_LIMITS[keyData.tier].monthly - keyData.usage.monthly
        }
      }
    };
  }

  checkRateLimit(apiKey, keyData) {
    const tier = keyData.tier;
    const limits = SIGNAL_HUB_CONFIG.TIER_LIMITS[tier];
    
    if (keyData.usage.daily >= limits.daily) {
      return { allowed: false, reason: `Daily limit exceeded (${limits.daily})` };
    }
    
    if (keyData.usage.monthly >= limits.monthly) {
      return { allowed: false, reason: `Monthly limit exceeded (${limits.monthly})` };
    }
    
    return { allowed: true };
  }

  sanitizeSignal(signal) {
    // Return only necessary fields for API
    return {
      id: signal.id,
      timestamp: signal.timestamp,
      network: signal.network,
      type: signal.type,
      estimatedProfitUsd: signal.estimatedProfitUsd,
      estimatedProfitPercent: signal.estimatedProfitPercent,
      riskScore: signal.riskScore,
      confidence: signal.confidence,
      gasCostUsd: signal.gasCostUsd,
      minCapitalRequired: signal.minCapitalRequired,
      tokenPair: `${signal.tokenIn}/${signal.tokenOut}`,
      dex: signal.dex,
      expiresIn: signal.expiresAt - Date.now()
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  async createApiKey(email, tier = 'BASIC') {
    const apiKey = `gx_${Buffer.from(email + Date.now()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 32)}`;
    
    const keyData = {
      apiKey,
      email,
      tier,
      createdAt: Date.now(),
      usage: { daily: 0, monthly: 0, total: 0 },
      active: true,
      lastUsed: null
    };
    
    this.apiKeys.set(apiKey, keyData);
    
    // Persist to database
    if (this.supabase) {
      await this.supabase.from('api_keys').insert({
        api_key: apiKey,
        email,
        tier,
        usage: keyData.usage,
        active: true,
        created_at: new Date().toISOString()
      });
    }
    
    console.log(`[🔔 SignalHub] Nova API key criada: ${apiKey} (${email} - ${tier})`);
    
    return { apiKey, tier, limits: SIGNAL_HUB_CONFIG.TIER_LIMITS[tier] };
  }

  async loadApiKeys() {
    if (!this.supabase) return;
    
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('[🔔 SignalHub] Erro ao carregar API keys:', error.message);
      return;
    }
    
    data.forEach(row => {
      this.apiKeys.set(row.api_key, {
        apiKey: row.api_key,
        email: row.email,
        tier: row.tier,
        createdAt: new Date(row.created_at).getTime(),
        usage: row.usage || { daily: 0, monthly: 0, total: 0 },
        active: row.active,
        lastUsed: row.last_used ? new Date(row.last_used).getTime() : null
      });
    });
    
    console.log(`[🔔 SignalHub] ${this.apiKeys.size} API keys carregadas`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING & LEDGER
  // ═══════════════════════════════════════════════════════════════════════════
  
  async logConsumption(apiKey, signalId, revenue, keyData) {
    const logEntry = {
      timestamp: Date.now(),
      apiKey,
      signalId,
      revenue,
      tier: keyData.tier,
      email: keyData.email
    };
    
    this.consumptionLog.push(logEntry);
    
    // Persist to GX_Billing_Ledger
    if (this.supabase) {
      await this.supabase.from('GX_Billing_Ledger').insert({
        execution_id: `signal_${signalId}`,
        timestamp: new Date().toISOString(),
        cost_usd: revenue,
        revenue_type: 'SIGNAL_CONSUMPTION',
        customer_email: keyData.email,
        tier: keyData.tier,
        signal_id: signalId,
        metadata: logEntry
      });
    }
    
    // Emit billing event
    this.emit('billing', logEntry);
  }

  async logBulkConsumption(apiKey, count, keyData) {
    const revenue = count * SIGNAL_HUB_CONFIG.PRICE_PER_SIGNAL_USD;
    
    if (this.supabase) {
      await this.supabase.from('GX_Billing_Ledger').insert({
        execution_id: `bulk_${Date.now()}`,
        timestamp: new Date().toISOString(),
        cost_usd: revenue,
        revenue_type: 'SIGNAL_BULK_CONSUMPTION',
        customer_email: keyData.email,
        tier: keyData.tier,
        signal_count: count,
        metadata: { apiKey, count, perSignalPrice: SIGNAL_HUB_CONFIG.PRICE_PER_SIGNAL_USD }
      });
    }
    
    console.log(`[🔔 SignalHub] Bulk consumption: ${count} sinais por ${keyData.email} ($${revenue.toFixed(2)})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  cleanupExpiredSignals() {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, signal] of this.signals) {
      if (signal.expiresAt < now) {
        this.signals.delete(id);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[🔔 SignalHub] ${removed} sinais expirados removidos`);
    }
  }

  getStats() {
    return {
      activeSignals: this.signals.size,
      totalApiKeys: this.apiKeys.size,
      revenue: this.revenueTracker,
      pricePerSignal: SIGNAL_HUB_CONFIG.PRICE_PER_SIGNAL_USD,
      tierLimits: SIGNAL_HUB_CONFIG.TIER_LIMITS
    };
  }

  getActiveSignals() {
    return Array.from(this.signals.values())
      .filter(s => s.expiresAt > Date.now())
      .map(s => this.sanitizeSignal(s));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════
const signalHub = new SignalHub();

export { SignalHub, signalHub, SIGNAL_HUB_CONFIG };
export default signalHub;
