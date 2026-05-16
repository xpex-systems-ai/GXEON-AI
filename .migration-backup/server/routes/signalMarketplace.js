/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIGNAL MARKETPLACE API v1.0 - REST Endpoints
 * 
 * Endpoints:
 * - GET /v1/marketplace/signals - Lista sinais disponíveis
 * - POST /v1/marketplace/signals - Submeter novo sinal (providers)
 * - GET /v1/marketplace/signals/:id - Detalhes do sinal
 * - GET /v1/marketplace/leaderboard - Top sinais/providers
 * - POST /v1/marketplace/subscribe - Assinar plano
 * - POST /v1/marketplace/pay-per-signal - Comprar sinal premium
 * - GET /v1/marketplace/providers - Lista providers
 * - POST /v1/marketplace/webhook - Webhook para providers externos
 * - GET /v1/marketplace/cornix/:id - Formato Cornix
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import { marketplaceEngine } from '../services/signalMarketplaceEngine.js';
import { providerLayer, SIGNAL_SCHEMA } from '../services/signalProviderLayer.js';
import { marketplaceMonetization } from '../services/marketplaceMonetization.js';
import { proofOfValue } from '../services/proofOfValue.js';
import { distributionLayer } from '../services/distributionLayer.js';
import { acquisitionEngine } from '../services/acquisitionEngine.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE - Auth & Rate Limit
// ═══════════════════════════════════════════════════════════════════════════
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-gxeon-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Header X-API-Key is required'
    });
  }
  
  // Validate B2B client
  const client = distributionLayer.b2b.validateApiKey(apiKey);
  
  if (!client) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_API_KEY'
    });
  }
  
  // Check rate limit
  const rateCheck = distributionLayer.checkRateLimit(apiKey, client.tier);
  
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      retry_after: rateCheck.retry_after
    });
  }
  
  req.client = client;
  req.rate_limit = rateCheck;
  
  // Update last access
  distributionLayer.b2b.updateLastAccess(apiKey);
  
  next();
};

const authenticateUser = async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'USER_ID_REQUIRED'
    });
  }
  
  // Check access
  const access = await marketplaceMonetization.subscriptions.checkAccess(userId);
  
  if (!access.has_access) {
    return res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'No active subscription'
    });
  }
  
  req.user = {
    id: userId,
    tier: access.tier,
    access
  };
  
  next();
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNALS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/signals - Lista sinais disponíveis
 */
