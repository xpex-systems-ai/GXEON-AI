/**
 * 🌑 PANDORA PROTOCOL — STRICT ENFORCER
 * Zero tolerance for unpaid access
 * Machine-to-Machine billing enforcement
 * 
 * RULES:
 * - NO CREDIT = NO DATA (402 Payment Required)
 * - NO API KEY = 401 (No exceptions)
 * - Auto-scaling enabled via Redis queue
 * - Human interaction: DISABLED
 */

const supabase = require('../services/supabase');
const { deductCreditsAtomicDirect } = require('./gxeonEnforcerPg');

// 🚫 HUMAN DETECTION PATTERNS (Block humans, allow bots)
const HUMAN_PATTERNS = [
  /mozilla/i,
  /chrome/i,
  /safari/i,
  /firefox/i,
  /edge/i,
  /opera/i,
  /(mac|windows|linux).*\d+/i
];

/**
 * STRICT ENFORCER — M2M Only
 * No browser access allowed
 */
const gxeonEnforcerStrict = (costConfig = {}) => async (req, res, next) => {
  const apiKey = req.headers['x-gxeon-key'];
  const userAgent = req.headers['user-agent'] || '';
  
  // 🎯 Extract cost from config
  const costs = {
    sovereign_data: 0.05,
    sovereign_batch: 0.045,
    ...costConfig
  };
  
  // Get operation type from route
  const route = req.path;
  let operationCost = 0.05; // Default M2M cost
  
  if (route.includes('/batch')) operationCost = costs.sovereign_batch;
  else if (route.includes('/sovereign')) operationCost = costs.sovereign_data;
  else operationCost = costs.default || operationCost;

  // 🚫 HUMAN BLOCKING (M2M only)
  const isHuman = HUMAN_PATTERNS.some(pattern => pattern.test(userAgent));
  const isBotHeader = req.headers['x-agent-id'] || req.headers['x-bot-id'];
  
  if (isHuman && !isBotHeader && process.env.M2M_STRICT_MODE === 'true') {
    return res.status(403).json({
      error: 'GXEON_M2M_ONLY',
      message: 'This endpoint is restricted to autonomous agents and bots. Browser access denied.',
      protocol: 'PANDORA_v2.2',
      human_detected: true,
      documentation: 'https://gxeon-ai.xmentex2.replit.app/docs/m2m'
    });
  }

  // 🔒 STRICT API KEY VALIDATION
  if (!apiKey) {
    return res.status(401).json({
      error: 'GXEON_AUTH_REQUIRED',
      message: 'API Key obrigatório. Header x-gxeon-key ausente.',
      protocol: 'PANDORA_v2.2',
      billing: 'STRICT'
    });
  }

  try {
    // 💰 ATOMIC CREDIT DEDUCTION (No data without payment)
    let deductionResult;
    
    try {
      // Try Supabase RPC first
      const { data, error: rpcError } = await supabase
        .rpc('deduct_credits_atomic', {
          p_api_key: apiKey,
          p_amount: operationCost,
          p_operation: `M2M:${route}`,
          p_request_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });

      if (rpcError && rpcError.message?.includes('schema cache')) {
        // Fallback to direct PostgreSQL
        deductionResult = await deductCreditsAtomicDirect(apiKey, operationCost, route);
      } else if (rpcError) {
        console.error('[PANDORA] RPC Error:', rpcError);
        return res.status(402).json({
          error: 'GXEON_BILLING_ERROR',
          message: 'Billing system failure. Contact administrator.',
          protocol: 'PANDORA_v2.2'
        });
      } else {
        deductionResult = data;
      }
    } catch (fallbackError) {
      console.error('[PANDORA] Deduction fallback error:', fallbackError);
      deductionResult = await deductCreditsAtomicDirect(apiKey, operationCost, route);
    }

    // 🚫 STRICT: No credit = No data
    if (!deductionResult || !deductionResult.success) {
      return res.status(402).json({
        error: 'GXEON_PAYMENT_REQUIRED',
        message: deductionResult?.message || 'Saldo insuficiente. Recarregue créditos.',
        required: operationCost,
        current_balance: deductionResult?.current_balance || 0,
        protocol: 'PANDORA_v2.2',
        purchase_url: 'https://gxeon-ai.xmentex2.replit.app/billing',
        tier_upgrade: 'https://gxeon-ai.xmentex2.replit.app/upgrade'
      });
    }

    // ✅ Attach billing info to request
    req.billing = {
      operation: route,
      cost: operationCost,
      remaining_balance: deductionResult.new_balance,
      transaction_id: deductionResult.transaction_id,
      user_id: deductionResult.user_id,
      charged_at: new Date().toISOString(),
      enforcement: 'STRICT'
    };

    // 📊 Track for M2M analytics
    trackM2MRequest(apiKey, route, operationCost);

    next();
    
  } catch (error) {
    console.error('[PANDORA] Enforcement error:', error);
    return res.status(500).json({
      error: 'GXEON_ENFORCEMENT_ERROR',
      message: 'Billing enforcement failed.',
      protocol: 'PANDORA_v2.2'
    });
  }
};

/**
 * Track M2M request for analytics
 */
async function trackM2MRequest(apiKey, route, cost) {
  try {
    await supabase.from('m2m_request_log').insert({
      api_key_hash: apiKey.substring(0, 16) + '...',
      route,
      cost,
      timestamp: new Date().toISOString(),
      source: 'sovereign_api'
    });
  } catch (e) {
    // Non-blocking
  }
}

/**
 * 🎯 Auto-Scaling Middleware
 * Monitors load and adjusts rate limits dynamically
 */
const autoScalingMiddleware = async (req, res, next) => {
  const loadFactor = global.requestLoad || 1;
  
  // Adjust rate limits based on load
  if (loadFactor > 100) {
    res.set('X-Rate-Limit-Adjusted', 'true');
    res.set('X-Current-Load', loadFactor.toString());
    res.set('X-Recommended-Delay', '500'); // ms
  }
  
  // Track request for scaling metrics
  global.requestLoad = (global.requestLoad || 0) + 1;
  setTimeout(() => { global.requestLoad = Math.max(0, global.requestLoad - 1); }, 1000);
  
  next();
};

/**
 * 🚫 Strict Auth Only (no billing, just validation)
 */
const gxeonAuthOnlyStrict = async (req, res, next) => {
  const apiKey = req.headers['x-gxeon-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'GXEON_AUTH_REQUIRED',
      message: 'API Key obrigatório.',
      protocol: 'PANDORA_v2.2'
    });
  }
  
  try {
    const { data: user, error } = await supabase
      .from('gxeon_users')
      .select('id, tier, balance')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        error: 'GXEON_AUTH_INVALID',
        message: 'API Key inválida.',
        protocol: 'PANDORA_v2.2'
      });
    }
    
    req.user_id = user.id;
    req.user_tier = user.tier;
    req.user_balance = user.balance;
    next();
    
  } catch (error) {
    return res.status(500).json({
      error: 'GXEON_AUTH_ERROR',
      message: 'Authentication system error.',
      protocol: 'PANDORA_v2.2'
    });
  }
};

module.exports = {
  gxeonEnforcerStrict,
  autoScalingMiddleware,
  gxeonAuthOnlyStrict
};
