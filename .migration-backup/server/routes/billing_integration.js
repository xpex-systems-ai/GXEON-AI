/**
 * BILLING INTEGRATION - Complete Reference Implementation
 * 
 * Flow: Deduct (atomic) → Execute → Complete (on success) / Refund (on failure)
 */

const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const agentService = require('../services/agentService');

/**
 * Middleware: Deduct credits before execution
 * Uses Supabase RPC for atomic operation (prevents race conditions)
 */
async function deductCredits(req, res, next) {
    const apiKey = req.headers['x-gxeon-key'];
    const cost = req.billingCost || 0.005; // Default agent cost
    
    if (!apiKey) {
        return res.status(401).json({ error: 'GXEON_AUTH_REQUIRED', message: 'API Key ausente' });
    }
    
    try {
        // ATOMIC: Check balance AND deduct in single operation
        const { data: result, error } = await supabase.rpc('deduct_credits_atomic', {
            p_api_key: apiKey,
            p_amount: cost,
            p_operation: req.path,
            p_request_id: req.id
        });
        
        if (error || !result.success) {
            return res.status(402).json({
                error: 'GXEON_PAYMENT_REQUIRED',
                message: result?.message || 'Saldo insuficiente',
                required: cost
            });
        }
        
        // Attach billing context to request
        req.tx_id = result.transaction_id;
        req.user_id = result.user_id;
        req.billing = {
            cost: cost,
            previous_balance: result.previous_balance,
            new_balance: result.new_balance
        };
        
        next();
        
    } catch (error) {
        console.error('[Billing] Deduct failed:', error);
        return res.status(500).json({ error: 'BILLING_ERROR', message: 'Erro no sistema de cobrança' });
    }
}

/**
 * POST /api/execute - Protected Agent Execution
 * 
 * Billing Cycle:
 * 1. deductCredits middleware: Reserves credits (status: 'reserved')
 * 2. Agent execution: Performs the work
 * 3a. Success: Transaction confirmed (status: 'completed')
 * 3b. Failure: Credits refunded via RPC (status: 'refunded')
 */
router.post('/execute', deductCredits, async (req, res) => {
    const { agent_type, payload } = req.body;
    const { tx_id, user_id } = req;
    
    try {
        // EXECUTE: Pass tx_id for audit logging
        const result = await agentService.run(agent_type, payload, tx_id);
        
        // SUCCESS: Confirm transaction
        await supabase
            .from('billing_transactions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', tx_id);
        
        res.json({
            success: true,
            result,
            billing: {
                tx_id,
                status: 'completed',
                charged: req.billing.cost,
                remaining_balance: req.billing.new_balance
            }
        });
        
    } catch (error) {
        console.error(`[Execute] TX ${tx_id} failed:`, error.message);
        
        // FAILURE: Automatic refund
        try {
            await supabase.rpc('refund_credits', { tx_id_input: tx_id });
            console.log(`[Execute] Refunded TX ${tx_id}`);
        } catch (refundError) {
            console.error(`[Execute] Refund failed for TX ${tx_id}:`, refundError);
            // Log for manual review
        }
        
        res.status(500).json({
            error: 'EXECUTION_FAILED',
            message: error.message,
            billing: {
                tx_id,
                status: 'refunded',
                refunded_amount: req.billing.cost
            }
        });
    }
});

/**
 * POST /api/task-engine/process
 * 
 * Task pipeline with billing per stage
 */
router.post('/task-engine/process', deductCredits, async (req, res) => {
    const { task_id } = req.body;
    const { tx_id } = req;
    
    try {
        // Fetch task
        const { data: task, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', task_id)
            .single();
        
        if (error || !task) {
            throw new Error('Task not found');
        }
        
        // Execute pipeline stages
        const result = await executePipeline(task, tx_id);
        
        // Success: Confirm billing
        await supabase
            .from('billing_transactions')
            .update({ status: 'completed' })
            .eq('id', tx_id);
        
        res.json({ success: true, result, billing: { tx_id, status: 'completed' } });
        
    } catch (error) {
        // Failure: Refund
        await supabase.rpc('refund_credits', { tx_id_input: tx_id });
        
        res.status(500).json({
            error: 'PIPELINE_FAILED',
            message: error.message,
            billing: { tx_id, status: 'refunded' }
        });
    }
});

/**
 * POST /api/onchain/transfer - Critical billing
 * 
 * Higher cost + additional validation
 */
router.post('/onchain/transfer', 
    // Higher cost middleware
    (req, res, next) => { req.billingCost = 0.015; next(); },
    deductCredits,
    async (req, res) => {
        const { to, amount, network } = req.body;
        const { tx_id } = req;
        
        try {
            // Validate transfer params
            if (!to || !amount) {
                throw new Error('Missing transfer parameters');
            }
            
            // Execute blockchain transfer
            const result = await executeOnchainTransfer({ to, amount, network });
            
            // Confirm billing
            await supabase
                .from('billing_transactions')
                .update({ status: 'completed', metadata: { tx_hash: result.tx_hash } })
                .eq('id', tx_id);
            
            res.json({
                success: true,
                tx_hash: result.tx_hash,
                billing: { tx_id, status: 'completed', charged: 0.015 }
            });
            
        } catch (error) {
            await supabase.rpc('refund_credits', { tx_id_input: tx_id });
            
            res.status(500).json({
                error: 'TRANSFER_FAILED',
                message: error.message,
                billing: { tx_id, status: 'refunded' }
            });
        }
    }
);

// Helper: Execute pipeline (mock)
async function executePipeline(task, tx_id) {
    // Stage 1: Validation
    // Stage 2: Execution
    // Stage 3: Storage
    return { task_id: task.id, status: 'completed', billing_tx: tx_id };
}

// Helper: Onchain transfer (mock)
async function executeOnchainTransfer({ to, amount, network }) {
    return {
        tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
        to,
        amount,
        network
    };
}

module.exports = router;