router.get('/signals', authenticateUser, async (req, res) => {
  try {
    const { 
      limit = 10, 
      category,
      strategy,
      pair,
      minConfidence,
      sort
    } = req.query;
    
    const result = await marketplaceEngine.getSignalsForUser(
      req.user.id,
      req.user.tier,
      {
        limit: parseInt(limit),
        category,
        strategy,
        pair,
        minConfidence: minConfidence ? parseInt(minConfidence) : undefined,
        sort
      }
    );
    
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    // Increment usage
    await marketplaceMonetization.subscriptions.incrementUsage(req.user.id);
    
    res.json({
      success: true,
      meta: {
        user_tier: req.user.tier,
        rate_limit: req.rate_limit,
        delivered: result.signals.length,
        total_available: result.meta.total_available,
        has_more: result.meta.has_more,
        upgrade_prompt: result.meta.upgrade_prompt
      },
      data: result.signals
    });
    
  } catch (error) {
    console.error('[API] Error listing signals:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/signals/live - B2B Real-time feed
 */
router.get('/signals/live', authenticateApiKey, async (req, res) => {
  try {
    const { format = 'standard' } = req.query;
    
    // Get active signals
    const signals = Array.from(marketplaceEngine.activeSignals.values())
      .filter(s => s.status === 'active')
      .sort((a, b) => (b.ranking?.total || 0) - (a.ranking?.total || 0))
      .slice(0, 50);
    
    // Format based on request
    let formattedSignals = signals;
    
    if (format === 'cornix') {
      formattedSignals = signals.map(s => distributionLayer.cornix.format(s));
    }
    
    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        format,
        signals_count: signals.length,
        client_tier: req.client.tier
      },
      data: formattedSignals
    });
    
  } catch (error) {
    console.error('[API] Error in live feed:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/signals/:id - Detalhes do sinal
 */
router.get('/signals/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const signal = marketplaceEngine.activeSignals.get(id) || 
                   await marketplaceEngine.supabase
                     .from('unified_signals')
                     .select('*')
                     .eq('signal_id', id)
                     .single();
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'SIGNAL_NOT_FOUND'
      });
    }
    
    // Get profit simulator
    const simulation = proofOfValue.simulator.simulate(signal, 1000);
    
    // Check if user can access
    const tierConfig = { FREE: ['FREE'], PRO: ['FREE', 'PRO'], ENTERPRISE: ['FREE', 'PRO', 'ENTERPRISE'] };
    const canAccess = tierConfig[req.user.tier]?.includes(signal.tier_access);
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'TIER_TOO_LOW',
        message: `This signal requires ${signal.tier_access} tier`,
        upgrade: {
          to_tier: signal.tier_access,
          price: signal.tier_access === 'PRO' ? 25 : 250
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        signal,
        simulation,
        tracking: proofOfValue.tracker.getTracking(signal.id)
      }
    });
    
  } catch (error) {
    console.error('[API] Error getting signal:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /v1/marketplace/signals - Submeter novo sinal (providers)
 */
router.post('/signals', async (req, res) => {
  try {
    const { signal, provider_api_key } = req.body;
    
    if (!signal || !provider_api_key) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS'
      });
    }
    
    // Validate provider
    const provider = providerLayer.getProviderByApiKey(provider_api_key);
    
    if (!provider) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_PROVIDER_KEY'
      });
    }
    
    if (!provider.isActive) {
      return res.status(403).json({
        success: false,
        error: 'PROVIDER_INACTIVE'
      });
    }
    
    // Validate signal schema
    const validation = provider.validateSignal(signal);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SIGNAL',
        details: validation.errors
      });
    }
    
    // Normalize and process
    const normalized = provider.normalizeSignal(signal);
    
    // Save to database
    const result = await providerLayer.processSignal(provider, normalized, 'api');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    // Send to marketplace engine
    await marketplaceEngine.receiveSignal({
      ...normalized,
      id: result.id
    });
    
    res.status(201).json({
      success: true,
      data: {
        signal_id: result.signal_id,
        tier_access: result.tier_access,
        ranking: normalized.ranking
      }
    });
    
  } catch (error) {
    console.error('[API] Error submitting signal:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/leaderboard - Top sinais e providers
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { 
      period = 'daily', 
      category = 'top_signals',
      limit = 10 
    } = req.query;
    
    const leaderboard = await proofOfValue.leaderboard.getLeaderboard(
      period,
      category,
      parseInt(limit)
    );
    
    // Get top providers as well
    const topProviders = await marketplaceEngine.getTopProviders(5);
    
    res.json({
      success: true,
      meta: {
        period,
        category,
        calculated_at: new Date().toISOString()
      },
      data: {
        [category]: leaderboard,
        top_providers: topProviders.providers
      }
    });
    
  } catch (error) {
    console.error('[API] Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/providers - Lista providers
 */
router.get('/providers', async (req, res) => {
  try {
    const { type, verified, sortBy } = req.query;
    
    const providers = providerLayer.listProviders({
      type,
      verified: verified === 'true',
      sortBy
    });
    
    res.json({
      success: true,
      count: providers.length,
      data: providers
    });
    
  } catch (error) {
    console.error('[API] Error listing providers:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /v1/marketplace/providers - Registrar novo provider
 */
router.post('/providers', async (req, res) => {
  try {
    const { name, email, webhookUrl, revenueShare } = req.body;
    
    const result = await providerLayer.registerProvider({
      name,
      email,
      webhookUrl,
      revenueShare: revenueShare || 30,
      type: 'external'
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('[API] Error registering provider:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MONETIZATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /v1/marketplace/subscribe - Assinar plano
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, email, tier, pixData } = req.body;
    
    const result = await marketplaceMonetization.subscriptions.createSubscription(
      userId,
      email,
      tier,
      pixData
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('[API] Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /v1/marketplace/pay-per-signal - Comprar sinal premium
 */
router.post('/pay-per-signal', authenticateUser, async (req, res) => {
  try {
    const { signalId } = req.body;
    
    const result = await marketplaceMonetization.payPerSignal.chargeForSignal(
      req.user.id,
      signalId
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('[API] Error charging for signal:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/pricing - Tabela de preços
 */
router.get('/pricing', async (req, res) => {
  res.json({
    success: true,
    data: {
      subscriptions: {
        FREE: { monthly: 0, signals_per_day: 5, delay_minutes: 10 },
        PRO: { monthly: 25, signals_per_day: 100, delay_minutes: 0 },
        ENTERPRISE: { monthly: 250, signals_per_day: 1000, delay_minutes: 0, api_access: true }
      },
      pay_per_signal: {
        PREMIUM: 1.00,
        STANDARD: 0.50
      },
      b2b: {
        STARTER: { monthly: 500, signals_per_month: 1000 },
        GROWTH: { monthly: 1500, signals_per_month: 5000 },
        ENTERPRISE: { monthly: 5000, signals_per_month: 50000 }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /v1/marketplace/webhook - Webhook para providers externos
 */
router.post('/webhook/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const payload = req.body;
    const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
    
    const result = await providerLayer.handleWebhookRequest(
      providerId,
      payload,
      signature
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('[API] Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /v1/marketplace/webhooks/configure - Configurar webhook B2B
 */
router.post('/webhooks/configure', authenticateApiKey, async (req, res) => {
  try {
    const { webhookUrl, events } = req.body;
    
    // Update client webhook
    await distributionLayer.supabase
      .from('b2b_clients')
      .update({
        webhook_url: webhookUrl,
        webhook_events: events || ['signal_new', 'signal_result']
      })
      .eq('id', req.client.id);
    
    res.json({
      success: true,
      message: 'Webhook configured',
      webhook_url: webhookUrl,
      events: events || ['signal_new', 'signal_result']
    });
    
  } catch (error) {
    console.error('[API] Error configuring webhook:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CORNIX ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/cornix/:id - Sinal em formato Cornix
 */
router.get('/cornix/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { exchange = 'Binance', leverage = 1 } = req.query;
    
    // Get signal
    const signal = marketplaceEngine.activeSignals.get(id);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'SIGNAL_NOT_FOUND'
      });
    }
    
    // Format for Cornix
    const cornixFormat = distributionLayer.cornix.format(signal, {
      exchange,
      leverage: parseInt(leverage)
    });
    
    res.json({
      success: true,
      data: cornixFormat
    });
    
  } catch (error) {
    console.error('[API] Error formatting for Cornix:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/cornix - Lista sinais em formato Cornix
 */
router.get('/cornix', authenticateUser, async (req, res) => {
  try {
    const { limit = 10, exchange = 'Binance' } = req.query;
    
    const signals = await marketplaceEngine.getSignalsForUser(
      req.user.id,
      req.user.tier,
      { limit: parseInt(limit) }
    );
    
    // Format for Cornix
    const cornixSignals = distributionLayer.cornix.formatBatch(signals.signals, { exchange });
    
    res.json({
      success: true,
      count: cornixSignals.length,
      data: cornixSignals
    });
    
  } catch (error) {
    console.error('[API] Error getting Cornix signals:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL & ACQUISITION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/referral/link - Gerar link de referral
 */
router.get('/referral/link', authenticateUser, async (req, res) => {
  try {
    const result = await acquisitionEngine.referral.generateReferralLink(req.user.id);
    
    res.json(result);
    
  } catch (error) {
    console.error('[API] Error generating referral:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/referral/stats - Estatísticas de referral
 */
router.get('/referral/stats', authenticateUser, async (req, res) => {
  try {
    const stats = await acquisitionEngine.referral.getReferralStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('[API] Error getting referral stats:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS & HEALTH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /v1/marketplace/stats - Estatísticas do marketplace
 */
router.get('/stats', async (req, res) => {
  try {
    const engineStats = marketplaceEngine.getStats();
    const revenueStats = await marketplaceMonetization.getRevenueStats('daily');
    const proofStats = await proofOfValue.getStats();
    const acquisitionStats = await acquisitionEngine.getStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        engine: engineStats,
        revenue: revenueStats,
        proof_of_value: proofStats,
        acquisition: acquisitionStats
      }
    });
    
  } catch (error) {
    console.error('[API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /v1/marketplace/health - Health check
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    services: {
      engine: marketplaceEngine ? 'up' : 'down',
      providers: providerLayer ? 'up' : 'down',
      monetization: marketplaceMonetization ? 'up' : 'down',
      proof: proofOfValue ? 'up' : 'down',
      distribution: distributionLayer ? 'up' : 'down',
      acquisition: acquisitionEngine ? 'up' : 'down'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
