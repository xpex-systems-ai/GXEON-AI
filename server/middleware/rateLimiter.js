const fs = require('fs');
const path = require('path');

function packageInstalled(name) {
    const parts = name.split('/');
    const packagePath = name.startsWith('@')
        ? path.join(process.cwd(), 'node_modules', parts[0], parts[1] || '', 'package.json')
        : path.join(process.cwd(), 'node_modules', name, 'package.json');
    return fs.existsSync(packagePath);
}

function createMemoryRateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const message = options.message || { error: 'GXEON_LIMIT_EXCEEDED' };
    const hits = new Map();

    return async (req, res, next) => {
        if (typeof options.skip === 'function' && options.skip(req)) return next();

        const key = req.headers?.['x-gxeon-key'] || req.ip || req.socket?.remoteAddress || 'anonymous';
        const now = Date.now();
        const current = hits.get(key) || { count: 0, resetTime: now + windowMs };
        if (now > current.resetTime) {
            current.count = 0;
            current.resetTime = now + windowMs;
        }

        current.count += 1;
        hits.set(key, current);

        const max = typeof options.max === 'function' ? await options.max(req, res) : (options.max || 100);
        if (options.standardHeaders) {
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', Math.max(0, max - current.count));
            res.setHeader('RateLimit-Reset', Math.ceil(current.resetTime / 1000));
        }

        if (current.count > max) {
            if (typeof options.handler === 'function') return options.handler(req, res, next);
            return res.status(429).json(message);
        }

        return next();
    };
}

const rateLimit = packageInstalled('express-rate-limit')
    ? require('express-rate-limit')
    : createMemoryRateLimit;
const RedisStore = packageInstalled('rate-limit-redis') ? require('rate-limit-redis') : null;
const Redis = packageInstalled('ioredis') ? require('ioredis') : null;

/**
 * GXEON Rate Limiter - Tiered Protection
 *
 * Falls back to a deterministic in-memory limiter when optional Redis-backed
 * rate-limit packages are not installed, preserving health and runtime APIs.
 */

// Redis client for distributed rate limiting (production)
const redisClient = process.env.REDIS_URL && Redis
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
    onchain: { windowMs: 60 * 60 * 1000, max: 10 },
    llm: { windowMs: 60 * 1000, max: 30 },
    agent: { windowMs: 60 * 1000, max: 60 },
    radar: { windowMs: 5 * 60 * 1000, max: 1 }
};

const optionalStore = redisClient && RedisStore ? { store: new RedisStore({ client: redisClient }) } : {};

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
    ...optionalStore,
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
    max: 50,
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
    windowMs: 60 * 1000,
    max: 1000,
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
    apiLimiter,
    gxeonRateLimiter,
    operationLimiter,
    combinedEnforcer,
    ipLimiter,
    webhookLimiter,
    getUserTier,
    TIER_LIMITS,
    OPERATION_LIMITS
};
