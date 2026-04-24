/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIGNALS API v1.0 - Zero Capital Revenue Mode
 * Endpoints: /v1/signals, /v1/register
 * Auth: API_KEY
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import { signalHub } from '../services/signalHub.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: API Key Validation
// ═══════════════════════════════════════════════════════════════════════════
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Provide X-API-Key header or api_key query parameter',
      documentation: 'https://docs.gxeon.ai/signals'
    });
  }
  
  // Check if key is valid
  const isValid = signalHub.apiKeys.has(apiKey);
  if (!isValid) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid or has been revoked'
    });
  }
  
  // Check if key is active
  const keyData = signalHub.apiKeys.get(apiKey);
  if (!keyData.active) {
    return res.status(403).json({
      error: 'API key revoked',
      message: 'This API key has been deactivated'
    });
  }
  
  // Update last used
  keyData.lastUsed = Date.now();
  
  // Attach key data to request
  req.apiKey = apiKey;
  req.keyData = keyData;
  
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals - List available signals
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals', validateApiKey, async (req, res) => {
  try {
    const {
      network,
      min_profit,
      max_risk,
      min_confidence,
      limit,
      type
    } = req.query;
    
    // Build filters
    const filters = {
      network: network || null,
      minProfit: min_profit ? parseFloat(min_profit) : null,
      maxRisk: max_risk ? parseInt(max_risk) : null,
      minConfidence: min_confidence ? parseFloat(min_confidence) : null,
      limit: limit ? parseInt(limit) : 10,
      type: type || null
    };
    
    // Get signals from hub
    const result = await signalHub.getSignalsForApiKey(req.apiKey, filters);
    
    if (result.error) {
      return res.status(result.code || 500).json({
        error: result.error,
        api_key: req.apiKey.slice(0, 10) + '...'
      });
    }
    
    // Return signals
    res.json({
      success: true,
      signals: result.signals,
      count: result.count,
      quota: result.quota,
      price_per_signal: signalHub.config?.PRICE_PER_SIGNAL_USD || 0.01,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Signals API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals/:id - Get specific signal
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/:id', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get signal and mark as consumed
    const result = await signalHub.consumeSignal(req.apiKey, id);
    
    if (result.error) {
      return res.status(result.code || 500).json({
        error: result.error,
        signal_id: id
      });
    }
    
    res.json({
      success: true,
      signal: result.signal,
      remaining_quota: result.remainingQuota,
      charged: signalHub.config?.PRICE_PER_SIGNAL_USD || 0.01,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Signals API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/register - Create new API key
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/register', async (req, res) => {
  try {
    const { email, tier = 'BASIC', referral_code } = req.body;
    
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'A valid email address is required'
      });
    }
    
    // Validate tier
    const validTiers = ['BASIC', 'PRO', 'ENTERPRISE'];
    if (!validTiers.includes(tier.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: `Tier must be one of: ${validTiers.join(', ')}`
      });
    }
    
    // Check if email already exists
    for (const [key, data] of signalHub.apiKeys) {
      if (data.email === email) {
        return res.status(409).json({
          error: 'Email already registered',
          message: 'This email already has an API key',
          api_key: key.slice(0, 10) + '...'
        });
      }
    }
    
    // Create API key
    const result = await signalHub.createApiKey(email, tier.toUpperCase());
    
    if (referral_code) {
      // TODO: Track referral
      console.log(`[Signals API] Referral code used: ${referral_code}`);
    }
    
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      api_key: result.apiKey,
      tier: result.tier,
      limits: result.limits,
      price_per_signal: signalHub.config?.PRICE_PER_SIGNAL_USD || 0.01,
      documentation: 'https://docs.gxeon.ai/signals',
      quick_start: {
        list_signals: 'GET /v1/signals',
        auth_header: 'X-API-Key: ' + result.apiKey.slice(0, 10) + '...'
      }
    });
    
  } catch (error) {
    console.error('[Signals API] Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals/stats - Get signal hub statistics (public endpoint)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/stats', async (req, res) => {
  try {
    const stats = signalHub.getStats();
    
    res.json({
      success: true,
      stats: {
        active_signals: stats.activeSignals,
        total_api_keys: stats.totalApiKeys,
        total_signals_delivered: stats.revenue.totalSignals,
        total_revenue_usd: stats.revenue.totalRevenue.toFixed(2),
        today_signals: stats.revenue.today.signals,
        today_revenue_usd: stats.revenue.today.revenue.toFixed(2),
        price_per_signal_usd: stats.pricePerSignal,
        tier_limits: stats.tierLimits
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Signals API] Stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals/health - Health check
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SignalHub',
    version: '1.0.0',
    active_signals: signalHub.signals?.size || 0,
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /v1/signals/inject - Internal endpoint for scanners to inject signals
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/signals/inject', async (req, res) => {
  try {
    // Check internal auth
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const signalData = req.body;
    
    if (!signalData || typeof signalData !== 'object') {
      return res.status(400).json({ error: 'Invalid signal data' });
    }
    
    // Register signal
    const signal = await signalHub.registerSignal(signalData);
    
    res.status(201).json({
      success: true,
      signal_id: signal.id,
      registered: true,
      estimated_delivery: signalHub.apiKeys.size // Number of potential consumers
    });
    
  } catch (error) {
    console.error('[Signals API] Injection error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /v1/signals/pricing - Public pricing information
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/signals/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      per_signal_usd: 0.01,
      description: 'Pay per signal delivered',
      tiers: {
        BASIC: {
          daily_limit: 10,
          monthly_limit: 100,
          features: ['Real-time signals', 'Basic filtering']
        },
        PRO: {
          daily_limit: 100,
          monthly_limit: 1000,
          features: ['Real-time signals', 'Advanced filtering', 'Priority delivery', 'Telegram alerts']
        },
        ENTERPRISE: {
          daily_limit: 1000,
          monthly_limit: 10000,
          features: ['Unlimited signals', 'Custom filters', 'Webhook delivery', 'Telegram + Discord', 'API access', 'Dedicated support']
        }
      },
      notes: [
        'Only consumed signals are billed',
        'Unused quota does not roll over',
        'Upgrade tier anytime',
        'Cancel anytime'
      ]
    },
    example: {
      monthly_cost_basic: '$1.00 (100 signals)',
      monthly_cost_pro: '$10.00 (1000 signals)',
      monthly_cost_enterprise: '$100.00 (10000 signals)'
    }
  });
});

export default router;
