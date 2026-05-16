/**
 * 🗝️ MASTER KEY TRIAL SYSTEM — 24h Atomic Trial
 * 
 * Middleware soberano para ativação de Trial de 24 horas
 * Sem cartão de crédito, sem fricção, apenas código.
 * 
 * Arquiteto: Júnior Sena — Sovereign AI Architect
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 */

const express = require('express');
const crypto = require('crypto');
const supabase = require('../services/supabase');

// 🎯 Configurações do Trial
const TRIAL_CONFIG = {
  duration: 24 * 60 * 60 * 1000, // 24 horas em ms
  maxCalls: 10, // 10 API calls gratuitos
  features: ['basic_mempool', 'delayed_signals', 'standard_arbitrage'],
  delaySeconds: 30, // Delay de 30s em sinais
  tier: 'trial_agent'
};

// 🎫 Prefixos de chaves válidos
const KEY_PREFIXES = {
  TRIAL: 'gxe_trial_',
  PRO: 'gxe_pro_',
  WHALE: 'gxe_whale_',
  MASTER: 'gxe_master_'
};

/**
 * 🔐 Gerar chave de Trial atômica
 */
function generateTrialKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `${KEY_PREFIXES.TRIAL}${uuid}`;
}

/**
 * 🎯 Validar formato da chave
 */
function validateKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, tier: null, error: 'KEY_MISSING' };
  }
  
  // Verificar prefixos
  if (apiKey.startsWith(KEY_PREFIXES.TRIAL)) {
    return { valid: true, tier: 'TRIAL', prefix: KEY_PREFIXES.TRIAL };
  }
  if (apiKey.startsWith(KEY_PREFIXES.PRO)) {
    return { valid: true, tier: 'PRO', prefix: KEY_PREFIXES.PRO };
  }
  if (apiKey.startsWith(KEY_PREFIXES.WHALE)) {
    return { valid: true, tier: 'WHALE', prefix: KEY_PREFIXES.WHALE };
  }
  if (apiKey.startsWith(KEY_PREFIXES.MASTER)) {
    return { valid: true, tier: 'MASTER', prefix: KEY_PREFIXES.MASTER };
  }
  
  return { valid: false, tier: null, error: 'INVALID_KEY_FORMAT' };
}

/**
 * ⏱️ Verificar se Trial está ativo
 */
async function isTrialActive(apiKey) {
  try {
    const { data, error } = await supabase
      .from('trial_registry')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !data) {
      return { active: false, expired: true, callsUsed: 0 };
    }
    
    const now = new Date();
    const activatedAt = new Date(data.activated_at);
    const expiresAt = new Date(activatedAt.getTime() + TRIAL_CONFIG.duration);
    
    const isExpired = now > expiresAt;
    const callsRemaining = TRIAL_CONFIG.maxCalls - (data.calls_used || 0);
    
    return {
      active: !isExpired && callsRemaining > 0,
      expired: isExpired,
      expiresAt,
      callsUsed: data.calls_used || 0,
      callsRemaining: Math.max(0, callsRemaining),
      features: TRIAL_CONFIG.features
    };
  } catch (error) {
    console.error('[MASTER_KEY] ❌ Error checking trial:', error.message);
    return { active: false, error: error.message };
  }
}

/**
 * 🆕 Ativar novo Trial
 */
