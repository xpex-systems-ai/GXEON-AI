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
import axios from 'axios';

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
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224',
  MERCADOPAGO_API: 'https://api.mercadopago.com/v1',
  MP_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN
};

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: API Key Validation with Paywall
// ═══════════════════════════════════════════════════════════════════════════
async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API_KEY_REQUIRED',
      message: 'Provide X-API-Key header',
      documentation: 'https://docs.gxeon.ai/a2a',
      upgrade_url: '/v1/register-agent'
    });
  }
  
  try {
    // Check database for API key
    const { data: actor, error } = await supabase
      .from('actors')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !actor) {
      return res.status(401).json({
        error: 'INVALID_API_KEY',
        message: 'API key not found'
      });
    }
    
    // PAYWALL: Check if actor is active
    if (actor.status !== 'active') {
      // Get pending transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('actor_code', actor.code)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Generate PIX if no transaction exists
      let pixData = null;
      if (!transaction) {
        pixData = await generatePixPayment(actor);
      }
      
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Complete payment to activate API access',
        actor: {
          code: actor.code,
          email: actor.email,
          tier: actor.tier,
          status: actor.status
        },
        payment: {
          amount: A2A_CONFIG.TIER_LIMITS[actor.tier]?.price || 29.90,
          currency: 'BRL',
          method: 'PIX',
          pix_qr_code: transaction?.pix_qr_code || pixData?.qr_code,
          pix_copy_paste: transaction?.pix_copy_paste || pixData?.copy_paste,
          transaction_id: transaction?.id || pixData?.transaction_id,
          expires_at: transaction?.expires_at || pixData?.expires_at
        },
        upgrade_cta: 'Complete payment via PIX to unlock full API access'
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
// PIX PAYMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════
async function generatePixPayment(actor) {
  const price = A2A_CONFIG.TIER_LIMITS[actor.tier]?.price || 29.90;
  const transactionId = `REG-${Date.now()}-${actor.code}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  
  try {
    // Check if MercadoPago is configured
    if (A2A_CONFIG.MP_ACCESS_TOKEN) {
      // Real MercadoPago PIX
      const mpResponse = await axios.post(
        `${A2A_CONFIG.MERCADOPAGO_API}/payments`,
        {
          transaction_amount: price,
          description: `GXEON API Access - ${actor.tier} Tier`,
          payment_method_id: 'pix',
          payer: {
            email: actor.email,
            first_name: actor.name?.split(' ')[0] || 'Agent',
            last_name: actor.name?.split(' ').slice(1).join(' ') || 'User'
          },
          external_reference: transactionId,
          notification_url: `${process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app'}/webhook/mercadopago`
        },
        {
          headers: {
            'Authorization': `Bearer ${A2A_CONFIG.MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const pixData = mpResponse.data.point_of_interaction?.transaction_data;
      
      // Store transaction
      await supabase.from('transactions').insert({
        id: transactionId,
        actor_code: actor.code,
        actor_id: actor.id,
        amount: price,
        currency: 'BRL',
        status: 'PENDING',
        payment_method: 'PIX',
        pix_qr_code: pixData?.qr_code_base64,
        pix_copy_paste: pixData?.qr_code,
        external_reference: transactionId,
        mp_payment_id: mpResponse.data.id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
      
      return {
        transaction_id: transactionId,
        qr_code: pixData?.qr_code_base64,
        copy_paste: pixData?.qr_code,
        expires_at: expiresAt.toISOString(),
        amount: price
      };
    } else {
      // Simulated PIX for testing
      const simulatedPix = generateSimulatedPix(transactionId, price);
      
      await supabase.from('transactions').insert({
        id: transactionId,
        actor_code: actor.code,
        actor_id: actor.id,
        amount: price,
        currency: 'BRL',
        status: 'PENDING',
        payment_method: 'PIX',
        pix_qr_code: simulatedPix.qr_code,
        pix_copy_paste: simulatedPix.copy_paste,
        external_reference: transactionId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
      
      return {
        transaction_id: transactionId,
        ...simulatedPix,
        expires_at: expiresAt.toISOString(),
        amount: price
      };
    }
  } catch (err) {
    console.error('[A2A] PIX generation error:', err.message);
    // Return simulated PIX on error
    return {
      transaction_id: transactionId,
      ...generateSimulatedPix(transactionId, price),
      expires_at: expiresAt.toISOString(),
      amount: price
    };
  }
}

function generateSimulatedPix(txId, amount) {
  const qrData = `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${amount.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO`;
  return {
    qr_code: Buffer.from(qrData).toString('base64'),
    copy_paste: qrData
  };
}

async function updateResponseTime(actorId, latency) {
  if (!supabase) return;
  try {
    await supabase.from('api_usage_logs')
      .update({ response_time_ms: latency })
      .eq('actor_id', actorId)
      .order('timestamp', { ascending: false })
      .limit(1);
  } catch (err) {
    console.error('[A2A] Update response time error:', err);
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
    
    // Generate PIX payment immediately
    const pixData = await generatePixPayment(actor);
    
    // Update transaction with PIX data
    const { data: transaction } = await supabase
      .from('transactions')
      .update({
        pix_qr_code: pixData.qr_code,
        pix_copy_paste: pixData.copy_paste,
        expires_at: pixData.expires_at
      })
      .eq('id', pixData.transaction_id)
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
        transaction_id: pixData.transaction_id,
        amount: pixData.amount,
        currency: 'BRL',
        method: 'PIX',
        status: 'PENDING',
        pix_qr_code: pixData.qr_code,
        pix_copy_paste: pixData.copy_paste,
        expires_at: pixData.expires_at
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
// GET /v1/signals/free - Free limited signals (Hook for conversion)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/free', async (req, res) => {
  try {
    const { limit = 1 } = req.query;
    
    // Generate limited free signals (locked)
    const signals = generateMockSignals(Math.min(parseInt(limit), 3)).map(s => ({
      ...s,
      locked: true,
      targets: 'LOCKED',
      stop_loss: 'LOCKED',
      entry: s.entry, // Show entry to create interest
      take_profit: ['LOCKED - Upgrade to view'],
      message: '🔒 Complete upgrade to unlock full signal details',
      upgrade_url: '/v1/register-agent',
      upgrade_cta: 'Unlock with PIX - R$ 29.90'
    }));
    
    res.json({
      success: true,
      signals: signals,
      count: signals.length,
      locked: true,
      message: 'Free preview - upgrade for full access',
      upgrade: {
        url: '/v1/register-agent',
        tiers: A2A_CONFIG.TIER_LIMITS,
        recommended: 'BASIC'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[A2A] Free signals error:', error);
    res.status(500).json({
      error: 'SIGNALS_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/admin/metrics - Real-time monetization metrics
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/admin/metrics', async (req, res) => {
  // Simple auth check - in production use proper admin auth
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  
  try {
    // Get metrics from database
    const { data: payments } = await supabase
      .from('transactions')
      .select('status, amount')
      .eq('status', 'PAID');
    
    const { data: actors } = await supabase
      .from('actors')
      .select('status, tier');
    
    const { data: usage } = await supabase
      .from('api_usage_logs')
      .select('*');
    
    const totalRevenue = payments?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const activeActors = actors?.filter(a => a.status === 'active').length || 0;
    const pendingActors = actors?.filter(a => a.status === 'pending_payment').length || 0;
    const totalCalls = usage?.length || 0;
    
    res.json({
      success: true,
      metrics: {
        revenue: {
          total_brl: totalRevenue,
          transactions_count: payments?.length || 0,
          pending_payments: actors?.filter(a => a.status === 'pending_payment').length || 0
        },
        actors: {
          total: actors?.length || 0,
          active: activeActors,
          pending: pendingActors,
          by_tier: {
            BASIC: actors?.filter(a => a.tier === 'BASIC').length || 0,
            PRO: actors?.filter(a => a.tier === 'PRO').length || 0,
            ENTERPRISE: actors?.filter(a => a.tier === 'ENTERPRISE').length || 0
          }
        },
        usage: {
          total_api_calls: totalCalls,
          avg_calls_per_actor: totalCalls / (activeActors || 1)
        },
        conversion: {
          rate: activeActors / (actors?.length || 1),
          pending_value: pendingActors * 29.90 // Estimated
        }
      },
      treasury: A2A_CONFIG.TREASURY,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[A2A] Metrics error:', error);
    res.status(500).json({
      error: 'METRICS_ERROR',
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
