const supabase = require('../services/supabase');
const { deductCreditsAtomicDirect, refundCreditsDirect, queryUserByApiKey } = require('./gxeonEnforcerPg');

/**
 * GXEON ENFORCER - Billing & Auth Middleware
 * Validates API Key and deducts credits atomically before execution
 * Fallback para PostgreSQL direto quando PostgREST schema cache falha
 */
const gxeonEnforcer = (costConfig = {}) => async (req, res, next) => {
    const apiKey = req.headers['x-gxeon-key'];
    
    // Default costs per operation type
    const costs = {
        llm_call: 0.001,
        agent_execution: 0.005,
        onchain_operation: 0.01,
        task_pipeline: 0.002,
        edge_function: 0.001,
        radar_call: 0.05,
        ...costConfig
    };

    // Determine operation cost based on route
    const route = req.path;
    let operationCost = costs.default || 0.001;
    
    if (route.includes('/chat')) operationCost = costs.llm_call;
    else if (route.includes('/onchain')) operationCost = costs.onchain_operation;
    else if (route.includes('/orchestrator')) operationCost = costs.agent_execution * 2;
    else if (route.includes('/edge')) operationCost = costs.edge_function;
    else if (route.match(/\/api\/(huggingface|deepseek|grok|chatgpt)/)) operationCost = costs.llm_call;
    else if (route.includes('/api/v1/radar')) operationCost = costs.radar_call;
    else if (route.includes('/api/')) operationCost = costs.agent_execution;

    // 1. Validate API Key presence
    if (!apiKey) {
        return res.status(401).json({ 
            error: "GXEON_AUTH_REQUIRED", 
            message: "API Key ausente. Header 'x-gxeon-key' obrigatório." 
        });
    }

    try {
        let deductionResult;
        
        // 2. Tentar via Supabase RPC primeiro (se supabase estiver configurado)
        if (!supabase) {
            // Supabase not configured - skip billing, allow request
            req.user_id = 'anonymous';
            req.tier = 'free';
            return next();
        }
        
        const { data, error: rpcError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: apiKey,
                p_amount: operationCost,
                p_operation: route,
                p_request_id: req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });

        if (rpcError && rpcError.message && rpcError.message.includes('schema cache')) {
            // Fallback para PostgreSQL direto quando PostgREST cache falha
            console.warn('[GXEON Enforcer] PostgREST schema cache desatualizado, usando PostgreSQL direto...');
            deductionResult = await deductCreditsAtomicDirect(apiKey, operationCost, route, req.id);
        } else if (rpcError) {
            console.error('[GXEON Enforcer] RPC Error:', rpcError);
            return res.status(500).json({ 
                error: "GXEON_BILLING_ERROR", 
                message: "Erro no sistema de cobrança."
            });
        } else {
            deductionResult = data;
        }

        if (!deductionResult || !deductionResult.success) {
            return res.status(402).json({ 
                error: "GXEON_PAYMENT_REQUIRED", 
                message: deductionResult?.message || "Saldo insuficiente para execução.",
                required: operationCost,
                current_balance: deductionResult?.current_balance || 0
            });
        }

        // 3. Attach billing info to request for downstream use
        req.user_id = deductionResult.user_id;
        req.billing = {
            operation: route,
            cost: operationCost,
            remaining_balance: deductionResult.new_balance,
            transaction_id: deductionResult.transaction_id,
            charged_at: new Date().toISOString()
        };

        // 4. Add response interceptor to handle refunds on failure
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // If response indicates failure, consider refunding
            if (data && (data.error || data.success === false)) {
                // Async refund - don't block response
                supabase.rpc('refund_credits', {
                    p_transaction_id: req.billing.transaction_id,
                    p_reason: `Operation failed: ${data.error || 'unknown'}`
                }).catch(err => {
                    console.error('[GXEON Enforcer] Refund failed:', err);
                });
            }
            return originalJson(data);
        };

        next();

    } catch (error) {
        console.error('[GXEON Enforcer] Error:', error);
        return res.status(500).json({ 
            error: "GXEON_ENFORCER_ERROR", 
            message: "Erro interno no middleware de billing." 
        });
    }
};

/**
 * Lightweight version for health checks and public endpoints
 */
const gxeonAuthOnly = async (req, res, next) => {
    const apiKey = req.headers['x-gxeon-key'];
    
    if (!apiKey) {
        return res.status(401).json({ 
            error: "GXEON_AUTH_REQUIRED", 
            message: "API Key ausente." 
        });
    }

    try {
        let user;
        
        // Tentar via Supabase primeiro
        const { data, error } = await supabase
            .from('gxeon_users')
            .select('id, balance_credits, status')
            .eq('api_key', apiKey)
            .eq('status', 'active')
            .single();
        
        if (error && error.message && error.message.includes('schema cache')) {
            // Fallback para PostgreSQL direto
            console.warn('[GXEON Auth] PostgREST schema cache desatualizado, usando PostgreSQL direto...');
            user = await queryUserByApiKey(apiKey);
        } else if (error) {
            return res.status(401).json({ 
                error: "GXEON_INVALID_KEY", 
                message: "API Key inválida ou usuário inativo." 
            });
        } else {
            user = data;
        }

        if (!user) {
            return res.status(401).json({ 
                error: "GXEON_INVALID_KEY", 
                message: "API Key inválida ou usuário inativo." 
            });
        }

        req.user_id = user.id;
        req.user_balance = user.balance_credits;
        next();

    } catch (error) {
        console.error('[GXEON Auth] Error:', error);
        return res.status(500).json({ 
            error: "GXEON_AUTH_ERROR", 
            message: "Erro na validação." 
        });
    }
};

/**
 * Dynamic credit deduction middleware (for memory.js and custom billing)
 * @param {Object} config - Configuration object
 * @param {string} config.operation - Operation name
 * @param {Function} config.getCost - Function to calculate cost: (req) => cost
 */
const deductCredits = (config = {}) => async (req, res, next) => {
    const apiKey = req.headers['x-gxeon-key'];
    
    if (!apiKey) {
        return res.status(401).json({ 
            error: "GXEON_AUTH_REQUIRED", 
            message: "API Key ausente." 
        });
    }

    try {
        const operationCost = config.getCost ? config.getCost(req) : 0.001;
        
        const { data, error: rpcError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: apiKey,
                p_amount: operationCost,
                p_operation: config.operation || 'CUSTOM',
                p_request_id: req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });

        if (rpcError) {
            console.error('[deductCredits] RPC Error:', rpcError);
            return res.status(500).json({ 
                error: "GXEON_BILLING_ERROR", 
                message: "Erro no sistema de cobrança."
            });
        }

        if (!data || !data.success) {
            return res.status(402).json({ 
                error: "GXEON_PAYMENT_REQUIRED", 
                message: data?.message || "Saldo insuficiente.",
                required: operationCost
            });
        }

        req.user_id = data.user_id;
        req.billing = {
            operation: config.operation,
            cost: operationCost,
            remaining_balance: data.new_balance,
            transaction_id: data.transaction_id
        };

        next();
    } catch (error) {
        console.error('[deductCredits] Error:', error);
        return res.status(500).json({ 
            error: "GXEON_BILLING_ERROR", 
            message: "Erro interno no billing."
        });
    }
};

module.exports = { gxeonEnforcer, gxeonAuthOnly, deductCredits };
