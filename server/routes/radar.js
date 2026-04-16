/**
 * 🌑 GXEON RADAR API v1
 * Mempool & Market Opportunity Radar Endpoint
 * Billing: 0.05 credits per successful call
 */

const express = require('express');
const router = express.Router();
const radarShix = require('../services/radarShix');

/**
 * @route   GET /api/v1/radar/opportunities
 * @desc    Get current arbitrage and trading opportunities
 * @access  Private (requires API key + 0.05 credits)
 */
router.get('/opportunities', async (req, res) => {
    try {
        // Get latest opportunities from radar service
        const opportunities = radarShix.getOpportunities() || [];
        
        // Return success with billing info attached by enforcer
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                opportunities: opportunities.slice(0, 20), // Top 20 opportunities
                total_count: opportunities.length,
                networks_scanned: ['ethereum', 'arbitrum', 'polygon'],
                last_update: radarShix.getLastUpdateTime()
            },
            billing: req.billing || null
        });
        
    } catch (error) {
        console.error('[RADAR API] Error fetching opportunities:', error);
        res.status(500).json({
            success: false,
            error: 'RADAR_FETCH_ERROR',
            message: 'Erro ao buscar oportunidades do radar'
        });
    }
});

/**
 * @route   GET /api/v1/radar/status
 * @desc    Get radar service status
 * @access  Private (requires API key + 0.05 credits)
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            active: radarShix.isActive(),
            uptime: radarShix.getUptime(),
            opportunities_found: radarShix.getTotalOpportunities(),
            networks: ['ethereum', 'arbitrum', 'polygon'],
            scan_interval: '5 minutes',
            billing: req.billing || null
        };
        
        res.json({
            success: true,
            data: status
        });
        
    } catch (error) {
        console.error('[RADAR API] Error fetching status:', error);
        res.status(500).json({
            success: false,
            error: 'RADAR_STATUS_ERROR',
            message: 'Erro ao buscar status do radar'
        });
    }
});

/**
 * @route   POST /api/v1/radar/scan
 * @desc    Trigger immediate scan
 * @access  Private (requires API key + 0.05 credits)
 */
router.post('/scan', async (req, res) => {
    try {
        // Trigger immediate scan (now async)
        await radarShix.triggerScan();
        
        res.json({
            success: true,
            message: 'Scan iniciado manualmente',
            timestamp: new Date().toISOString(),
            billing: req.billing || null
        });
        
    } catch (error) {
        console.error('[RADAR API] Error triggering scan:', error);
        res.status(500).json({
            success: false,
            error: 'RADAR_SCAN_ERROR',
            message: 'Erro ao iniciar scan manual'
        });
    }
});

module.exports = router;
