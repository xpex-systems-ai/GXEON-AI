const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

/**
 * GXEON Rate Limiter - Tiered Protection
 * 
 * Different limits based on user tier:
 * - Free: 10 requests/15min
 * - Basic: 100 requests/15min
 * - Pro: 500 requests/15min
 * - Enterprise: 2000 requests/15min
 * - Internal/System: 5000 requests/15min
 * 
 * Plus operation-specific limits for expensive operations
 */

// Redis client for distributed rate limiting (production)
const redisClient = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL)
    : null;

/**
 * Get user tier from database (called on each request)
 * Falls back to IP-based limiting if no API key
 */
async function getUserTier(req) {
    // If user_id is set by gxeonEnforcer, fetch tier from DB
    if (req.user_id) {
        try {
            const supabase = require('../services/supabase');
            const { data, error } = await supabase
                .from('users')
                .select('tier, rate_limit_override')
                .eq('id', req.user_id)
                .single();
            
            if (!error && data) {
                // Check for admin/system override
                if (data.rate_limit_override) return 'unlimited';
                return data.tier || 'free';
            }
        } catch (err) {
            console.error('[RateLimiter] Tier lookup failed:', err);
        }
    }
    
    // Check for system API key
    const apiKey = req.headers['x-gxeon-key'];
    if (apiKey === process.env.SYSTEM_API_KEY) {
        return 'internal';
    }
    
    return 'free'; // Default tier
}

// Tier configuration
const TIER_LIMITS = {
    free: { windowMs: 15 * 60 * 1000, max: 10 },
    basic: { windowMs: 15 * 60 * 1000, max: 100 },
    pro: { windowMs: 15 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 },
    internal: { windowMs: 15 * 60 * 1000, max: 5000 },
    unlimited: { windowMs: 15 * 60 * 1000, max: 999999 }
};

// Operation-specific limits (stricter for expensive operations)
const OPERATION_LIMITS = {
    onchain: { windowMs: 60 * 60 * 1000, max: 10 },      // 10/hour for blockchain
    llm: { windowMs: 60 * 1000, max: 30 },               // 30/min for LLM
    agent: { windowMs: 60 * 1000, max: 60 },             // 60/min for agents
    radar: { windowMs: 5 * 60 * 1000, max: 1 }           // 1/5min for radar scans
};

/**
 * Dynamic rate limiter that checks user tier
 */
const gxeonRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: async (req, res) => {
        const tier = await getUserTier(req);
        const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
        
        // Store tier for logging
        req.userTier = tier;
        
        return config.max;
    },
    handler: (req, res) => {
        res.status(429).json({
            error: "GXEON_LIMIT_EXCEEDED",
            message: "Limite de requisições excedido. Aguarde ou faça upgrade."
        });
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
    store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Operation-specific limiter for expensive operations
 */
function operationLimiter(operationType) {
    const config = OPERATION_LIMITS[operationType] || OPERATION_LIMITS.agent;
    
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        handler: (req, res) => {
            res.status(429).json({
                error: "GXEON_OPERATION_LIMIT",
                message: `Limite de operações ${operationType} excedido. Aguarde ${config.windowMs / 60000} minutos.`
            });
        },
        standardHeaders: true
    });
}

/**
 * Combined billing + rate limiter
 * Checks credits AND rate limits before execution
 */
async function combinedEnforcer(req, res, next) {
    // First: Check rate limit
    const tier = await getUserTier(req);
    const limit = TIER_LIMITS[tier]?.max || TIER_LIMITS.free.max;
    
    // Simple in-memory check (production: use Redis)
    const key = req.headers['x-gxeon-key'] || req.ip;
    const now = Date.now();
    
    if (!req.app.locals.rateMap) {
        req.app.locals.rateMap = new Map();
    }
    
    const userData = req.app.locals.rateMap.get(key) || { count: 0, resetTime: now + 15 * 60 * 1000 };
    
    if (now > userData.resetTime) {
        userData.count = 0;
        userData.resetTime = now + 15 * 60 * 1000;
    }
    
    userData.count++;
    req.app.locals.rateMap.set(key, userData);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - userData.count));
    res.setHeader('X-RateLimit-Reset', userData.resetTime);
    
    if (userData.count > limit) {
        return res.status(429).json({
            error: "GXEON_LIMIT_EXCEEDED",
            message: "Muitas requisições. O sistema está protegendo sua liquidez.",
            tier: tier,
            limit: limit,
            reset_at: new Date(userData.resetTime).toISOString()
        });
    }
    
    next();
}

/**
 * IP-based limiter for public endpoints (no API key required)
 */
const ipLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 requests per IP
    message: {
        error: "GXEON_IP_LIMIT",
        message: "Limite de requisições por IP excedido."
    },
    standardHeaders: true
});

/**
 * Webhook limiter (higher limits for automated systems)
 */
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000/minute for webhooks
    standardHeaders: true
});

// Basic export for simple usage
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { 
        error: "GXEON_LIMIT_EXCEEDED", 
        message: "Muitas requisições. O sistema está protegendo sua liquidez." 
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,                    // Basic 100/15min
    gxeonRateLimiter,              // Tier-based dynamic
    operationLimiter,              // Operation-specific
    combinedEnforcer,              // Billing-aware
    ipLimiter,                     // IP-based for public
    webhookLimiter,                // For webhooks
    getUserTier,                   // Helper
    TIER_LIMITS,                   // Config
    OPERATION_LIMITS               // Config
};
