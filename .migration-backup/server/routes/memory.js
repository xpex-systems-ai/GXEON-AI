const express = require('express');
const router = express.Router();
const { deductCredits } = require('../middleware/gxeonEnforcer');
const supabase = require('../services/supabase');

/**
 * MEMORY API - Paid Data Storage
 * 
 * Billing: $0.001 per KB stored
 * Every operation charges the user transparently.
 */

// Cost per KB for memory storage
const MEMORY_COST_PER_KB = 0.001;

/**
 * POST /memory/store
 * Store data with billing based on payload size
 */
router.post('/store', deductCredits({
    operation: 'MEMORY_STORE',
    getCost: (req) => {
        const sizeKb = req.body._size_kb || (JSON.stringify(req.body.data).length / 1024);
        return Math.max(0.001, sizeKb * MEMORY_COST_PER_KB);
    }
}), async (req, res) => {
    try {
        const { contextId, data } = req.body;
        const userId = req.user_id;
        
        if (!contextId || !data) {
            return res.status(400).json({
                error: 'MISSING_PARAMS',
                message: 'contextId and data are required'
            });
        }

        // Calculate size for logging
        const sizeBytes = JSON.stringify(data).length;
        const sizeKb = sizeBytes / 1024;

        // Store in Supabase
        const { data: stored, error } = await supabase
            .from('memory_contexts')
            .upsert({
                context_id: contextId,
                user_id: userId,
                data: data,
                size_bytes: sizeBytes,
                stored_at: new Date().toISOString(),
                billing_tx_id: req.billingTransactionId
            })
            .select()
            .single();

        if (error) throw error;

        // Confirm billing transaction
        await supabase
            .from('billing_transactions')
            .update({ 
                status: 'completed',
                metadata: { 
                    operation: 'MEMORY_STORE',
                    context_id: contextId,
                    size_kb: sizeKb.toFixed(3)
                }
            })
            .eq('id', req.billingTransactionId);

        res.json({
            success: true,
            contextId,
            stored: true,
            billing: {
                cost: (sizeKb * MEMORY_COST_PER_KB).toFixed(4),
                currency: 'USD',
                transaction_id: req.billingTransactionId
            }
        });

    } catch (error) {
        console.error('[MemoryAPI] Store failed:', error);
        
        // Refund on failure
        if (req.billingTransactionId) {
            await supabase.rpc('refund_credits', { 
                tx_id_input: req.billingTransactionId 
            });
        }
        
        res.status(500).json({
            error: 'MEMORY_STORE_FAILED',
            message: error.message
        });
    }
});

/**
 * GET /memory/:contextId
 * Retrieve stored data
 */
router.get('/:contextId', async (req, res) => {
    try {
        const { contextId } = req.params;
        const apiKey = req.headers['x-gxeon-key'];

        // Get user from API key
        const { data: userData, error: userError } = await supabase
            .rpc('get_user_from_api_key', { p_api_key: apiKey });

        if (userError || !userData) {
            return res.status(401).json({ error: 'INVALID_API_KEY' });
        }

        const userId = userData.user_id;

        // Charge for retrieval ($0.0005)
        const { data: billingResult, error: billingError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: apiKey,
                p_amount: 0.0005,
                p_operation: 'MEMORY_RETRIEVE',
                p_request_id: `memory-get-${Date.now()}`
            });

        if (billingError || !billingResult?.success) {
            return res.status(402).json({
                error: 'INSUFFICIENT_CREDITS',
                message: 'Add credits to retrieve memory'
            });
        }

        // Retrieve data
        const { data: memory, error } = await supabase
            .from('memory_contexts')
            .select('*')
            .eq('context_id', contextId)
            .eq('user_id', userId)
            .single();

        if (error || !memory) {
            // Refund if not found
            await supabase.rpc('refund_credits', { 
                tx_id_input: billingResult.transaction_id 
            });
            
            return res.status(404).json({
                error: 'MEMORY_NOT_FOUND',
                message: 'Context not found or access denied'
            });
        }

        // Confirm billing
        await supabase
            .from('billing_transactions')
            .update({ status: 'completed' })
            .eq('id', billingResult.transaction_id);

        res.json({
            success: true,
            contextId,
            data: memory.data,
            stored_at: memory.stored_at,
            billing: {
                cost: 0.0005,
                currency: 'USD',
                transaction_id: billingResult.transaction_id
            }
        });

    } catch (error) {
        console.error('[MemoryAPI] Retrieve failed:', error);
        res.status(500).json({
            error: 'MEMORY_RETRIEVE_FAILED',
            message: error.message
        });
    }
});

module.exports = router;
