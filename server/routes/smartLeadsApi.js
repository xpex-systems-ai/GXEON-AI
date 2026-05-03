/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 /v1/leads/smart - GXEON SMART ENGINE API
 * Lead Intelligence with AI Scoring & Monetization
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import { smartEngine } from '../services/smartEngine.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const FREE_LIMIT = 2;
const PAID_TIERS = {
  BASIC: { max: 20, rateLimit: 100 },
  PRO: { max: 50, rateLimit: 1000 },
  ENTERPRISE: { max: 100, rateLimit: 10000 }
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: API Key Validation
// ═══════════════════════════════════════════════════════════════════════════
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  // In a real implementation, validate against database
  // For now, accept any non-empty key as "paid"
  if (apiKey && apiKey.length > 10) {
    req.isPaid = true;
    req.apiKey = apiKey;
    req.tier = req.headers['x-tier'] || 'BASIC';
    return next();
  }
  
  // No API key = free tier
  req.isPaid = false;
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE ENDPOINT: /v1/leads/smart-free
// Limited preview with partial data
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/leads/smart-free', async (req, res) => {
  try {
    const { query, location, max = FREE_LIMIT } = req.query;
    
    if (!query || !location) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'Query and location are required',
        example: '/v1/leads/smart-free?query=restaurant&location=São%20Paulo'
      });
    }
    
    console.log('[SMART_API] Free request:', { query, location });
    
    // Process leads through full pipeline
    const results = await smartEngine.processLeads(query, location, 20);
    
    // Return limited FREE response
    const freeResponse = smartEngine.generateFreeResponse(results, FREE_LIMIT);
    
    // Add paywall trigger if high score locked
    if (freeResponse.high_score_locked) {
      res.setHeader('X-Paywall-Trigger', 'high_score_locked');
      res.setHeader('X-Upgrade-URL', '/v1/leads/smart');
    }
    
    res.json(freeResponse);
    
  } catch (error) {
    console.error('[SMART_API] Free endpoint error:', error);
    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAID ENDPOINT: /v1/leads/smart
// Full intelligence with API key
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/leads/smart', validateApiKey, async (req, res) => {
  try {
    const { query, location, max = 50 } = req.query;
    
    if (!query || !location) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'Query and location are required',
        example: '/v1/leads/smart?query=restaurant&location=São%20Paulo'
      });
    }
    
    // FREE TIER - Paywall trigger
    if (!req.isPaid) {
      console.log('[SMART_API] Paywall hit - no API key');
      
      // Still process to show them what they're missing
      const results = await smartEngine.processLeads(query, location, 5);
      const freeResponse = smartEngine.generateFreeResponse(results, FREE_LIMIT);
      
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'API key required for full Smart Engine access',
        code: 'GXEON_SMART_UPGRADE',
        preview: freeResponse,
        upgrade: {
          action: 'Register at /v1/register to get API key',
          pricing: {
            BASIC: 'R$ 29.90 - 20 leads/request',
            PRO: 'R$ 99.90 - 50 leads/request + task execution',
            ENTERPRISE: 'R$ 299.90 - Unlimited'
          },
          payment_methods: ['PIX', 'Crypto (ETH/USDC)', 'Card'],
          treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
        },
        unlocks: [
          'Full contact details (phone, website)',
          'AI action recommendations',
          'Conversion estimates',
          'Score breakdowns',
          'Priority ranking',
          'Export to CRM'
        ]
      });
    }
    
    // PAID TIER - Full access
    console.log('[SMART_API] Paid request:', { 
      query, 
      location, 
      tier: req.tier,
      apiKey: req.apiKey.substring(0, 10) + '...'
    });
    
    // Determine max based on tier
    const tierConfig = PAID_TIERS[req.tier] || PAID_TIERS.BASIC;
    const maxResults = Math.min(parseInt(max) || tierConfig.max, tierConfig.max);
    
    // Process full pipeline
    const results = await smartEngine.processLeads(query, location, maxResults);
    
    // Log usage for billing
    logApiUsage(req.apiKey, 'smart_leads', results.total_processed);
    
    // Return full PAID response
    const paidResponse = smartEngine.generatePaidResponse(results);
    
    res.json({
      ...paidResponse,
      tier: req.tier,
      api_key_used: req.apiKey.substring(0, 10) + '...',
      remaining_quota: tierConfig.rateLimit - 1 // simplified
    });
    
  } catch (error) {
    console.error('[SMART_API] Paid endpoint error:', error);
    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SMART ANALYTICS: /v1/leads/smart-analytics
// Performance metrics for processed leads
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/leads/smart-analytics', validateApiKey, async (req, res) => {
  if (!req.isPaid) {
    return res.status(402).json({
      error: 'PAYMENT_REQUIRED',
      message: 'Analytics require PRO tier or higher'
    });
  }
  
  // Mock analytics - in real impl, query from database
  res.json({
    success: true,
    analytics: {
      total_leads_processed: 1523,
      average_score: 58,
      conversion_rate: 12.5,
      top_performing_category: 'Restaurants',
      revenue_generated: 'R$ 45,000',
      high_priority_leads: 156
    },
    tier: req.tier
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING: /v1/leads/smart-batch
// Process multiple queries at once (PRO+)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/v1/leads/smart-batch', validateApiKey, async (req, res) => {
  if (!req.isPaid || req.tier === 'BASIC') {
    return res.status(402).json({
      error: 'UPGRADE_REQUIRED',
      message: 'Batch processing requires PRO tier or higher',
      upgrade_url: '/v1/register?tier=PRO'
    });
  }
  
  const { queries } = req.body;
  
  if (!Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Provide array of queries in request body'
    });
  }
  
  // Process each query
  const results = [];
  for (const q of queries.slice(0, 5)) { // limit to 5 per batch
    const result = await smartEngine.processLeads(
      q.query, 
      q.location, 
      q.max || 20
    );
    results.push({
      query: q.query,
      location: q.location,
      leads_found: result.total_processed,
      high_priority_count: result.leads.filter(l => l.priority === 'HIGH').length
    });
  }
  
  res.json({
    success: true,
    batch_size: results.length,
    results,
    tier: req.tier
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function logApiUsage(apiKey, endpoint, count) {
  // In real implementation, log to database for billing
  console.log(`[BILLING] ${apiKey.substring(0, 10)}... used ${endpoint}: ${count} leads`);
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════
router.get('/v1/leads/smart/docs', (req, res) => {
  res.json({
    name: 'GXEON Smart Engine',
    version: '1.0',
    description: 'AI-powered lead scoring and intelligence system',
    endpoints: {
      free: {
        path: '/v1/leads/smart-free',
        auth: 'None',
        limit: '2 leads',
        data: 'Score + Priority only'
      },
      paid: {
        path: '/v1/leads/smart',
        auth: 'API Key required',
        tiers: {
          BASIC: '20 leads/request - R$ 29.90/mo',
          PRO: '50 leads/request - R$ 99.90/mo',
          ENTERPRISE: '100 leads/request - R$ 299.90/mo'
        },
        data: 'Full intelligence (contact, actions, estimates)'
      },
      analytics: {
        path: '/v1/leads/smart-analytics',
        auth: 'API Key (PRO+)',
        data: 'Performance metrics'
      },
      batch: {
        path: '/v1/leads/smart-batch',
        auth: 'API Key (PRO+)',
        data: 'Multiple queries at once'
      }
    },
    scoring_rules: {
      no_website: '+30 (opportunity for web dev)',
      rating_above_4_5: '+25 (quality business)',
      low_competition: '+20 (less saturated market)',
      has_phone: '+15 (direct contact available)',
      recent_activity: '+10 (active business)'
    },
    output_fields: {
      free: ['name', 'category', 'score', 'priority'],
      paid: ['name', 'category', 'address', 'phone', 'website', 'rating', 'reviews', 'score', 'priority', 'action', 'reason', 'estimated_conversion', 'signals']
    },
    upgrade_trigger: 'high_score_locked - When free tier shows leads with score >= 70'
  });
});

export default router;