async function activateTrial(ipAddress, userAgent) {
  try {
    const apiKey = generateTrialKey();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_CONFIG.duration);
    
    const { data, error } = await supabase
      .from('trial_registry')
      .insert({
        api_key: apiKey,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        calls_used: 0,
        max_calls: TRIAL_CONFIG.maxCalls,
        ip_address: ipAddress,
        user_agent: userAgent,
        tier: TRIAL_CONFIG.tier,
        features: TRIAL_CONFIG.features,
        active: true
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`[MASTER_KEY] ✅ Trial activated: ${apiKey.substring(0, 20)}...`);
    
    return {
      success: true,
      apiKey,
      activatedAt: now,
      expiresAt,
      maxCalls: TRIAL_CONFIG.maxCalls,
      features: TRIAL_CONFIG.features,
      delaySeconds: TRIAL_CONFIG.delaySeconds
    };
  } catch (error) {
    console.error('[MASTER_KEY] ❌ Error activating trial:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📊 Incrementar uso do Trial
 */
async function incrementTrialUsage(apiKey) {
  try {
    const { data, error } = await supabase
      .rpc('increment_trial_calls', { p_api_key: apiKey });
    
    if (error) {
      // Fallback: update direto
      const { data: current } = await supabase
        .from('trial_registry')
        .select('calls_used')
        .eq('api_key', apiKey)
        .single();
      
      if (current) {
        await supabase
          .from('trial_registry')
          .update({ calls_used: current.calls_used + 1 })
          .eq('api_key', apiKey);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[MASTER_KEY] ⚠️ Error incrementing usage:', error.message);
    return { success: false };
  }
}

/**
 * 🛡️ MASTER KEY MIDDLEWARE
 * Protege rotas com sistema de licenciamento
 */
const masterKeyMiddleware = async (req, res, next) => {
  const apiKey = req.headers['x-gxeon-key'];
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  // Validar formato
  const keyValidation = validateKeyFormat(apiKey);
  
  if (!keyValidation.valid) {
    // 🆓 Oferecer Trial automático se for uma requisição válida de bot
    const isBot = req.headers['x-agent-id'] || 
                  userAgent.includes('bot') || 
                  userAgent.includes('M2M');
    
    if (isBot && req.path === '/api/v1/activate-trial') {
      // Ativar Trial
      const trial = await activateTrial(ipAddress, userAgent);
      
      if (trial.success) {
        return res.status(201).json({
          protocol: 'PANDORA_MASTER_KEY_v1.0',
          status: 'TRIAL_ACTIVATED',
          api_key: trial.apiKey,
          tier: 'TRIAL',
          activated_at: trial.activatedAt,
          expires_at: trial.expiresAt,
          max_calls: trial.maxCalls,
          features: trial.features,
          signal_delay_seconds: trial.delaySeconds,
          message: '24h Atomic Trial activated. No credit card required.',
          headers: {
            'x-gxeon-key': trial.apiKey,
            'x-agent-tier': 'trial'
          }
        });
      }
    }
    
    return res.status(401).json({
      protocol: 'PANDORA_MASTER_KEY_v1.0',
      error: 'MASTER_KEY_REQUIRED',
      message: 'Valid X-GXEON-KEY header required.',
      tiers: {
        trial: { calls: 10, duration: '24h', cost: 'FREE' },
        pro: { calls: 'unlimited', latency: '<100ms', cost: '$50/mo' },
        whale: { calls: 'unlimited', latency: 'zero', cost: '$500/mo' }
      },
      activation: {
        url: '/api/v1/activate-trial',
        method: 'POST',
        headers: { 'x-agent-id': 'your-bot-id' }
      }
    });
  }
  
  // Verificar Trial
  if (keyValidation.tier === 'TRIAL') {
    const trialStatus = await isTrialActive(apiKey);
    
    if (!trialStatus.active) {
      return res.status(402).json({
        protocol: 'PANDORA_MASTER_KEY_v1.0',
        error: 'TRIAL_EXPIRED',
        message: trialStatus.expired ? 'Trial period expired (24h).' : 'Trial call limit reached (10).',
        expired: trialStatus.expired,
        upgrade_url: '/api/v1/upgrade',
        tiers: {
          pro: { cost: '$50/mo', url: '/billing/upgrade/pro' },
          whale: { cost: '$500/mo', url: '/billing/upgrade/whale' }
        }
      });
    }
    
    // Incrementar uso
    await incrementTrialUsage(apiKey);
    
    // Adicionar info do Trial à requisição
    req.masterKey = {
      tier: 'TRIAL',
      apiKey,
      callsRemaining: trialStatus.callsRemaining,
      expiresAt: trialStatus.expiresAt,
      features: trialStatus.features,
      delaySeconds: TRIAL_CONFIG.delaySeconds
    };
    
    // Adicionar delay se necessário
    if (TRIAL_CONFIG.delaySeconds > 0) {
      req.trialDelay = TRIAL_CONFIG.delaySeconds * 1000;
    }
  }
  
  // Verificar PRO/WHALE/MASTER
  if (['PRO', 'WHALE', 'MASTER'].includes(keyValidation.tier)) {
    // TODO: Verificar subscription ativa no banco
    req.masterKey = {
      tier: keyValidation.tier,
      apiKey,
      priority: keyValidation.tier === 'WHALE' ? 'highest' : 
                keyValidation.tier === 'MASTER' ? 'enterprise' : 'high'
    };
  }
  
  next();
};

/**
 * 🎯 Apply Trial Delay Middleware
 * Adiciona delay para usuários Trial
 */
const trialDelayMiddleware = async (req, res, next) => {
  if (req.trialDelay && req.trialDelay > 0) {
    console.log(`[MASTER_KEY] ⏱️ Trial delay: ${req.trialDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, req.trialDelay));
  }
  next();
};

/**
 * 📊 Get Trial Status Endpoint
 */
const getTrialStatus = async (req, res) => {
  const apiKey = req.headers['x-gxeon-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'KEY_REQUIRED',
      message: 'X-GXEON-KEY header required'
    });
  }
  
  const keyValidation = validateKeyFormat(apiKey);
  
  if (!keyValidation.valid) {
    return res.status(400).json({
      error: 'INVALID_KEY',
      message: 'Invalid API key format'
    });
  }
  
  if (keyValidation.tier === 'TRIAL') {
    const status = await isTrialActive(apiKey);
    return res.json({
      protocol: 'PANDORA_MASTER_KEY_v1.0',
      tier: 'TRIAL',
      ...status
    });
  }
  
  // PRO/WHALE/MASTER
  return res.json({
    protocol: 'PANDORA_MASTER_KEY_v1.0',
    tier: keyValidation.tier,
    active: true,
    features: keyValidation.tier === 'PRO' ? 
      ['realtime_mempool', 'priority_signals', 'arbitrage'] :
      keyValidation.tier === 'WHALE' ?
      ['raw_mempool', 'mev_bundles', 'flash_loan_leads'] :
      ['enterprise', 'white_label', 'dedicated_nodes']
  });
};

/**
 * 🚀 Ativar Trial Endpoint
 */
const activateTrialEndpoint = async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  
  // Verificar se IP já tem Trial ativo
  try {
    const { data: existing } = await supabase
      .from('trial_registry')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('active', true)
      .single();
    
    if (existing) {
      return res.status(409).json({
        protocol: 'PANDORA_MASTER_KEY_v1.0',
        error: 'TRIAL_ALREADY_ACTIVE',
        message: 'Trial already activated for this IP',
        api_key: existing.api_key,
        expires_at: existing.expires_at,
        calls_remaining: TRIAL_CONFIG.maxCalls - existing.calls_used
      });
    }
  } catch (e) {
    // Continue
  }
  
  const trial = await activateTrial(ipAddress, userAgent);
  
  if (trial.success) {
    return res.status(201).json({
      protocol: 'PANDORA_MASTER_KEY_v1.0',
      status: 'TRIAL_ACTIVATED',
      api_key: trial.apiKey,
      tier: 'TRIAL',
      activated_at: trial.activatedAt,
      expires_at: trial.expiresAt,
      max_calls: trial.maxCalls,
      features: trial.features,
      signal_delay_seconds: trial.delaySeconds,
      message: '24h Atomic Trial activated successfully. No credit card required.',
      documentation: 'https://gxeon-ai.xmentex2.replit.app/docs/master-key'
    });
  }
  
  return res.status(500).json({
    error: 'ACTIVATION_FAILED',
    message: trial.error || 'Failed to activate trial'
  });
};

module.exports = {
  masterKeyMiddleware,
  trialDelayMiddleware,
  getTrialStatus,
  activateTrialEndpoint,
  generateTrialKey,
  validateKeyFormat,
  isTrialActive,
  activateTrial,
  KEY_PREFIXES,
  TRIAL_CONFIG
};
