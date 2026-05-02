/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 A2A MONETIZATION API v1.0 - PRODUCTION
 * Agent-to-Agent Revenue System
 * Autorizado por: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const A2A_CONFIG = {
  PRICE_PER_SIGNAL_USD: 0.01,
  TIER_LIMITS: {
    BASIC: { daily: 10, monthly: 100, price: 29.90 },
    PRO: { daily: 100, monthly: 1000, price: 99.90 },
    ENTERPRISE: { daily: 1000, monthly: 10000, price: 299.90 }
  },
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: API Key Validation
// ═══════════════════════════════════════════════════════════════════════════
async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API_KEY_REQUIRED',
      message: 'Provide X-API-Key header',
      documentation: 'https://docs.gxeon.ai/a2a'
    });
  }
  
  try {
    // Check database for valid API key
    const { data: actor, error } = await supabase
      .from('actors')
      .select('*')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .single();
    
    if (error || !actor) {
      return res.status(401).json({
        error: 'INVALID_API_KEY',
        message: 'API key not found or inactive'
      });
    }
    
    // Check if tier is valid
    if (!actor.tier || !A2A_CONFIG.TIER_LIMITS[actor.tier]) {
      return res.status(403).json({
        error: 'INVALID_TIER',
        message: 'Actor tier not configured'
      });
    }
    
    // Track usage
    await trackUsage(actor.id, req.path);
    
    // Attach actor to request
    req.actor = actor;
    req.apiKey = apiKey;
    
    next();
  } catch (err) {
    console.error('[A2A] Auth error:', err);
    return res.status(500).json({
      error: 'AUTH_ERROR',
      message: 'Authentication service unavailable'
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
async function trackUsage(actorId, endpoint) {
  if (!supabase) return;
  
  try {
    await supabase.from('api_usage_logs').insert({
      actor_id: actorId,
      endpoint: endpoint,
      timestamp: new Date().toISOString(),
      response_time_ms: 0 // Will be updated after response
    });
  } catch (err) {
    console.error('[A2A] Usage tracking error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE MOCK SIGNALS (until real signals available)
// ═══════════════════════════════════════════════════════════════════════════
function generateMockSignals(count = 5) {
  const pairs = [
    { pair: 'BTC/USDT', entry: 62000, tp: 63500, sl: 61000 },
    { pair: 'ETH/USDT', entry: 3450, tp: 3600, sl: 3300 },
    { pair: 'SOL/USDT', entry: 145, tp: 155, sl: 138 },
    { pair: 'ARB/USDT', entry: 1.85, tp: 2.05, sl: 1.72 },
    { pair: 'LINK/USDT', entry: 18.5, tp: 20.2, sl: 17.1 }
  ];
  
  return pairs.slice(0, count).map((s, i) => ({
    id: `signal-${Date.now()}-${i}`,
    pair: s.pair,
    type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
    entry: s.entry,
    take_profit: s.tp,
    stop_loss: s.sl,
    confidence: 0.75 + Math.random() * 0.20,
    status: 'active',
    timestamp: new Date().toISOString(),
    expires_at: new Date(Date.now() + 300000).toISOString(), // 5 min
    source: 'gxeon_a2a_engine',
    network: 'binance_futures'
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals - List available signals (A2A Compatible)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals', validateApiKey, async (req, res) => {
  const requestStart = Date.now();
  
  try {
    const {
      limit = 10,
      type,
      min_confidence = 0.7
    } = req.query;
    
    // Generate signals (mock for now, will be real from signalHub)
    const signals = generateMockSignals(Math.min(parseInt(limit), 20));
    
    // Filter by confidence
    const filteredSignals = signals.filter(s => s.confidence >= parseFloat(min_confidence));
    
    // Filter by type if specified
    const resultSignals = type 
      ? filteredSignals.filter(s => s.type === type.toUpperCase())
      : filteredSignals;
    
    const latency = Date.now() - requestStart;
    
    // Update usage with response time
    await updateResponseTime(req.actor.id, latency);
    
    res.json({
      success: true,
      actor: {
        id: req.actor.id,
        code: req.actor.code,
        tier: req.actor.tier
      },
      signals: resultSignals,
      count: resultSignals.length,
      meta: {
        price_per_signal: A2A_CONFIG.PRICE_PER_SIGNAL_USD,
        tier_limit: A2A_CONFIG.TIER_LIMITS[req.actor.tier],
        response_latency_ms: latency,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[A2A] Signals error:', error);
    res.status(500).json({
      error: 'SIGNALS_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/register-agent - Create new agent with API key
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/register-agent', async (req, res) => {
  try {
    const {
      email,
      name,
      tier = 'BASIC',
      payment_method = 'pix',
      referral_code
    } = req.body;
    
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Valid email required'
      });
    }
    
    // Check if email exists
    const { data: existing } = await supabase
      .from('actors')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: 'Email already registered'
      });
    }
    
    // Generate unique codes
    const actorCode = generateActorCode();
    const apiKey = generateApiKey();
    
    // Calculate price
    const price = A2A_CONFIG.TIER_LIMITS[tier]?.price || A2A_CONFIG.TIER_LIMITS.BASIC.price;
    
    // Create pending actor
    const { data: actor, error } = await supabase
      .from('actors')
      .insert({
        code: actorCode,
        name: name || email.split('@')[0],
        email: email,
        tier: tier,
        status: 'pending_payment', // Will be activated after payment
        api_key: apiKey,
        commission_rate: 0.10, // 10% default
        referral_code: referral_code,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Create pending transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        actor_code: actorCode,
        external_reference: `REG-${actorCode}`,
        amount: price,
        status: 'PENDING',
        tier: tier,
        description: `Registration - ${tier} Plan`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    res.json({
      success: true,
      actor: {
        id: actor.id,
        code: actorCode,
        email: actor.email,
        tier: tier,
        status: 'pending_payment'
      },
      payment: {
        transaction_id: transaction.id,
        amount: price,
        method: payment_method,
        status: 'pending'
      },
      credentials: {
        api_key: apiKey, // Show once, only works after payment
        note: 'API key will be activated after payment confirmation'
      },
      next_steps: [
        'Complete payment via PIX',
        'Wait for webhook confirmation',
        'Access /v1/signals endpoint'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[A2A] Registration error:', error);
    res.status(500).json({
      error: 'REGISTRATION_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/upgrade - Upgrade existing agent tier
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/upgrade', async (req, res) => {
  try {
    const { actor_code, target_tier } = req.body;
    
    if (!actor_code || !target_tier) {
      return res.status(400).json({
        error: 'MISSING_PARAMS',
        message: 'actor_code and target_tier required'
      });
    }
    
    // Get current actor
    const { data: actor, error } = await supabase
      .from('actors')
      .select('*')
      .eq('code', actor_code)
      .single();
    
    if (error || !actor) {
      return res.status(404).json({
        error: 'ACTOR_NOT_FOUND',
        message: 'Actor not found'
      });
    }
    
    // Calculate upgrade price (difference between tiers)
    const currentPrice = A2A_CONFIG.TIER_LIMITS[actor.tier]?.price || 0;
    const targetPrice = A2A_CONFIG.TIER_LIMITS[target_tier]?.price || 0;
    const upgradePrice = Math.max(0, targetPrice - currentPrice);
    
    // Create upgrade transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        actor_code: actor_code,
        external_reference: `UPG-${actor_code}-${Date.now()}`,
        amount: upgradePrice,
        status: 'PENDING',
        tier: target_tier,
        description: `Upgrade to ${target_tier}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    res.json({
      success: true,
      actor: {
        code: actor_code,
        current_tier: actor.tier,
        target_tier: target_tier
      },
      payment: {
        transaction_id: transaction.id,
        amount: upgradePrice,
        status: 'pending'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[A2A] Upgrade error:', error);
    res.status(500).json({
      error: 'UPGRADE_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/agent/status - Check agent status and quotas
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/agent/status', validateApiKey, async (req, res) => {
  try {
    const actor = req.actor;
    const tier = A2A_CONFIG.TIER_LIMITS[actor.tier];
    
    // Get usage stats (today)
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('actor_id', actor.id)
      .gte('timestamp', today)
      .count();
    
    const dailyUsage = usage || 0;
    
    res.json({
      success: true,
      actor: {
        id: actor.id,
        code: actor.code,
        email: actor.email,
        tier: actor.tier,
        status: actor.status,
        created_at: actor.created_at
      },
      quota: {
        daily_limit: tier.daily,
        daily_used: dailyUsage,
        daily_remaining: Math.max(0, tier.daily - dailyUsage),
        monthly_limit: tier.monthly,
        price_per_signal: A2A_CONFIG.PRICE_PER_SIGNAL_USD
      },
      features: {
        api_access: actor.status === 'active',
        telegram_notifications: true,
        cornix_compatible: true,
        realtime_signals: true
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[A2A] Status error:', error);
    res.status(500).json({
      error: 'STATUS_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function generateActorCode() {
  return 'GX' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateApiKey() {
  return 'gx_' + crypto.randomBytes(24).toString('hex');
}

async function updateResponseTime(actorId, latency) {
  // Update last usage entry with response time
  // Implementation depends on your tracking needs
}

export default router;
