#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROOF OF VALUE SYSTEM v1.0 - Trust & Validation Engine
 * 
 * Features:
 * - Signal tracking (quem recebeu, quando, resultado)
 * - Result validator (bateu target ou stop?)
 * - Profit simulator
 * - Leaderboard (top signals, top providers)
 * - Telegram history display
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const PROOF_CONFIG = {
  VALIDATION: {
    PRICE_CHECK_INTERVAL_MINUTES: 5,
    MAX_TRACKING_HOURS: 48,
    PROFIT_THRESHOLD_PCT: 0.5 // 0.5% para considerar "batido"
  },
  
  SCORING: {
    WIN_POINTS: 10,
    LOSS_POINTS: -5,
    ACCURACY_BONUS: 20 // Para >70% win rate
  },
  
  LEADERBOARD: {
    TOP_SIGNALS_LIMIT: 10,
    TOP_PROVIDERS_LIMIT: 5,
    UPDATE_INTERVAL_MINUTES: 15
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL TRACKER
// ═══════════════════════════════════════════════════════════════════════════
class SignalTracker {
  constructor(proof) {
    this.proof = proof;
    this.supabase = proof.supabase;
    this.trackingSignals = new Map(); // signal_id -> tracking data
  }
  
  /**
   * Inicia tracking de sinal
   */
  async trackSignal(signal) {
    try {
      const tracking = {
        signal_id: signal.id,
        signal_id_str: signal.signal_id,
        provider_id: signal.provider_id,
        pair: signal.pair,
        type: signal.type,
        entry_price: signal.entry_price,
        target_price: signal.target_price,
        stop_price: signal.stop_price,
        
        // Tracking data
        highest_price: signal.entry_price,
        lowest_price: signal.entry_price,
        exit_price: null,
        
        // Status
        status: 'tracking',
        result: 'pending',
        
        // Times
        started_at: new Date().toISOString(),
        expires_at: signal.valid_until,
        
        // Recipients
        recipients_count: 0,
        
        // Metadata
        metadata: {
          confidence: signal.confidence,
          strategy: signal.strategy,
          tier_access: signal.tier_access
        }
      };
      
      // Store in memory for real-time tracking
      this.trackingSignals.set(signal.id, tracking);
      
      // Persist to database
      if (this.supabase) {
        await this.supabase
          .from('signal_results')
          .insert(tracking);
      }
      
      // Start price monitoring
      this.startPriceMonitoring(signal.id);
      
      console.log(`[✅ Proof] Tracking iniciado: ${signal.signal_id}`);
      
      return tracking;
      
    } catch (err) {
      console.error('[✅ Proof] Erro ao iniciar tracking:', err);
      return null;
    }
  }
  
  /**
   * Atualiza recipients do sinal
   */
  async updateRecipients(signalId, count) {
    try {
      const tracking = this.trackingSignals.get(signalId);
      if (tracking) {
        tracking.recipients_count = count;
      }
      
      if (this.supabase) {
        await this.supabase
          .from('signal_results')
          .update({ recipients_count: count })
          .eq('signal_id', signalId);
      }
      
    } catch (err) {
      console.error('[✅ Proof] Erro ao atualizar recipients:', err);
    }
  }
  
  /**
   * Inicia monitoramento de preço
   */
  startPriceMonitoring(signalId) {
    // Simulação - em produção integrar com exchange APIs
    // Por enquanto, usar simulação para demonstração
    
    const interval = setInterval(async () => {
      const tracking = this.trackingSignals.get(signalId);
      if (!tracking || tracking.status !== 'tracking') {
        clearInterval(interval);
        return;
      }
      
      // Check if expired
      if (new Date(tracking.expires_at) < new Date()) {
        await this.expireSignal(signalId);
        clearInterval(interval);
        return;
      }
      
      // Simulate price check (em produção: buscar de exchange API)
      await this.simulatePriceCheck(signalId);
      
    }, PROOF_CONFIG.VALIDATION.PRICE_CHECK_INTERVAL_MINUTES * 60 * 1000);
  }
  
  /**
   * Simula verificação de preço (para demo)
   */
  async simulatePriceCheck(signalId) {
    const tracking = this.trackingSignals.get(signalId);
    if (!tracking) return;
    
    // Simulate random price movement
    const volatility = 0.02; // 2%
    const direction = Math.random() > 0.5 ? 1 : -1;
    const change = 1 + (direction * Math.random() * volatility);
    
    const currentPrice = tracking.highest_price * change;
    
    // Update highs/lows
    if (currentPrice > tracking.highest_price) {
      tracking.highest_price = currentPrice;
    }
    if (currentPrice < tracking.lowest_price) {
      tracking.lowest_price = currentPrice;
    }
    
    // Check targets
    if (tracking.type === 'LONG') {
      if (currentPrice >= tracking.target_price) {
        await this.closeSignal(signalId, 'win', currentPrice, 'Target atingido');
      } else if (currentPrice <= tracking.stop_price) {
        await this.closeSignal(signalId, 'loss', currentPrice, 'Stop atingido');
      }
    } else { // SHORT
      if (currentPrice <= tracking.target_price) {
        await this.closeSignal(signalId, 'win', currentPrice, 'Target atingido');
      } else if (currentPrice >= tracking.stop_price) {
        await this.closeSignal(signalId, 'loss', currentPrice, 'Stop atingido');
      }
    }
    
    // Update database
    if (this.supabase) {
      await this.supabase
        .from('signal_results')
        .update({
          highest_price: tracking.highest_price,
          lowest_price: tracking.lowest_price
        })
        .eq('signal_id', signalId);
    }
  }
  
  /**
   * Fecha sinal com resultado
   */
  async closeSignal(signalId, result, exitPrice, notes = '') {
    const tracking = this.trackingSignals.get(signalId);
    if (!tracking || tracking.status !== 'tracking') return;
    
    tracking.status = 'closed';
    tracking.result = result;
    tracking.exit_price = exitPrice;
    tracking.closed_at = new Date().toISOString();
    tracking.notes = notes;
    
    // Calculate actual P&L
    const entry = tracking.entry_price;
    const exit = exitPrice;
    
    if (tracking.type === 'LONG') {
      tracking.actual_profit_loss = ((exit - entry) / entry * 100);
    } else {
      tracking.actual_profit_loss = ((entry - exit) / entry * 100);
    }
    
    // Calculate drawdown
    if (tracking.type === 'LONG') {
      tracking.max_drawdown = ((tracking.lowest_price - entry) / entry * 100);
    } else {
      tracking.max_drawdown = ((tracking.highest_price - entry) / entry * 100);
    }
    
    // Time to result
    const started = new Date(tracking.started_at);
    const closed = new Date(tracking.closed_at);
    tracking.time_to_result_minutes = Math.floor((closed - started) / (1000 * 60));
    
    // Update database
    if (this.supabase) {
      await this.supabase
        .from('signal_results')
        .update({
          result,
          exit_price: exitPrice,
          actual_profit_loss: tracking.actual_profit_loss,
          max_drawdown: tracking.max_drawdown,
          time_to_result_minutes: tracking.time_to_result_minutes,
          status: 'closed',
          notes,
          closed_at: tracking.closed_at,
          validated_by: 'system',
          validated_at: new Date().toISOString()
        })
        .eq('signal_id', signalId);
      
      // Update signal status
      await this.supabase
        .from('unified_signals')
        .update({
          status: result === 'win' ? 'hit_target' : 'hit_stop',
          result,
          actual_profit_loss: tracking.actual_profit_loss,
          closed_at: tracking.closed_at
        })
        .eq('id', signalId);
    }
    
    // Emit event
    this.proof.emit('signal:closed', {
      signal_id: signalId,
      result,
      pnl: tracking.actual_profit_loss,
      provider_id: tracking.provider_id
    });
    
    console.log(`[✅ Proof] Sinal fechado: ${tracking.signal_id_str} | ${result.toUpperCase()} | ${tracking.actual_profit_loss.toFixed(2)}%`);
  }
  
  /**
   * Expira sinal sem resultado
   */
  async expireSignal(signalId) {
    const tracking = this.trackingSignals.get(signalId);
    if (!tracking) return;
    
    tracking.status = 'expired';
    tracking.result = 'expired';
    
    if (this.supabase) {
      await this.supabase
        .from('signal_results')
        .update({
          result: 'expired',
          status: 'expired'
        })
        .eq('signal_id', signalId);
      
      await this.supabase
        .from('unified_signals')
        .update({
          status: 'expired',
          result: 'expired'
        })
        .eq('id', signalId);
    }
    
    this.proof.emit('signal:expired', { signal_id: signalId });
  }
  
  /**
   * Retorna tracking de sinal
   */
  getTracking(signalId) {
    return this.trackingSignals.get(signalId);
  }
  
  /**
   * Lista sinais em tracking
   */
  getActiveTracking() {
    return Array.from(this.trackingSignals.values())
      .filter(t => t.status === 'tracking');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
class ResultValidator {
  constructor(proof) {
    this.proof = proof;
    this.supabase = proof.supabase;
  }
  
  /**
   * Valida manualmente um resultado
   */
  async validateManual(signalId, result, exitPrice, evidenceUrl = null, validatedBy = 'admin') {
    try {
      const update = {
        result,
        exit_price: exitPrice,
        status: 'validated',
        result_source: 'manual',
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        evidence_url: evidenceUrl
      };
      
      // Calculate P&L
      const { data: signal } = await this.supabase
        .from('unified_signals')
        .select('entry_price, type')
        .eq('id', signalId)
        .single();
      
      if (signal) {
        const entry = signal.entry_price;
        const exit = exitPrice;
        
        if (signal.type === 'LONG') {
          update.actual_profit_loss = ((exit - entry) / entry * 100);
        } else {
          update.actual_profit_loss = ((entry - exit) / entry * 100);
        }
      }
      
      await this.supabase
        .from('signal_results')
        .update(update)
        .eq('signal_id', signalId);
      
      await this.supabase
        .from('unified_signals')
        .update({
          status: result === 'win' ? 'hit_target' : 'hit_stop',
          result,
          actual_profit_loss: update.actual_profit_loss
        })
        .eq('id', signalId);
      
      // Recalculate provider score
      const { data: tracking } = await this.supabase
        .from('signal_results')
        .select('provider_id')
        .eq('signal_id', signalId)
        .single();
      
      if (tracking?.provider_id) {
        await this.proof.recalculateProviderScore(tracking.provider_id);
      }
      
      return { success: true, result };
      
    } catch (err) {
      console.error('[✅ Validator] Erro na validação:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Valida via oracle de preço (integração futura)
   */
  async validateViaOracle(signalId) {
    // Futura integração com oráculo de preço
    // Por enquanto retorna pending
    return { success: true, status: 'pending_oracle' };
  }
  
  /**
   * Batch validation (para admin)
   */
  async batchValidate(validations) {
    const results = [];
    
    for (const validation of validations) {
      const result = await this.validateManual(
        validation.signalId,
        validation.result,
        validation.exitPrice,
        validation.evidenceUrl,
        validation.validatedBy
      );
      
      results.push(result);
    }
    
    return {
      success: results.every(r => r.success),
      processed: results.length,
      results
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFIT SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
class ProfitSimulator {
  /**
   * Simula resultado com capital específico
   */
  simulate(signal, capitalUsd = 1000) {
    const entry = signal.entry_price;
    const target = signal.target_price;
    const stop = signal.stop_price;
    
    // Position size (assume 100% of capital for simplicity)
    const positionSize = capitalUsd;
    
    // Potential profit
    const profitPct = ((target - entry) / entry * 100);
    const profitUsd = positionSize * (profitPct / 100);
    
    // Potential loss
    const lossPct = ((entry - stop) / entry * 100);
    const lossUsd = positionSize * (lossPct / 100);
    
    // Risk/Reward
    const riskReward = Math.abs(profitUsd / lossUsd);
    
    // Expected value (com base na confiança)
    const winProbability = signal.confidence / 100;
    const expectedValue = (winProbability * profitUsd) - ((1 - winProbability) * lossUsd);
    
    return {
      capital: capitalUsd,
      position_size: positionSize,
      
      profit_scenario: {
        price: target,
        percent: profitPct,
        usd: profitUsd
      },
      
      loss_scenario: {
        price: stop,
        percent: lossPct,
        usd: Math.abs(lossUsd)
      },
      
      risk_reward_ratio: riskReward,
      win_probability: winProbability,
      expected_value_usd: expectedValue,
      
      recommendation: this.generateRecommendation(riskReward, signal.confidence)
    };
  }
  
  generateRecommendation(riskReward, confidence) {
    if (riskReward >= 3 && confidence >= 80) {
      return 'EXCELLENT - Alto potencial, alta confiança';
    } else if (riskReward >= 2 && confidence >= 70) {
      return 'GOOD - Boa oportunidade';
    } else if (riskReward >= 1.5 && confidence >= 60) {
      return 'MODERATE - Avalie com cautela';
    } else {
      return 'RISKY - Considere riscos cuidadosamente';
    }
  }
  
  /**
   * Simula portfolio com múltiplos sinais
   */
  simulatePortfolio(signals, capitalPerSignal = 1000) {
    const simulations = signals.map(s => this.simulate(s, capitalPerSignal));
    
    const totalCapital = capitalPerSignal * signals.length;
    const totalExpectedValue = simulations.reduce((sum, s) => sum + s.expected_value_usd, 0);
    const avgRiskReward = simulations.reduce((sum, s) => sum + s.risk_reward_ratio, 0) / simulations.length;
    
    return {
      signals_count: signals.length,
      total_capital: totalCapital,
      
      scenarios: {
        all_win: {
          total_profit_usd: simulations.reduce((sum, s) => sum + s.profit_scenario.usd, 0),
          roi_percent: 0
        },
        all_loss: {
          total_loss_usd: simulations.reduce((sum, s) => sum + s.loss_scenario.usd, 0),
          roi_percent: 0
        },
        expected: {
          profit_usd: totalExpectedValue,
          roi_percent: (totalExpectedValue / totalCapital * 100)
        }
      },
      
      avg_risk_reward: avgRiskReward,
      portfolio_diversity: this.calculateDiversity(signals)
    };
  }
  
  calculateDiversity(signals) {
    const pairs = new Set(signals.map(s => s.pair));
    const strategies = new Set(signals.map(s => s.strategy));
    const types = new Set(signals.map(s => s.type));
    
    const diversityScore = (pairs.size + strategies.size + types.size) / 3;
    
    return {
      pairs: Array.from(pairs),
      strategies: Array.from(strategies),
      types: Array.from(types),
      diversity_score: diversityScore
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════
class Leaderboard {
  constructor(proof) {
    this.proof = proof;
    this.supabase = proof.supabase;
    this.cache = new Map(); // Cache de leaderboards
    
    // Start update loop
    this.startUpdateLoop();
  }
  
  startUpdateLoop() {
    setInterval(() => {
      this.calculateAllLeaderboards();
    }, PROOF_CONFIG.LEADERBOARD.UPDATE_INTERVAL_MINUTES * 60 * 1000);
    
    // Initial calculation
    this.calculateAllLeaderboards();
  }
  
  /**
   * Calcula todos os leaderboards
   */
  async calculateAllLeaderboards() {
    const today = new Date().toISOString().split('T')[0];
    
    await this.calculateTopSignals('daily', today);
    await this.calculateTopSignals('weekly', today);
    await this.calculateTopProviders('daily', today);
    await this.calculateBestROI('monthly', today);
    
    console.log('[✅ Leaderboard] Leaderboards atualizados');
  }
  
  /**
   * Calcula top sinais
   */
  async calculateTopSignals(period, date) {
    try {
      let startDate;
      const now = new Date(date);
      
      if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === 'weekly') {
        const day = now.getDay();
        startDate = new Date(now.setDate(now.getDate() - day));
      }
      
      // Query closed signals
      const { data: signals, error } = await this.supabase
        .from('signal_results')
        .select(`
          signal_id,
          result,
          actual_profit_loss,
          unified_signals!inner(pair, provider_id, provider_name, confidence)
        `)
        .eq('result', 'win')
        .gte('closed_at', startDate.toISOString())
        .order('actual_profit_loss', { ascending: false })
        .limit(PROOF_CONFIG.LEADERBOARD.TOP_SIGNALS_LIMIT);
      
      if (error) throw error;
      
      // Save to leaderboard
      for (let i = 0; i < (signals || []).length; i++) {
        const signal = signals[i];
        
        await this.supabase
          .from('signal_leaderboard')
          .upsert({
            period,
            category: 'top_signals',
            entity_type: 'signal',
            entity_id: signal.signal_id,
            entity_name: signal.unified_signals?.pair || 'Unknown',
            rank_position: i + 1,
            score: signal.actual_profit_loss,
            calculated_for_date: date
          });
      }
      
      // Update cache
      this.cache.set(`top_signals_${period}`, signals || []);
      
    } catch (err) {
      console.error('[✅ Leaderboard] Erro ao calcular top signals:', err);
    }
  }
  
  /**
   * Calcula top providers
   */
  async calculateTopProviders(period, date) {
    try {
      // Get provider stats
      const { data: providers, error } = await this.supabase
        .from('signal_providers')
        .select('id, name, provider_score, win_rate, total_signals, avg_roi')
        .eq('is_active', true)
        .order('provider_score', { ascending: false })
        .limit(PROOF_CONFIG.LEADERBOARD.TOP_PROVIDERS_LIMIT);
      
      if (error) throw error;
      
      // Save to leaderboard
      for (let i = 0; i < (providers || []).length; i++) {
        const provider = providers[i];
        
        await this.supabase
          .from('signal_leaderboard')
          .upsert({
            period,
            category: 'top_providers',
            entity_type: 'provider',
            entity_id: provider.id,
            entity_name: provider.name,
            rank_position: i + 1,
            score: provider.provider_score,
            win_rate: provider.win_rate,
            total_signals: provider.total_signals,
            avg_roi: provider.avg_roi,
            calculated_for_date: date
          });
      }
      
      this.cache.set(`top_providers_${period}`, providers || []);
      
    } catch (err) {
      console.error('[✅ Leaderboard] Erro ao calcular top providers:', err);
    }
  }
  
  /**
   * Calcula best ROI
   */
  async calculateBestROI(period, date) {
    // Similar a top signals mas focado em ROI
    // Simplificado para demo
  }
  
  /**
   * Retorna leaderboard
   */
  async getLeaderboard(period = 'daily', category = 'top_signals', limit = 10) {
    try {
      // Try cache first
      const cacheKey = `${category}_${period}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey).slice(0, limit);
      }
      
      // Query database
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await this.supabase
        .from('signal_leaderboard')
        .select('*')
        .eq('period', period)
        .eq('category', category)
        .eq('calculated_for_date', today)
        .order('rank_position', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return data || [];
      
    } catch (err) {
      console.error('[✅ Leaderboard] Erro ao buscar leaderboard:', err);
      return [];
    }
  }
  
  /**
   * Formata para Telegram
   */
  formatForTelegram(period = 'daily') {
    const signals = this.cache.get(`top_signals_${period}`) || [];
    
    if (signals.length === 0) {
      return '📊 *Leaderboard* — Nenhum sinal finalizado ainda hoje';
    }
    
    let message = `🏆 *TOP SINAIS DO DIA*\n\n`;
    
    signals.forEach((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      message += `${medal} *${s.unified_signals?.pair || s.entity_name}*\n`;
      message += `   📈 +${s.actual_profit_loss?.toFixed(2)}% | ${s.unified_signals?.confidence || 0}% confiança\n\n`;
    });
    
    message += `_Atualizado: ${new Date().toLocaleTimeString('pt-BR')}_`;
    
    return message;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROOF OF VALUE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
class ProofOfValue extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.tracker = new SignalTracker(this);
    this.validator = new ResultValidator(this);
    this.simulator = new ProfitSimulator();
    this.leaderboard = new Leaderboard(this);
    
    this.init();
  }
  
  async init() {
    console.log('[✅ ProofOfValue] Inicializando...');
    
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      await this.loadActiveTracking();
    }
    
    console.log('[✅ ProofOfValue] Pronto');
  }
  
  /**
   * Carrega tracking ativo do banco
   */
  async loadActiveTracking() {
    try {
      const { data, error } = await this.supabase
        .from('signal_results')
        .select('*')
        .eq('status', 'tracking');
      
      if (error) throw error;
      
      for (const tracking of data || []) {
        this.tracker.trackingSignals.set(tracking.signal_id, tracking);
        this.tracker.startPriceMonitoring(tracking.signal_id);
      }
      
      console.log(`[✅ ProofOfValue] ${data?.length || 0} sinais em tracking carregados`);
      
    } catch (err) {
      console.error('[✅ ProofOfValue] Erro ao carregar tracking:', err);
    }
  }
  
  /**
   * Recalcula score de provider
   */
  async recalculateProviderScore(providerId) {
    try {
      await this.supabase.rpc('calculate_provider_score', {
        provider_uuid: providerId
      });
    } catch (err) {
      console.error('[✅ ProofOfValue] Erro ao recalcular score:', err);
    }
  }
  
  /**
   * Retorna histórico para Telegram
   */
  async getTelegramHistory(userId, limit = 10) {
    try {
      // Get signals received by user
      const { data: dispatches } = await this.supabase
        .from('signal_dispatch_log')
        .select('signal_id, dispatched_at, tier_delivered')
        .eq('user_id', userId)
        .order('dispatched_at', { ascending: false })
        .limit(limit);
      
      if (!dispatches || dispatches.length === 0) {
        return '📭 *Histórico vazio*\n\nNenhum sinal recebido ainda.';
      }
      
      // Get results
      const signalIds = dispatches.map(d => d.signal_id);
      
      const { data: results } = await this.supabase
        .from('signal_results')
        .select('signal_id, result, actual_profit_loss, unified_signals(pair, type)')
        .in('signal_id', signalIds);
      
      // Build history message
      let message = `📊 *SEU HISTÓRICO* — Últimos ${dispatches.length} sinais\n\n`;
      
      for (const dispatch of dispatches) {
        const result = results?.find(r => r.signal_id === dispatch.signal_id);
        const pair = result?.unified_signals?.pair || 'Unknown';
        const type = result?.unified_signals?.type || 'LONG';
        
        const emoji = type === 'LONG' ? '🟢' : '🔴';
        const resultEmoji = result?.result === 'win' ? '✅' : result?.result === 'loss' ? '❌' : '⏳';
        const pnl = result?.actual_profit_loss ? `${result.actual_profit_loss > 0 ? '+' : ''}${result.actual_profit_loss.toFixed(2)}%` : '...';
        
        message += `${emoji} *${pair}* ${resultEmoji}\n`;
        message += `   ${pnl} | ${new Date(dispatch.dispatched_at).toLocaleDateString('pt-BR')}\n\n`;
      }
      
      // Calculate stats
      const wins = results?.filter(r => r.result === 'win').length || 0;
      const losses = results?.filter(r => r.result === 'loss').length || 0;
      const totalPnL = results?.reduce((sum, r) => sum + (r.actual_profit_loss || 0), 0) || 0;
      
      message += `\n📈 *Resumo:* ${wins}✅ ${losses}❌ | P&L: ${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}%`;
      
      return message;
      
    } catch (err) {
      console.error('[✅ ProofOfValue] Erro ao gerar histórico:', err);
      return '❌ Erro ao carregar histórico';
    }
  }
  
  /**
   * Estatísticas
   */
  async getStats() {
    try {
      const tracking = await this.supabase
        .from('signal_results')
        .select('result', { count: 'exact' });
      
      const wins = await this.supabase
        .from('signal_results')
        .select('*', { count: 'exact' })
        .eq('result', 'win');
      
      const losses = await this.supabase
        .from('signal_results')
        .select('*', { count: 'exact' })
        .eq('result', 'loss');
      
      return {
        total_tracked: tracking.count || 0,
        wins: wins.count || 0,
        losses: losses.count || 0,
        win_rate: tracking.count > 0 ? ((wins.count || 0) / tracking.count * 100).toFixed(2) : 0,
        currently_tracking: this.tracker.getActiveTracking().length
      };
      
    } catch (err) {
      return { error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const proofOfValue = new ProofOfValue();

export {
  ProofOfValue,
  SignalTracker,
  ResultValidator,
  ProfitSimulator,
  Leaderboard,
  proofOfValue,
  PROOF_CONFIG
};
export default proofOfValue;
