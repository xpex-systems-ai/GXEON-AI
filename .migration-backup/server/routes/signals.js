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

// ═══════════════════════════════════════════════════════════════════════════
// CORNIX INTEGRATION ENDPOINTS - Trading Signal Monetization
// ═══════════════════════════════════════════════════════════════════════════

import { cornixService } from '../services/cornixService.js';

// GET /v1/signals/cornix-ready - Get signals in Cornix format (free preview)
router.get('/v1/signals/cornix-ready', async (req, res) => {
  try {
    const { symbol, side, limit = 10 } = req.query;
    
    const supabase = (await import('../services/supabase.js')).default;
    
    let query = supabase
      .from('cornix_signals')
      .select('id, signal_id, symbol, side, entry_price, entry_range_low, entry_range_high, leverage, margin_type, is_premium, unlock_price_brl, status, expires_at, strategy, timeframe, confidence_score, created_at')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (symbol) {
      query = query.ilike('symbol', `%${symbol.toUpperCase()}%`);
    }
    if (side) {
      query = query.eq('side', side.toUpperCase());
    }
    
    const { data: signals, error } = await query;
    
    if (error) throw error;
    
    // Format as free preview (targets and stop hidden)
    const freeSignals = (signals || []).map(signal => ({
      ...signal,
      targets: 'LOCKED',
      stop_loss: 'LOCKED',
      unlock_status: signal.is_premium ? 'PREMIUM' : 'FREE',
      cornix_url: signal.is_premium 
        ? `/v1/signals/${signal.id}/pay`
        : null
    }));
    
    res.json({
      success: true,
      signals: freeSignals,
      count: freeSignals.length,
      timestamp: new Date().toISOString(),
      message: 'Use /v1/signals/:id/pay para desbloquear sinais premium via PIX'
    });
    
  } catch (error) {
    console.error('[CORNIX] Error fetching signals:', error);
    res.status(500).json({
      error: 'Failed to fetch signals',
      message: error.message
    });
  }
});

// GET /v1/signals/live - Public live signals (attracts bots)
router.get('/v1/signals/live', async (req, res) => {
  try {
    const supabase = (await import('../services/supabase.js')).default;
    
    // Return only recent active signals with minimal data
    const { data: signals, error } = await supabase
      .from('cornix_signals')
      .select('signal_id, symbol, side, entry_price, status, created_at, is_premium')
      .eq('status', 'ACTIVE')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    res.json({
      success: true,
      stream: 'live',
      signals: signals || [],
      count: signals?.length || 0,
      webhook_endpoint: '/v1/signals/webhook/subscribe',
      cornix_endpoint: '/v1/signals/cornix-ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CORNIX] Live stream error:', error);
    res.status(500).json({
      error: 'Live stream unavailable',
      message: error.message
    });
  }
});

// GET /v1/signals/:id/pay - Generate PIX payment for premium unlock
router.get('/v1/signals/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    const { cornixService } = await import('../services/cornixService.js');
    
    const pixData = await cornixService.createPixPayment(id, userId);
    
    if (pixData.already_paid) {
      return res.json({
        success: true,
        already_paid: true,
        full_signal_url: `/v1/signals/${id}/full`,
        message: pixData.message
      });
    }
    
    res.json({
      success: true,
      payment: {
        method: 'PIX',
        amount_brl: pixData.amount,
        qr_code: pixData.qr_code,
        copy_paste: pixData.copy_paste,
        expires_at: pixData.expires_at,
        tx_id: pixData.tx_id
      },
      check_status_url: pixData.check_url,
      signal_preview: pixData.signal_preview,
      instructions: [
        '1. Abra seu aplicativo bancário',
        '2. Escaneie o QR Code ou cole o código PIX',
        `3. Confirme o pagamento de R$ ${pixData.amount}`,
        '4. O sinal será desbloqueado automaticamente'
      ]
    });
    
  } catch (error) {
    console.error('[CORNIX] PIX generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PIX',
      message: error.message
    });
  }
});

// GET /v1/signals/pix-status/:txId - Check PIX payment status
router.get('/v1/signals/pix-status/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    const { cornixService } = await import('../services/cornixService.js');
    
    const status = await cornixService.checkPixStatus(txId, userId);
    
    res.json({
      success: true,
      status: status.status,
      ...(status.access_granted && {
        access_granted: true,
        full_signal_url: status.full_signal_url
      }),
      message: status.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CORNIX] PIX status error:', error);
    res.status(500).json({
      error: 'Failed to check PIX status',
      message: error.message
    });
  }
});

// GET /v1/signals/:id/full - Get full signal after payment
router.get('/v1/signals/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    const { cornixService } = await import('../services/cornixService.js');
    
    const signal = await cornixService.getFullSignal(id, userId);
    
    if (signal.access_status === 'LOCKED') {
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: signal.message,
        payment_url: signal.pix_payment_url,
        amount_brl: signal.unlock_price_brl
      });
    }
    
    res.json({
      success: true,
      access_status: signal.access_status,
      signal: signal,
      cornix_format: {
        symbol: signal.symbol,
        side: signal.side,
        entry: signal.entry_range_low && signal.entry_range_high
          ? [signal.entry_range_low, signal.entry_range_high]
          : signal.entry_price,
        targets: signal.targets || [
          signal.target_1,
          signal.target_2,
          signal.target_3,
          signal.target_4,
          signal.target_5
        ].filter(Boolean),
        stop: signal.stop_loss,
        leverage: signal.leverage
      }
    });
    
  } catch (error) {
    console.error('[CORNIX] Full signal error:', error);
    res.status(500).json({
      error: 'Failed to fetch signal',
      message: error.message
    });
  }
});

