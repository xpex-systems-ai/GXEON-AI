const express = require('express');
const router = express.Router();
const { gxeonEnforcer } = require('../middleware/gxeonEnforcer');
const agentService = require('../services/agents');

/**
 * AGENT EXECUTION - PROTECTED ROUTE
 * POST /api/agents/execute
 * 
 * Billing flow:
 * 1. gxeonEnforcer deducts credits BEFORE execution
 * 2. Credits reserved in 'billing_transactions' table
 * 3. On success: Transaction stays 'completed'
 * 4. On failure: Automatic refund via catch block
 */
router.post('/execute', 
    // Apply enforcer with agent-specific pricing
    gxeonEnforcer({ 
        agent_execution: 0.005,  // Base cost
        llm_call: 0.002          // If agent uses LLM
    }), 
    async (req, res) => {
        const { agent_type, task_payload } = req.body;
        
        // Billing info injected by middleware
        const { user_id, billing } = req;
        
        if (!agent_type) {
            // Invalid request - refund immediately
            await refundTransaction(billing.transaction_id, 'MISSING_AGENT_TYPE');
            return res.status(400).json({ 
                error: "INVALID_REQUEST", 
                message: "agent_type é obrigatório" 
            });
        }

        try {
            console.log(`[Agent Execute] User ${user_id} executing ${agent_type}, TX: ${billing.transaction_id}`);
            
            // Execute the agent
            const result = await agentService.executeAgent(agent_type, {
                ...task_payload,
                user_id,
                billing_transaction_id: billing.transaction_id
            });

            // SUCCESS: Transaction already marked 'completed' by middleware
            // Add billing metadata to response for transparency
            res.json({
                success: true,
                result,
                billing: {
                    transaction_id: billing.transaction_id,
                    charged: billing.cost,
                    remaining_balance: billing.remaining_balance,
                    operation: billing.operation
                }
            });

        } catch (error) {
            // FAILURE: Automatic refund
            console.error(`[Agent Execute] Failed for TX ${billing.transaction_id}:`, error.message);
            
            try {
                // Trigger refund RPC
                const { data: refundResult } = await req.supabase
                    .rpc('refund_credits', { 
                        p_transaction_id: billing.transaction_id,
                        p_reason: `Agent execution failed: ${error.message}`
                    });
                
                console.log(`[Agent Execute] Refund processed:`, refundResult);
            } catch (refundError) {
                console.error(`[Agent Execute] Refund failed:`, refundError);
                // Log to manual review queue
                await logFailedRefund(billing.transaction_id, error.message);
            }

            res.status(500).json({ 
                error: "AGENT_EXECUTION_FAILED", 
                message: error.message,
                refund_status: 'processed',
                billing: {
                    transaction_id: billing.transaction_id,
                    refunded: billing.cost
                }
            });
        }
    }
);

/**
 * ORCHESTRATOR - MULTI-AGENT EXECUTION
 * POST /api/agents/orchestrator
 * Higher cost due to coordination overhead
 */
router.post('/orchestrator',
    gxeonEnforcer({ 
        agent_execution: 0.008,  // Higher cost for orchestration
        llm_call: 0.003
    }),
    async (req, res) => {
        const { message, agents, context } = req.body;
        const { user_id, billing } = req;

        try {
            // Orchestrator coordinates multiple agents
            const result = await agentService.orchestratorAI({
                message,
                agents: agents || ['orquestrador'],
                context: context || [],
                user_id,
                billing_transaction_id: billing.transaction_id
            });

            res.json({
                success: true,
                replies: result.replies,
                orchestrated_agents: agents || ['orquestrador'],
                billing: {
                    transaction_id: billing.transaction_id,
                    charged: billing.cost,
                    remaining_balance: billing.remaining_balance
                }
            });

        } catch (error) {
            await req.supabase.rpc('refund_credits', {
                p_transaction_id: billing.transaction_id,
                p_reason: `Orchestrator failed: ${error.message}`
            });

            res.status(500).json({
                error: "ORCHESTRATOR_FAILED",
                message: error.message,
                refund_status: 'processed'
            });
        }
    }
);

/**
 * AI SERVICE ROUTES - Per-provider billing
 * Each AI provider has different costs
 */

// HuggingFace - Lower cost
router.post('/huggingface',
    gxeonEnforcer({ llm_call: 0.001 }),
    async (req, res) => {
        await handleAIService(req, res, 'huggingface');
    }
);

