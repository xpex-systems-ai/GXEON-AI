/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON SIGNAL BILLING ENGINE v3.0 — M2M Consumption Logger
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Arquitetura: Zero-Gas Monetization Layer
 * Protocolo: M2M_ALPHA_BROADCAST
 * Modelo: Pay-per-signal / Subscription tier billing
 * 
 * Tracks every signal consumed by external clients for revenue attribution.
 * Comandante: Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE BILLING
// ═══════════════════════════════════════════════════════════════════════════
const BILLING_CONFIG = {
  // Preços por tier (USD por sinal)
  pricing: {
    free: 0.00,      // Limitado a 10 sinais/min
    basic: 0.05,     // $0.05 por sinal
    premium: 0.02,   // $0.02 por sinal (bulk discount)
    enterprise: 0.01 // $0.01 por sinal (volume)
  },
  
  // Limites de crédito pré-pago por tier
  credit_limits: {
    free: 0,
    basic: 100,      // $100 crédito
    premium: 500,    // $500 crédito
    enterprise: 2000 // $2000 crédito
  },
  
  // Beneficiário imutável
  beneficiary: '0x3955d559055DadB7067054cB6E6f974710345224',
  
  // Intervalo de sync para Supabase (ms)
  sync_interval: 60000 // 1 minuto
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL BILLING ENGINE
// ═══════════════════════════════════════════════════════════════════════════
class SignalBillingEngine {
  constructor() {
    this.supabase = null;
    this.consumption_buffer = [];  // Buffer para batch insert
    this.daily_stats = {
      date: new Date().toISOString().split('T')[0],
      signals_by_tier: { free: 0, basic: 0, premium: 0, enterprise: 0 },
      revenue_by_tier: { free: 0, basic: 0, premium: 0, enterprise: 0 },
      total_signals: 0,
      total_revenue_usd: 0,
      unique_clients: new Set()
    };
    this.client_sessions = new Map(); // client_id -> session data
    this.init();
  }
  
  async init() {
    // Inicializa Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('💰 [SIGNAL_BILLING] Supabase conectado');
    } else {
      console.warn('⚠️ [SIGNAL_BILLING] Supabase não configurado — logging local apenas');
    }
    
    // Inicia sync periódico
    this.startPeriodicSync();
    
    console.log('💰 [SIGNAL_BILLING] Engine inicializada');
    console.log('💰 [SIGNAL_BILLING] Pricing:', BILLING_CONFIG.pricing);
  }
  
  /**
   * Registra consumo de sinal para billing
   */
  logConsumption(signalPacket, clientSession) {
    const timestamp = new Date().toISOString();
    const tier = clientSession.tier || 'free';
    const price_per_signal = BILLING_CONFIG.pricing[tier];
    const signal_value_usd = signalPacket.estimated_profit_usd || 0;
    
    const consumptionRecord = {
      signal_id: signalPacket.signal_id,
      client_id: clientSession.client_id,
      api_key: clientSession.api_key,
      tier: tier,
      timestamp: timestamp,
      
      // Dados do sinal consumido
      opportunity_type: signalPacket.opportunity_type,
      chain: signalPacket.chain,
      dex: signalPacket.dex,
      pool_address: signalPacket.pool_address,
      liquidity_usd: signalPacket.liquidity_usd,
      estimated_profit_usd: signalPacket.estimated_profit_usd,
      confidence_score: signalPacket.confidence_score,
      
      // Billing
      price_per_signal_usd: price_per_signal,
      charged_amount_usd: tier === 'free' ? 0 : price_per_signal,
      signal_value_usd: signal_value_usd,
      
      // Beneficiário (imutável)
      beneficiary: BILLING_CONFIG.beneficiary,
      
      // Metadados
      client_ip: clientSession.ip || null,
      user_agent: clientSession.user_agent || null,
      session_duration_seconds: clientSession.session_duration || 0
    };
    
    // Adiciona ao buffer
    this.consumption_buffer.push(consumptionRecord);
    
    // Atualiza estatísticas em memória
    this.daily_stats.signals_by_tier[tier]++;
    this.daily_stats.total_signals++;
    this.daily_stats.unique_clients.add(clientSession.client_id);
    
    if (tier !== 'free') {
      this.daily_stats.revenue_by_tier[tier] += price_per_signal;
      this.daily_stats.total_revenue_usd += price_per_signal;
    }
    
    // Log em tempo real para CLI
    if (tier === 'premium' || tier === 'enterprise') {
      console.log(`💰 [SIGNAL_BILLING] ${tier.toUpperCase()} | ` +
        `Client: ${clientSession.client_id.slice(0, 8)}... | ` +
        `Signal: ${signalPacket.signal_id.slice(0, 12)} | ` +
        `$${price_per_signal.toFixed(2)} | ` +
        `Profit potential: $${signal_value_usd.toFixed(2)}`);
    }
    
    // Flush se buffer grande
    if (this.consumption_buffer.length >= 100) {
      this.flushBuffer();
    }
  }
  
  /**
   * Inicia sessão de cliente para tracking
   */
  startClientSession(clientId, apiKey, tier, metadata = {}) {
    const session = {
      client_id: clientId,
      api_key: apiKey,
      tier: tier,
      started_at: new Date().toISOString(),
      signals_consumed: 0,
      total_billed: 0,
      ip: metadata.ip,
      user_agent: metadata.user_agent
    };
    
    this.client_sessions.set(clientId, session);
    
    console.log(`🔌 [SIGNAL_BILLING] Sessão iniciada: ${clientId} (${tier})`);
    
    return session;
  }
  
  /**
   * Finaliza sessão e calcula totais
   */
  endClientSession(clientId) {
    const session = this.client_sessions.get(clientId);
    if (!session) return null;
    
    const ended_at = new Date();
    const started_at = new Date(session.started_at);
    const duration = (ended_at - started_at) / 1000;
    
    session.ended_at = ended_at.toISOString();
    session.duration_seconds = duration;
    
    console.log(`🔌 [SIGNAL_BILLING] Sessão finalizada: ${clientId} | ` +
      `Duration: ${duration.toFixed(0)}s | ` +
      `Signals: ${session.signals_consumed} | ` +
      `Billed: $${session.total_billed.toFixed(2)}`);
    
    // Persiste sessão no Supabase
    this.logSessionToSupabase(session);
    
    this.client_sessions.delete(clientId);
    return session;
  }
  
  /**
   * Flush do buffer para Supabase
   */
  async flushBuffer() {
    if (this.consumption_buffer.length === 0) return;
    if (!this.supabase) return;
    
    const records = [...this.consumption_buffer];
    this.consumption_buffer = [];
    
    try {
      const { error } = await this.supabase
        .from('signal_consumption_logs')
        .insert(records);
        
      if (error) {
        console.error(`❌ [SIGNAL_BILLING] Erro no flush: ${error.message}`);
        // Re-adiciona ao buffer para retry
        this.consumption_buffer.unshift(...records);
      } else {
        console.log(`💰 [SIGNAL_BILLING] ${records.length} registros persistidos`);
      }
    } catch (err) {
      console.error(`❌ [SIGNAL_BILLING] Exceção no flush: ${err.message}`);
      this.consumption_buffer.unshift(...records);
    }
  }
  
  /**
   * Persiste sessão no Supabase
   */
  async logSessionToSupabase(session) {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('signal_client_sessions')
        .insert({
          client_id: session.client_id,
          api_key: session.api_key,
          tier: session.tier,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_seconds: session.duration_seconds,
          signals_consumed: session.signals_consumed,
          total_billed_usd: session.total_billed,
          client_ip: session.ip,
          user_agent: session.user_agent,
          beneficiary: BILLING_CONFIG.beneficiary
        });
    } catch (err) {
      console.error(`❌ [SIGNAL_BILLING] Erro ao logar sessão: ${err.message}`);
    }
  }
  
  /**
   * Sync periódico para garantir persistência
   */
  startPeriodicSync() {
    setInterval(() => {
      this.flushBuffer();
      this.persistDailyStats();
    }, BILLING_CONFIG.sync_interval);
  }
  
  /**
   * Persiste estatísticas diárias
   */
  async persistDailyStats() {
    if (!this.supabase) return;
    
    const stats = {
      date: this.daily_stats.date,
      signals_free: this.daily_stats.signals_by_tier.free,
      signals_basic: this.daily_stats.signals_by_tier.basic,
      signals_premium: this.daily_stats.signals_by_tier.premium,
      signals_enterprise: this.daily_stats.signals_by_tier.enterprise,
      revenue_basic: this.daily_stats.revenue_by_tier.basic,
      revenue_premium: this.daily_stats.revenue_by_tier.premium,
      revenue_enterprise: this.daily_stats.revenue_by_tier.enterprise,
      total_revenue_usd: this.daily_stats.total_revenue_usd,
      unique_clients: this.daily_stats.unique_clients.size,
      beneficiary: BILLING_CONFIG.beneficiary,
      updated_at: new Date().toISOString()
    };
    
    try {
      await this.supabase
        .from('signal_daily_stats')
        .upsert(stats, { onConflict: 'date' });
    } catch (err) {
      console.error(`❌ [SIGNAL_BILLING] Erro ao persistir stats: ${err.message}`);
    }
  }
  
  /**
   * Retorna relatório de billing em tempo real
   */
  getBillingReport() {
    return {
      period: this.daily_stats.date,
      signals_by_tier: { ...this.daily_stats.signals_by_tier },
      revenue_by_tier: { ...this.daily_stats.revenue_by_tier },
      total_signals: this.daily_stats.total_signals,
      total_revenue_usd: parseFloat(this.daily_stats.total_revenue_usd.toFixed(2)),
      unique_clients: this.daily_stats.unique_clients.size,
      active_sessions: this.client_sessions.size,
      beneficiary: BILLING_CONFIG.beneficiary,
      pricing: BILLING_CONFIG.pricing,
      buffer_size: this.consumption_buffer.length,
      generated_at: new Date().toISOString()
    };
  }
  
  /**
   * Gera invoice para cliente específico
   */
  generateClientInvoice(clientId) {
    const session = this.client_sessions.get(clientId);
    if (!session) {
      return { error: 'Client session not found' };
    }
    
    const tier = session.tier;
    const signals = session.signals_consumed;
    const rate = BILLING_CONFIG.pricing[tier];
    const total = signals * rate;
    
    return {
      client_id: clientId,
      tier: tier,
      signals_consumed: signals,
      rate_per_signal: rate,
      total_due_usd: total,
      beneficiary: BILLING_CONFIG.beneficiary,
      payment_address: BILLING_CONFIG.beneficiary,
      generated_at: new Date().toISOString()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════
const signalBilling = new SignalBillingEngine();

export { SignalBillingEngine, signalBilling, BILLING_CONFIG };
export default signalBilling;
