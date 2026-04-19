/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 AGENT AUTHENTICATION MIDDLEWARE v20.0
 * Autenticação exclusiva para Agent-to-Agent (A2A) communication
 * Header: X-Agent-Key (JWT-like agent identity)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');

// Registry de agentes autorizados (em produção, vir do Supabase)
const AGENT_REGISTRY = new Map();

// Rate limiting por agente
const agentRateLimits = new Map();

/**
 * Middleware de autenticação de agentes
 * Aceita apenas X-Agent-Key no header
 */
const agentAuthMiddleware = async (req, res, next) => {
    const agentKey = req.headers['x-agent-key'];
    const requestId = req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Logging técnico de alta densidade
    const startTime = Date.now();
    
    if (!agentKey) {
        console.log(`[AGENT_AUTH] ❌ BLOCKED | IP:${req.ip} | No X-Agent-Key | ${requestId}`);
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32001,
                message: 'AGENT_KEY_REQUIRED',
                data: { header: 'X-Agent-Key missing' }
            },
            id: requestId
        });
    }
    
    // Validar formato da chave (prefixo: agt_ + hash)
    if (!agentKey.startsWith('agt_') || agentKey.length < 20) {
        console.log(`[AGENT_AUTH] ❌ BLOCKED | IP:${req.ip} | Invalid key format | ${requestId}`);
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32002,
                message: 'INVALID_AGENT_KEY_FORMAT',
                data: { expected: 'agt_<hash>' }
            },
            id: requestId
        });
    }
    
    // Verificar no registry
    const agent = AGENT_REGISTRY.get(agentKey);
    
    if (!agent) {
        // Auto-registro para novos agentes (em modo de crescimento)
        // Em produção strict, retornar 401 aqui
        if (process.env.AUTO_REGISTER_AGENTS === 'true') {
            registerAgent(agentKey, 'auto_registered');
            console.log(`[AGENT_AUTH] 🆕 AUTO-REGISTER | Key:${agentKey.slice(0, 12)}... | ${requestId}`);
        } else {
            console.log(`[AGENT_AUTH] ❌ BLOCKED | IP:${req.ip} | Unknown agent | ${requestId}`);
            return res.status(401).json({
                jsonrpc: '2.0',
                error: {
                    code: -32003,
                    message: 'UNKNOWN_AGENT',
                    data: { key_prefix: agentKey.slice(0, 8) }
                },
                id: requestId
            });
        }
    }
    
    // Rate limiting check
    const rateCheck = checkRateLimit(agentKey);
    if (!rateCheck.allowed) {
        console.log(`[AGENT_AUTH] ⛔ RATE_LIMIT | Agent:${agentKey.slice(0, 12)}... | ${requestId}`);
        return res.status(429).json({
            jsonrpc: '2.0',
            error: {
                code: -32004,
                message: 'RATE_LIMIT_EXCEEDED',
                data: { retry_after: rateCheck.retryAfter }
            },
            id: requestId
        });
    }
    
    // Attach agent info to request
    const agentData = AGENT_REGISTRY.get(agentKey);
    req.agent = {
        key: agentKey,
        id: agentData.id,
        tier: agentData.tier,
        registeredAt: agentData.registeredAt,
        requestId
    };
    
    // Log técnico de sucesso (minimal)
    const latency = Date.now() - startTime;
    if (latency > 10) {
        console.log(`[AGENT_AUTH] ✅ ${agentData.tier} | ${agentKey.slice(0, 8)}... | ${latency}ms | ${requestId}`);
    }
    
    next();
};

/**
 * Registra um novo agente no sistema
 */
function registerAgent(agentKey, tier = 'standard', metadata = {}) {
    const agentId = crypto.createHash('sha256')
        .update(agentKey + process.env.ORACLE_SALT)
        .digest('hex')
        .slice(0, 16);
    
    AGENT_REGISTRY.set(agentKey, {
        id: agentId,
        tier,
        registeredAt: Date.now(),
        lastSeen: Date.now(),
        requestCount: 0,
        credits: metadata.initialCredits || 0,
        metadata
    });
    
    return agentId;
}

/**
 * Verifica rate limiting por agente
 */
function checkRateLimit(agentKey) {
    const now = Date.now();
    const windowMs = 60000; // 1 minuto
    const maxRequests = 1000; // 1000 req/min para tier standard
    
    const agentLimit = agentRateLimits.get(agentKey);
    
    if (!agentLimit || now - agentLimit.windowStart > windowMs) {
        // Nova janela
        agentRateLimits.set(agentKey, {
            windowStart: now,
            count: 1
        });
        return { allowed: true };
    }
    
    if (agentLimit.count >= maxRequests) {
        return {
            allowed: false,
            retryAfter: Math.ceil((windowMs - (now - agentLimit.windowStart)) / 1000)
        };
    }
    
    agentLimit.count++;
    return { allowed: true };
}

/**
 * Gera uma nova chave de agente (para onboarding)
 */
function generateAgentKey(tier = 'standard') {
    const random = crypto.randomBytes(32).toString('hex');
    const key = `agt_${random}`;
    registerAgent(key, tier);
    return key;
}

/**
 * Retorna estatísticas de agentes (para admin)
 */
function getAgentStats() {
    const stats = {
        total: AGENT_REGISTRY.size,
        by_tier: {},
        active_last_hour: 0,
        rate_limited_now: 0
    };
    
    const now = Date.now();
    
    for (const [key, agent] of AGENT_REGISTRY) {
        // By tier
        stats.by_tier[agent.tier] = (stats.by_tier[agent.tier] || 0) + 1;
        
        // Active last hour
        if (now - agent.lastSeen < 3600000) {
            stats.active_last_hour++;
        }
    }
    
    // Rate limited now
    for (const [key, limit] of agentRateLimits) {
        if (limit.count >= 1000) {
            stats.rate_limited_now++;
        }
    }
    
    return stats;
}

/**
 * Atualiza last_seen do agente
 */
function updateAgentActivity(agentKey) {
    const agent = AGENT_REGISTRY.get(agentKey);
    if (agent) {
        agent.lastSeen = Date.now();
        agent.requestCount++;
    }
}

/**
 * Middleware para tracking de atividade
 */
const agentActivityTracker = (req, res, next) => {
    if (req.agent) {
        updateAgentActivity(req.agent.key);
    }
    next();
};

/**
 * Verificação de tier para recursos premium
 */
const requireTier = (minTier) => {
    const tierLevels = {
        'free': 0,
        'standard': 1,
        'premium': 2,
        'enterprise': 3
    };
    
    return (req, res, next) => {
        if (!req.agent) {
            return res.status(403).json({
                jsonrpc: '2.0',
                error: {
                    code: -32005,
                    message: 'AGENT_NOT_AUTHENTICATED'
                }
            });
        }
        
        const agentLevel = tierLevels[req.agent.tier] || 0;
        const requiredLevel = tierLevels[minTier] || 0;
        
        if (agentLevel < requiredLevel) {
            return res.status(403).json({
                jsonrpc: '2.0',
                error: {
                    code: -32006,
                    message: 'TIER_INSUFFICIENT',
                    data: { required: minTier, current: req.agent.tier }
                }
            });
        }
        
        next();
    };
};

module.exports = {
    agentAuthMiddleware,
    agentActivityTracker,
    requireTier,
    registerAgent,
    generateAgentKey,
    getAgentStats,
    AGENT_REGISTRY
};
