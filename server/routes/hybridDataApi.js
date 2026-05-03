/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌙 GXEON HYBRID DATA API - Monetized Endpoints
 * 
 * Endpoints públicos (freemium) e pagos (paywall):
 * - /v1/leads/free - Free preview (limited)
 * - /v1/leads - Full access (paid)
 * - /v1/trends/free - Free preview (limited)
 * - /v1/trends - Full access (paid)
 * - /v1/tasks/execute - Task execution (paid)
 * 
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { taskEngine } from '../services/apifyIntegration.js';
import { supabase } from '../services/supabase.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const RATE_LIMITS = {
  free: 20,
  basic: 100,
  pro: 1000,
  enterprise: 10000
};

const PRICING = {
  BASIC: { price: 29.90, features: ['limited_leads', 'basic_signals'] },
  PRO: { price: 99.90, features: ['unlimited_leads', 'advanced_signals', 'task_execution'] },
  ENTERPRISE: { price: 299.90, features: ['full_access', 'priority_execution', 'custom_tasks'] }
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: API Key Validation
// ═══════════════════════════════════════════════════════════════════════════
async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API_KEY_REQUIRED',
      message: 'Provide X-API-Key header',
      upgrade_url: '/v1/register'
    });
  }

  try {
    const { data: actor, error } = await supabase
      .from('actors')
      .select('*')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .single();

    if (error || !actor) {
      return res.status(403).json({
        error: 'INVALID_API_KEY',
        message: 'API key not found or inactive',
        upgrade_url: '/v1/register'
      });
    }

    // Check rate limit
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('actor_id', actor.id)
      .eq('date', today)
      .single();

    const limit = RATE_LIMITS[actor.tier.toLowerCase()] || RATE_LIMITS.basic;
    const currentUsage = usage?.count || 0;

    if (currentUsage >= limit) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Tier limit reached (${limit}/day). Upgrade to continue.`,
        current_usage: currentUsage,
        limit: limit,
        upgrade_url: '/v1/register',
        paywall: {
          amount: PRICING.PRO.price,
          currency: 'BRL',
          method: 'PIX'
        }
      });
    }

    // Attach actor to request
    req.actor = actor;
    req.rateLimit = { current: currentUsage, limit, remaining: limit - currentUsage };
    
    next();
  } catch (err) {
    console.error('[API] Validation error:', err);
    return res.status(500).json({ error: 'VALIDATION_ERROR' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Log API Usage
// ═══════════════════════════════════════════════════════════════════════════
async function logApiUsage(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log usage asynchronously
    if (req.actor) {
      logUsage(req.actor.id, req.path, req.method).catch(console.error);
    }
    
    // Add rate limit headers
    if (req.rateLimit) {
      res.set('X-RateLimit-Limit', req.rateLimit.limit);
      res.set('X-RateLimit-Remaining', Math.max(0, req.rateLimit.remaining - 1));
      res.set('X-RateLimit-Used', req.rateLimit.current + 1);
    }
    
    originalJson.call(this, data);
  };
  
  next();
}

async function logUsage(actorId, endpoint, method) {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Try to update existing record
    const { data: existing } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('actor_id', actorId)
      .eq('date', today)
      .single();
    
    if (existing) {
      await supabase
        .from('api_usage_logs')
        .update({
          count: existing.count + 1,
          last_endpoint: endpoint,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('api_usage_logs')
        .insert({
          actor_id: actorId,
          date: today,
          count: 1,
          last_endpoint: endpoint,
          created_at: new Date().toISOString()
        });
    }
  } catch (err) {
    console.error('[API] Usage logging error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE ENDPOINTS (Freemium - Limited)
// ═══════════════════════════════════════════════════════════════════════════

// GET /v1/leads/free - Free preview of leads
router.get('/v1/leads/free', logApiUsage, async (req, res) => {
  try {
    const { query = 'restaurant', location = 'São Paulo' } = req.query;
    
    // Fetch limited data
    const results = await taskEngine.executeTask('fetch_leads', {
      query,
      location,
      maxResults: 5 // Limited for free tier
    });
    
    // Filter sensitive data for free tier
    const sanitized = results.results.slice(0, 3).map(lead => ({
      id: lead.id,
      name: lead.name,
      category: lead.category,
      rating: lead.rating,
      score: lead.score,
      qualified: lead.qualified,
      // Redacted for free tier
      phone: '***',
      website: lead.website ? '***' : null,
      address: lead.address ? lead.address.split(',')[0] + ', ...' : null
    }));

    res.json({
      leads: sanitized,
      total_found: results.result_count,
      shown: sanitized.length,
      query,
      location,
      message: '🔒 Free preview - Unlock full contact data',
      upgrade: {
        url: '/v1/register',
        price: PRICING.BASIC.price,
        benefits: ['Full contact info', 'Phone numbers', 'Emails', '50 leads/request']
      },
      rate_limit: {
        remaining: 20,
        reset: 'tomorrow'
      }
    });
    
  } catch (err) {
    console.error('[API] Free leads error:', err);
    res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
  }
});

// GET /v1/trends/free - Free preview of trends
router.get('/v1/trends/free', logApiUsage, async (req, res) => {
  try {
    const { hashtag = 'business' } = req.query;
    
    const results = await taskEngine.executeTask('analyze_trends', {
      hashtag,
      maxResults: 5
    });
    
    // Limited data for free tier
    const sanitized = results.results.slice(0, 3).map(trend => ({
      id: trend.id,
      viral_score: trend.viral_score,
      trend_velocity: trend.trend_velocity,
      recommended_action: trend.recommended_action,
      // Redacted
      description: trend.description ? trend.description.substring(0, 50) + '...' : null,
      author: '***',
      views: trend.views > 1000000 ? '1M+' : trend.views > 1000 ? Math.floor(trend.views / 1000) + 'K' : trend.views
    }));

    res.json({
      trends: sanitized,
      hashtag,
      message: '🔒 Free preview - Unlock full trend analysis',
      upgrade: {
        url: '/v1/register',
        price: PRICING.PRO.price,
        benefits: ['Full video data', 'Author profiles', 'Engagement metrics', '20 trends/request']
      },
      rate_limit: {
        remaining: 20,
        reset: 'tomorrow'
      }
    });
    
  } catch (err) {
    console.error('[API] Free trends error:', err);
    res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAID ENDPOINTS (Full Access - Requires API Key)
// ═══════════════════════════════════════════════════════════════════════════

// GET /v1/leads - Full leads access (paid)
router.get('/v1/leads', validateApiKey, logApiUsage, async (req, res) => {
  try {
    const { query = 'restaurant', location = 'São Paulo', max = 50 } = req.query;
    
    // Enforce tier limits
    const maxResults = req.actor.tier === 'ENTERPRISE' ? 200 :
                       req.actor.tier === 'PRO' ? 100 : 50;
    
    const results = await taskEngine.executeTask('fetch_leads', {
      query,
      location,
      maxResults: Math.min(parseInt(max) || 50, maxResults)
    });

    // Full data for paid tier
    res.json({
      leads: results.results,
      total: results.result_count,
      query,
      location,
      tier: req.actor.tier,
      actor_code: req.actor.code,
      rate_limit: req.rateLimit,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[API] Leads error:', err);
    res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
  }
});

// GET /v1/trends - Full trends access (paid)
router.get('/v1/trends', validateApiKey, logApiUsage, async (req, res) => {
  try {
    const { hashtag = 'business', max = 20 } = req.query;
    
    const maxResults = req.actor.tier === 'ENTERPRISE' ? 100 :
                       req.actor.tier === 'PRO' ? 50 : 20;
    
    const results = await taskEngine.executeTask('analyze_trends', {
      hashtag,
      maxResults: Math.min(parseInt(max) || 20, maxResults)
    });

    res.json({
      trends: results.results,
      total: results.result_count,
      hashtag,
      tier: req.actor.tier,
      actor_code: req.actor.code,
      rate_limit: req.rateLimit,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[API] Trends error:', err);
    res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
  }
});

// POST /v1/tasks/execute - Execute custom tasks (PRO+)
router.post('/v1/tasks/execute', validateApiKey, logApiUsage, async (req, res) => {
  try {
    const { task_type, params } = req.body;
    
    // Task execution requires PRO or ENTERPRISE
    if (req.actor.tier === 'BASIC') {
      return res.status(402).json({
        error: 'UPGRADE_REQUIRED',
        message: 'Task execution requires PRO tier or higher',
        current_tier: req.actor.tier,
        upgrade_url: '/v1/register',
        paywall: {
          amount: PRICING.PRO.price,
          currency: 'BRL',
          method: 'PIX',
          cta: 'Upgrade to PRO for task execution'
        }
      });
    }

    // Validate task type
    const allowedTasks = [
      'fetch_leads',
      'analyze_trends',
      'competitor_analysis',
      'market_research'
    ];
    
    if (!allowedTasks.includes(task_type)) {
      return res.status(400).json({
        error: 'INVALID_TASK_TYPE',
        allowed_tasks: allowedTasks
      });
    }

    // Execute task
    const results = await taskEngine.executeTask(task_type, params);

    res.json({
      task: task_type,
      results: results.results,
      duration_ms: results.duration_ms,
      tier: req.actor.tier,
      actor_code: req.actor.code,
      rate_limit: req.rateLimit,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[API] Task execution error:', err);
    res.status(500).json({ error: 'EXECUTION_ERROR', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRICING & INFO ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /v1/pricing - Show pricing tiers
router.get('/v1/pricing', (req, res) => {
  res.json({
    tiers: PRICING,
    free_limits: {
      leads_preview: 3,
      trends_preview: 3,
      requests_per_day: 20
    },
    features_comparison: {
      free: ['Limited previews', '3 items/request', '20 requests/day'],
      basic: ['Full leads data', '50 leads/request', '100 requests/day', 'Contact info'],
      pro: ['Full trends data', 'Task execution', 'Competitor analysis', '1000 requests/day'],
      enterprise: ['Unlimited everything', 'Custom tasks', 'Priority support', '10000 requests/day']
    },
    payment_methods: ['PIX', 'Credit Card', 'Crypto (ETH/USDC)'],
    treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
  });
});

// GET /v1/health - Health check
router.get('/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'GXEON Hybrid Data Engine',
    version: '1.0.0',
    endpoints: {
      free: ['/v1/leads/free', '/v1/trends/free'],
      paid: ['/v1/leads', '/v1/trends', '/v1/tasks/execute'],
      info: ['/v1/pricing', '/v1/health']
    },
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS & METRICS (for admin)
// ═══════════════════════════════════════════════════════════════════════════

// GET /v1/admin/hybrid-metrics - System metrics
router.get('/v1/admin/hybrid-metrics', async (req, res) => {
  try {
    // Get usage stats
    const { data: usage } = await supabase
      .from('api_usage_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);
    
    const { data: taskExecs } = await supabase
      .from('task_executions')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);

    res.json({
      api_usage: {
        daily: usage,
        total_requests: usage?.reduce((sum, u) => sum + u.count, 0) || 0
      },
      task_executions: {
        recent: taskExecs,
        total: taskExecs?.length || 0,
        by_type: taskExecs?.reduce((acc, t) => {
          acc[t.task_type] = (acc[t.task_type] || 0) + 1;
          return acc;
        }, {})
      },
      endpoints: {
        leads_free_hits: usage?.filter(u => u.last_endpoint?.includes('/leads/free')).length || 0,
        leads_paid_hits: usage?.filter(u => u.last_endpoint === '/v1/leads').length || 0,
        trends_free_hits: usage?.filter(u => u.last_endpoint?.includes('/trends/free')).length || 0,
        trends_paid_hits: usage?.filter(u => u.last_endpoint === '/v1/trends').length || 0,
        task_executions: usage?.filter(u => u.last_endpoint?.includes('/tasks')).length || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[API] Metrics error:', err);
    res.status(500).json({ error: 'METRICS_ERROR' });
  }
});

export default router;