// DeepSeek - Medium cost
router.post('/deepseek',
    gxeonEnforcer({ llm_call: 0.002 }),
    async (req, res) => {
        await handleAIService(req, res, 'deepseek');
    }
);

// Grok - Higher cost
router.post('/grok',
    gxeonEnforcer({ llm_call: 0.004 }),
    async (req, res) => {
        await handleAIService(req, res, 'grok');
    }
);

// ChatGPT/OpenRouter - Standard cost
router.post('/chatgpt',
    gxeonEnforcer({ llm_call: 0.0025 }),
    async (req, res) => {
        await handleAIService(req, res, 'chatgpt');
    }
);

/**
 * WEB3 & SMART CONTRACT ROUTES
 * Higher costs due to blockchain operations
 */

// Wallet operations
router.post('/wallet',
    gxeonEnforcer({ 
        agent_execution: 0.003,
        onchain_operation: 0.005  // Potential onchain component
    }),
    async (req, res) => {
        const { action, params } = req.body;
        const { billing } = req;

        try {
            const result = await agentService.walletService({
                action,
                ...params,
                billing_transaction_id: billing.transaction_id
            });

            res.json({ success: true, result, billing: { transaction_id: billing.transaction_id } });

        } catch (error) {
            await req.supabase.rpc('refund_credits', {
                p_transaction_id: billing.transaction_id,
                p_reason: `Wallet operation failed: ${error.message}`
            });

            res.status(500).json({ error: "WALLET_OPERATION_FAILED", message: error.message });
        }
    }
);

// Smart Contract execution - Critical billing
router.post('/contracts',
    gxeonEnforcer({ 
        onchain_operation: 0.015,  // High cost for contract execution
        agent_execution: 0.005
    }),
    async (req, res) => {
        const { contract_address, method, params } = req.body;
        const { billing } = req;

        // Additional validation for contract calls
        if (!contract_address || !method) {
            await req.supabase.rpc('refund_credits', {
                p_transaction_id: billing.transaction_id,
                p_reason: 'INVALID_CONTRACT_PARAMS'
            });
            return res.status(400).json({ error: "INVALID_PARAMS", message: "contract_address e method são obrigatórios" });
        }

        try {
            const result = await agentService.contractService({
                contract_address,
                method,
                params,
                billing_transaction_id: billing.transaction_id
            });

            res.json({ success: true, result, billing: { transaction_id: billing.transaction_id } });

        } catch (error) {
            await req.supabase.rpc('refund_credits', {
                p_transaction_id: billing.transaction_id,
                p_reason: `Contract execution failed: ${error.message}`
            });

            res.status(500).json({ error: "CONTRACT_EXECUTION_FAILED", message: error.message });
        }
    }
);

// Helper function for AI service handlers
async function handleAIService(req, res, provider) {
    const { prompt, messages } = req.body;
    const { user_id, billing } = req;

    try {
        const result = await agentService[`${provider}Agent`]({
            prompt,
            messages,
            user_id,
            billing_transaction_id: billing.transaction_id
        });

        res.json({
            success: true,
            result,
            provider,
            billing: {
                transaction_id: billing.transaction_id,
                charged: billing.cost,
                remaining_balance: billing.remaining_balance
            }
        });

    } catch (error) {
        await req.supabase.rpc('refund_credits', {
            p_transaction_id: billing.transaction_id,
            p_reason: `${provider} service failed: ${error.message}`
        });

        res.status(500).json({
            error: `${provider.toUpperCase()}_ERROR`,
            message: error.message,
            refund_status: 'processed'
        });
    }
}

// Helper: Refund transaction
async function refundTransaction(transactionId, reason) {
    try {
        const supabase = require('../services/supabase');
        await supabase.rpc('refund_credits', {
            p_transaction_id: transactionId,
            p_reason: reason
        });
    } catch (error) {
        console.error(`[Refund Failed] TX ${transactionId}:`, error);
    }
}

// Helper: Log failed refunds for manual review
async function logFailedRefund(transactionId, reason) {
    try {
        const supabase = require('../services/supabase');
        await supabase.from('failed_refunds').insert({
            transaction_id: transactionId,
            reason,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[Log Failed] Could not log failed refund:`, error);
    }
}

module.exports = router;
