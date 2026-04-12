const supabase = require('../services/supabase');

/**
 * GXEON ENFORCER - Billing & Auth Middleware
 * Validates API Key and deducts credits atomically before execution
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
    else if (route.includes('/api/')) operationCost = costs.agent_execution;

    // 1. Validate API Key presence
    if (!apiKey) {
        return res.status(401).json({ 
            error: "GXEON_AUTH_REQUIRED", 
            message: "API Key ausente. Header 'x-gxeon-key' obrigatório." 
        });
    }

    try {
        // 2. Atomic credit check AND deduction using Supabase RPC
        // This prevents race conditions where parallel requests pass validation
        const { data: deductionResult, error: rpcError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: apiKey,
                p_amount: operationCost,
                p_operation: route,
                p_request_id: req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });

        if (rpcError) {
            console.error('[GXEON Enforcer] RPC Error:', rpcError);
            return res.status(500).json({ 
                error: "GXEON_BILLING_ERROR", 
                message: "Erro no sistema de cobrança." 
            });
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
        const { data: user, error } = await supabase
            .from('users')
            .select('id, balance_credits, status')
            .eq('api_key', apiKey)
            .eq('status', 'active')
            .single();

        if (error || !user) {
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

module.exports = { gxeonEnforcer, gxeonAuthOnly };
