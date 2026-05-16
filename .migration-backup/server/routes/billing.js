const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { gxeonAuthOnly } = require('../middleware/gxeonEnforcer');

/**
 * BILLING TELEMETRY API
 * Real-time financial metrics and system health
 * Protected: Requires valid API key
 */

// Apply auth to all routes
router.use(gxeonAuthOnly);

/**
 * GET /api/billing/stats
 * 
 * Returns aggregated billing metrics:
 * - Total revenue (completed transactions)
 * - Transaction counts by status
 * - Refund rate and amounts
 * - Hourly/daily trends
 */
router.get('/stats', async (req, res) => {
    try {
        // Use Supabase aggregation for efficiency (runs in DB, not JS)
        const { data: stats, error } = await supabase
            .rpc('get_billing_stats');

        if (error) throw error;

        // Calculate health score
        const totalTx = parseInt(stats?.completed_count || 0) + parseInt(stats?.refunded_count || 0);
        const refundRate = totalTx > 0 ? (parseInt(stats?.refunded_count || 0) / totalTx) * 100 : 0;
        
        let healthStatus = "OPTIMIZED";
        if (refundRate > 10) healthStatus = "WARNING";
        if (refundRate > 25) healthStatus = "CRITICAL";

        res.json({
            revenue: {
                total: parseFloat(stats?.total_revenue || 0).toFixed(4),
                currency: 'USD',
                last_24h: parseFloat(stats?.revenue_24h || 0).toFixed(4)
            },
            transactions: {
                completed: parseInt(stats?.completed_count || 0),
                refunded: parseInt(stats?.refunded_count || 0),
                reserved: parseInt(stats?.reserved_count || 0),
                total: totalTx
            },
            metrics: {
                refund_rate: `${refundRate.toFixed(2)}%`,
                avg_transaction: totalTx > 0 ? (parseFloat(stats?.total_revenue || 0) / totalTx).toFixed(4) : '0.0000'
            },
            system_health: healthStatus,
            generated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Billing Stats Error]:', err);
        res.status(500).json({ 
            error: "TELEMETRY_FAILED",
            message: err.message 
        });
    }
});

/**
 * GET /api/billing/user-stats
 * 
 * Returns billing statistics for the authenticated user
 */
router.get('/user-stats', async (req, res) => {
    const userId = req.user_id;
    
    try {
        const { data: stats, error } = await supabase
            .rpc('get_user_billing_stats', { p_user_id: userId });

        if (error) throw error;

        res.json({
            user_id: userId,
            balance: {
                current: parseFloat(stats?.current_balance || 0).toFixed(4),
                spent_24h: parseFloat(stats?.spent_24h || 0).toFixed(4),
                spent_total: parseFloat(stats?.spent_total || 0).toFixed(4)
            },
            transactions: {
                completed: parseInt(stats?.completed_count || 0),
                refunded: parseInt(stats?.refunded_count || 0)
            },
            generated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('[User Billing Stats Error]:', err);
        res.status(500).json({ 
            error: "TELEMETRY_FAILED",
            message: err.message 
        });
    }
});

/**
 * GET /api/billing/hourly
 * 
 * Hourly revenue breakdown for charts
 */
router.get('/hourly', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        
        const { data: hourly, error } = await supabase
            .rpc('get_hourly_revenue', { p_hours: hours });

        if (error) throw error;

        res.json({
            period: `${hours}h`,
            data: hourly || [],
            generated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Hourly Stats Error]:', err);
        res.status(500).json({ error: "TELEMETRY_FAILED", message: err.message });
    }
});

/**
 * GET /api/billing/failed-refunds
 * 
 * Admin endpoint: Check for transactions stuck in 'reserved' state
 * (indicates refund failures requiring manual intervention)
 */
router.get('/failed-refunds', async (req, res) => {
    try {
        // Find transactions stuck in reserved for > 1 hour
        const { data: stuck, error } = await supabase
            .from('billing_transactions')
            .select('id, user_id, amount, operation, created_at')
            .eq('status', 'reserved')
            .lt('created_at', new Date(Date.now() - 3600000).toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            count: stuck?.length || 0,
            transactions: stuck || [],
            warning: stuck?.length > 0 ? "Manual refund review required" : null,
            checked_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Failed Refunds Error]:', err);
        res.status(500).json({ error: "TELEMETRY_FAILED", message: err.message });
    }
});

/**
 * POST /api/billing/manual-refund
 * 
 * Admin endpoint: Manually refund a stuck transaction
 */
router.post('/manual-refund', async (req, res) => {
    const { tx_id } = req.body;
    
    if (!tx_id) {
        return res.status(400).json({ error: "TX_ID_REQUIRED" });
    }

    try {
        const { data: result, error } = await supabase
            .rpc('refund_credits', { tx_id_input: tx_id });

        if (error) throw error;

        if (result?.success) {
            res.json({
                success: true,
                message: "Manual refund processed",
                refunded_amount: result.refunded,
                tx_id
            });
        } else {
            res.status(400).json({
                error: "REFUND_FAILED",
                message: result?.message || "Could not process refund"
            });
        }

    } catch (err) {
        console.error('[Manual Refund Error]:', err);
        res.status(500).json({ error: "REFUND_ERROR", message: err.message });
    }
});

module.exports = router;