// POST /v1/signals - Create new signal (internal/scanner use)
router.post('/v1/signals', async (req, res) => {
  try {
    // Check internal auth
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { cornixService } = await import('../services/cornixService.js');
    
    const signal = await cornixService.createSignal(req.body);
    
    res.status(201).json({
      success: true,
      signal_id: signal.signal_id,
      symbol: signal.symbol,
      side: signal.side,
      is_premium: signal.is_premium,
      public_url: `/v1/signals/${signal.id}`,
      cornix_ready: `/v1/signals/cornix-ready`,
      webhook_triggered: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CORNIX] Create signal error:', error);
    res.status(500).json({
      error: 'Failed to create signal',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /v1/leaderboard - Public leaderboard
router.get('/v1/leaderboard', async (req, res) => {
  try {
    const { period = 'MONTHLY', limit = 50 } = req.query;
    
    const { cornixService } = await import('../services/cornixService.js');
    
    const leaderboard = await cornixService.getLeaderboard(period.toUpperCase(), parseInt(limit));
    
    res.json({
      success: true,
      period: period.toUpperCase(),
      count: leaderboard.length,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: entry.rank_position || index + 1,
        entity: {
          type: entry.entity_type,
          id: entry.entity_id,
          name: entry.entity_name
        },
        stats: {
          total_signals: entry.total_signals,
          win_rate: `${entry.win_rate}%`,
          profit_percent: entry.total_profit_percent,
          profit_factor: entry.profit_factor,
          wins: entry.win_count,
          losses: entry.loss_count
        },
        verified: entry.verified_trades > 0
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CORNIX] Leaderboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
});

// POST /v1/signals/:id/performance - Record signal performance
router.post('/v1/signals/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check internal auth
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { cornixService } = await import('../services/cornixService.js');
    
    await cornixService.recordPerformance(id, req.body);
    
    res.json({
      success: true,
      signal_id: id,
      result: req.body.result,
      recorded: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CORNIX] Performance record error:', error);
    res.status(500).json({
      error: 'Failed to record performance',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// POST /v1/signals/webhook/subscribe - Subscribe to signal webhooks
router.post('/v1/signals/webhook/subscribe', async (req, res) => {
  try {
    const { webhook_url, webhook_secret, symbols, signal_types, min_confidence } = req.body;
    const userId = req.headers['x-user-id'] || req.headers['x-api-key'] || 'anonymous';
    
    if (!webhook_url) {
      return res.status(400).json({
        error: 'WEBHOOK_URL_REQUIRED',
        message: 'webhook_url is required'
      });
    }
    
    const supabase = (await import('../services/supabase.js')).default;
    
    const { data: webhook, error } = await supabase
      .from('cornix_user_webhooks')
      .upsert({
        user_id: userId,
        webhook_url,
        webhook_secret,
        symbols: symbols || [],
        signal_types: signal_types || ['LONG', 'SHORT'],
        min_confidence: min_confidence || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,webhook_url' })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.webhook_url,
        symbols: webhook.symbols,
        is_active: webhook.is_active
      },
      message: 'Webhook subscribed successfully',
      test_url: '/v1/signals/webhook/test'
    });
    
  } catch (error) {
    console.error('[CORNIX] Webhook subscribe error:', error);
    res.status(500).json({
      error: 'Failed to subscribe webhook',
      message: error.message
    });
  }
});

// POST /v1/signals/webhook/test - Test webhook delivery
router.post('/v1/signals/webhook/test', async (req, res) => {
  try {
    const { webhook_url, webhook_secret } = req.body;
    
    if (!webhook_url) {
      return res.status(400).json({
        error: 'WEBHOOK_URL_REQUIRED',
        message: 'webhook_url is required'
      });
    }
    
    // Send test payload
    const testPayload = {
      test: true,
      message: 'Test signal from GXEON',
      timestamp: new Date().toISOString(),
      cornix_format: {
        symbol: 'BTCUSDT',
        side: 'LONG',
        entry: 65000,
        targets: [66000, 67000],
        stop: 64000,
        leverage: 10
      }
    };
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cornix-Test': 'true',
        'X-Signature': webhook_secret 
          ? require('crypto').createHmac('sha256', webhook_secret).update(JSON.stringify(testPayload)).digest('hex')
          : undefined
      },
      body: JSON.stringify(testPayload),
      timeout: 10000
    });
    
    const responseBody = await response.text();
    
    res.json({
      success: response.ok,
      status: response.status,
      response: responseBody,
      message: response.ok ? 'Webhook test successful' : 'Webhook test failed'
    });
    
  } catch (error) {
    console.error('[CORNIX] Webhook test error:', error);
    res.status(500).json({
      error: 'Webhook test failed',
      message: error.message
    });
  }
});

export default router;
