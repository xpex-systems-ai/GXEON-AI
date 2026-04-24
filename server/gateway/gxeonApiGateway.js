/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON API GATEWAY v2.0 — REAL A2A PRODUCTION MODE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: ACTIVATE_REAL_A2A_PRODUCTION_MODE
 * Mode: external_accessible_production
 * 
 * External-facing A2A service with controlled access
 * All external requests traced, billed, and logged
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const supabase = require('../services/supabase');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const GATEWAY_CONFIG = {
  port: process.env.GATEWAY_PORT || 3000,
  mode: 'external_accessible_production',
  
  // External access configuration
  external_access: {
    enabled: true,
    allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    require_api_key: true,
    trust_proxy: true
  },
  
  // Rate limiting per API key (stricter for external)
  rate_limits: {
    free: { windowMs: 60000, max: 0 },      // No requests for free tier
    basic: { windowMs: 60000, max: 30 },    // 30 req/min (external)
    pro: { windowMs: 60000, max: 150 },     // 150 req/min (external)
    enterprise: { windowMs: 60000, max: 500 }, // 500 req/min (external)
    internal: { windowMs: 60000, max: 1000 }   // Internal test bypass
  },
  
  // Kafka configuration
  kafka: {
    clientId: 'gxeon-api-gateway-v2',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
      initialRetryTime: 100,
      retries: 5
    }
  }
};

const KAFKA_TOPICS = {
  request_inbound: 'request.inbound',
  execution_run: 'execution.run',
  billing_charge: 'billing.charge',
  audit_trace: 'audit.trace',
  external_usage: 'gx_external_usage_stream'  // External traffic differentiation
};

// ═══════════════════════════════════════════════════════════════════════════
// API GATEWAY CLASS
// ═══════════════════════════════════════════════════════════════════════════
class GXEONApiGateway {
  constructor() {
    this.app = express();
    this.kafka = new Kafka(GATEWAY_CONFIG.kafka);
    this.producer = this.kafka.producer();
    this.metrics = {
      requests_received: 0,
      requests_authenticated: 0,
      requests_rate_limited: 0,
      events_published: 0,
      kafka_errors: 0
    };
  }

  async initialize() {
    console.log('[GXEON_GATEWAY] Initializing API Gateway v2.0...');
    console.log('[GXEON_GATEWAY] Mode: EXTERNAL_ACCESSIBLE_PRODUCTION');
    
    // Connect to Kafka
    await this.producer.connect();
    console.log('[GXEON_GATEWAY] Connected to Kafka');
    
    // Setup middleware
    this.setupMiddleware();
    
    // Trust proxy for external access
    this.app.set('trust proxy', GATEWAY_CONFIG.external_access.trust_proxy);
    
    // Setup routes
    this.setupRoutes();
    
    // Error handling
    this.setupErrorHandling();
    
    // Start server
    this.server = this.app.listen(GATEWAY_CONFIG.port, () => {
      console.log(`[GXEON_GATEWAY] 🚀 Gateway running on port ${GATEWAY_CONFIG.port}`);
      console.log(`[GXEON_GATEWAY] Mode: ${GATEWAY_CONFIG.mode}`);
      console.log(`[GXEON_GATEWAY] Kafka: ${GATEWAY_CONFIG.kafka.brokers.join(', ')}`);
    });
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
      methods: ['POST', 'GET'],
      allowedHeaders: ['Content-Type', 'X-API-KEY', 'X-Request-ID']
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request ID generation
    this.app.use((req, res, next) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.timestamp = new Date().toISOString();
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: GATEWAY_CONFIG.mode,
        metrics: this.metrics
      });
    });

    // Main A2A endpoint - ALL machine requests go through here
    this.app.post('/v1/a2a/execute', 
      this.authenticate.bind(this),
      this.rateLimitByTier.bind(this),
      this.publishToKafka.bind(this),
      this.handleExecution.bind(this)
    );

    // Status endpoint for tracking requests
    this.app.get('/v1/a2a/status/:requestId', 
      this.authenticate.bind(this),
      this.getRequestStatus.bind(this)
    );

    // Metrics endpoint
    this.app.get('/v1/a2a/metrics', 
      this.authenticate.bind(this),
      this.getMetrics.bind(this)
    );
  }

  async authenticate(req, res, next) {
    this.metrics.requests_received++;
    
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      console.log(`[GXEON_GATEWAY] ❌ Auth failed: No API key`);
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'X-API-KEY header is required',
        request_id: req.requestId
      });
    }

    try {
      // Validate API key with Supabase
      const { data: user, error } = await supabase
        .from('gxeon_users')
        .select('id, tier, balance_credits, status, rate_limit_tier')
        .eq('api_key', apiKey)
        .eq('status', 'active')
        .single();

      if (error || !user) {
        console.log(`[GXEON_GATEWAY] ❌ Auth failed: Invalid API key`);
        return res.status(401).json({
          error: 'INVALID_API_KEY',
          message: 'API key is invalid or inactive',
          request_id: req.requestId
        });
      }

      // Check balance
      if (user.balance_credits <= 0) {
        console.log(`[GXEON_GATEWAY] ❌ Auth failed: No credits`);
        return res.status(402).json({
          error: 'INSUFFICIENT_CREDITS',
          message: 'Account has no credits available',
          request_id: req.requestId
        });
      }

      // Block free tier completely
      if (user.tier === 'free') {
        console.log(`[GXEON_GATEWAY] ❌ Auth failed: Free tier blocked`);
        return res.status(403).json({
          error: 'FREE_TIER_BLOCKED',
          message: 'Free tier access is disabled. Upgrade required.',
          request_id: req.requestId
        });
      }

      // Classify request as external or internal
      const clientIp = req.ip || req.connection.remoteAddress;
      const isExternal = this.isExternalRequest(clientIp, req.headers);
      
      // Attach user info to request
      req.user = {
        id: user.id,
        tier: user.tier,
        balance: user.balance_credits,
        rateLimitTier: isExternal ? user.tier : 'internal',
        api_key_id: user.id,
        is_external: isExternal
      };
      
      // Log external access
      if (isExternal) {
        console.log(`[GXEON_GATEWAY] 🌐 EXTERNAL REQUEST: ${user.id} from ${clientIp}`);
      } else {
        console.log(`[GXEON_GATEWAY] 🔒 INTERNAL REQUEST: ${user.id} from ${clientIp}`);
      }

      this.metrics.requests_authenticated++;
      console.log(`[GXEON_GATEWAY] ✅ Auth OK: ${user.id} (${user.tier}, ${isExternal ? 'external' : 'internal'})`);
      next();

    } catch (error) {
      console.error('[GXEON_GATEWAY] Auth error:', error);
      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: 'Authentication service error',
        request_id: req.requestId
      });
    }
  }

  async rateLimitByTier(req, res, next) {
    const tier = req.user.rateLimitTier;
    const limits = GATEWAY_CONFIG.rate_limits[tier] || GATEWAY_CONFIG.rate_limits.basic;
    
    // Simple in-memory rate limiting (would use Redis in production)
    const key = `ratelimit:${req.user.id}`;
    const now = Date.now();
    
    // Check if rate limited (simplified - real implementation would use Redis)
    if (this.isRateLimited(key, limits)) {
      this.metrics.requests_rate_limited++;
      console.log(`[GXEON_GATEWAY] ❌ Rate limited: ${req.user.id}`);
      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: `Rate limit exceeded: ${limits.max} requests per ${limits.windowMs/1000}s`,
        retry_after: Math.ceil(limits.windowMs / 1000),
        request_id: req.requestId
      });
    }

    next();
  }

  isRateLimited(key, limits) {
    // Simplified rate limiting - production would use Redis
    // This is a placeholder for the actual implementation
    return false;
  }

  isExternalRequest(clientIp, headers) {
    // Check if request is coming from external source
    const internalNetworks = ['127.0.0.1', '::1', 'localhost', '10.', '192.168.', '172.16.'];
    
    // Check IP
    for (const network of internalNetworks) {
      if (clientIp?.startsWith(network)) return false;
    }
    
    // Check for internal test header
    if (headers['x-test-mode'] === 'internal') return false;
    
    // Check for external flag
    if (headers['x-external-client'] === 'true') return true;
    
    // Default to external for non-local IPs in production mode
    return true;
  }

  async publishToKafka(req, res, next) {
    // Classify request
    const isExternal = req.user.is_external;
    const billingMode = isExternal ? 'REAL' : 'TEST_ONLY';
    
    const event = {
      event_type: 'REQUEST_INBOUND',
      request_id: req.requestId,
      timestamp: req.timestamp,
      user: {
        id: req.user.id,
        tier: req.user.tier,
        balance: req.user.balance,
        api_key_id: req.user.api_key_id
      },
      payload: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.requestId
      },
      metadata: {
        source_ip: req.ip,
        path: req.path,
        method: req.method,
        is_external: isExternal,
        billing_mode: billingMode,
        traffic_type: isExternal ? 'EXTERNAL_AGENT' : 'INTERNAL_TEST'
      },
      billing: {
        enabled: isExternal,
        mode: billingMode,
        cost_estimate_usd: 0.006, // Base + processing
        required_fields: ['api_key_id', 'cost', 'latency', 'success_flag', 'execution_id']
      }
    };

    try {
      // Publish to main request topic
      await this.producer.send({
        topic: KAFKA_TOPICS.request_inbound,
        messages: [{
          key: req.requestId,
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/json',
            'x-user-tier': req.user.tier,
            'x-request-priority': req.user.tier === 'enterprise' ? 'high' : 'normal',
            'x-traffic-type': isExternal ? 'external' : 'internal',
            'x-billing-mode': billingMode
          }
        }]
      });

      // If external request, also publish to external usage stream
      if (isExternal) {
        await this.producer.send({
          topic: KAFKA_TOPICS.external_usage,
          messages: [{
            key: req.requestId,
            value: JSON.stringify({
              event_type: 'EXTERNAL_REQUEST',
              request_id: req.requestId,
              timestamp: req.timestamp,
              api_key_id: req.user.api_key_id,
              tier: req.user.tier,
              source_ip: req.ip,
              billing_mode: 'REAL',
              estimated_revenue: event.billing.cost_estimate_usd
            }),
            headers: {
              'x-external': 'true',
              'x-api-key-id': req.user.api_key_id
            }
          }]
        });
        console.log(`[GXEON_GATEWAY] 📤 External usage logged: ${req.requestId} → ${KAFKA_TOPICS.external_usage}`);
      }

      this.metrics.events_published++;
      console.log(`[GXEON_GATEWAY] 📤 Published: ${req.requestId} → ${KAFKA_TOPICS.request_inbound} (${billingMode})`);
      
      // Attach event info for response
      req.kafkaEvent = event;
      req.isExternal = isExternal;
      req.billingMode = billingMode;
      next();

    } catch (error) {
      this.metrics.kafka_errors++;
      console.error('[GXEON_GATEWAY] Kafka publish error:', error);
      
      // Fail closed - if we can't publish to Kafka, reject the request
      return res.status(503).json({
        error: 'EVENT_BUS_UNAVAILABLE',
        message: 'Unable to queue request. Please retry.',
        request_id: req.requestId
      });
    }
  }

  async handleExecution(req, res) {
    const isExternal = req.isExternal || req.user.is_external;
    const billingMode = req.billingMode || (isExternal ? 'REAL' : 'TEST_ONLY');
    
    // Production readiness check
    if (GATEWAY_CONFIG.external_access.require_api_key && !req.user.api_key_id) {
      return res.status(403).json({
        error: 'PRODUCTION_READINESS_FAIL',
        message: 'External API key required for production execution',
        request_id: req.requestId
      });
    }
    
    // Return immediate acknowledgment
    // Execution happens asynchronously via Kafka consumers
    res.status(202).json({
      status: 'ACCEPTED',
      message: isExternal ? 'Request queued for execution (billing active)' : 'Request queued for execution (test mode)',
      request_id: req.requestId,
      event_id: req.kafkaEvent.request_id,
      billing_mode: billingMode,
      traffic_type: isExternal ? 'EXTERNAL_AGENT' : 'INTERNAL_TEST',
      estimated_execution_time: '2-5 seconds',
      status_check: `/v1/a2a/status/${req.requestId}`,
      user: {
        id: req.user.id,
        tier: req.user.tier,
        remaining_credits: req.user.balance,
        api_key_id: req.user.api_key_id
      },
      billing: isExternal ? {
        enabled: true,
        ledger_table: 'gx_billing_ledger',
        required_fields: ['api_key_id', 'cost', 'latency', 'success_flag', 'execution_id'],
        estimated_cost_usd: 0.006
      } : {
        enabled: false,
        mode: 'TEST_ONLY',
        note: 'No billing for internal test requests'
      }
    });
  }

  async getRequestStatus(req, res) {
    const { requestId } = req.params;
    
    try {
      // Query execution status from Supabase
      const { data: execution, error } = await supabase
        .from('gx_execution_log')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (error) {
        // Check if request is still pending
        const { data: pending } = await supabase
          .from('request_queue')
          .select('*')
          .eq('request_id', requestId)
          .single();

        if (pending) {
          return res.json({
            request_id: requestId,
            status: 'PENDING',
            queued_at: pending.created_at,
            position_in_queue: pending.position || 0
          });
        }

        return res.status(404).json({
          error: 'REQUEST_NOT_FOUND',
          message: 'Request ID not found'
        });
      }

      res.json({
        request_id: requestId,
        status: execution.success ? 'COMPLETED' : 'FAILED',
        execution_id: execution.execution_id,
        completed_at: execution.timestamp,
        result: execution.result_data,
        billing: {
          charged: execution.billed,
          amount_usd: execution.cost_usd
        }
      });

    } catch (error) {
      console.error('[GXEON_GATEWAY] Status check error:', error);
      res.status(500).json({
        error: 'STATUS_CHECK_ERROR',
        message: 'Unable to retrieve request status'
      });
    }
  }

  getMetrics(req, res) {
    res.json({
      gateway: 'GXEON_API_GATEWAY',
      version: '1.0.0',
      mode: GATEWAY_CONFIG.mode,
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      config: {
        port: GATEWAY_CONFIG.port,
        kafka_brokers: GATEWAY_CONFIG.kafka.brokers,
        topics: KAFKA_TOPICS
      }
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `${req.method} ${req.path} is not a valid endpoint`,
        valid_endpoints: [
          'POST /v1/a2a/execute',
          'GET /v1/a2a/status/:requestId',
          'GET /v1/a2a/metrics',
          'GET /health'
        ]
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('[GXEON_GATEWAY] Unhandled error:', err);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        request_id: req.requestId || 'unknown'
      });
    });
  }

  async shutdown() {
    console.log('[GXEON_GATEWAY] Shutting down...');
    
    if (this.server) {
      this.server.close();
    }
    
    await this.producer.disconnect();
    console.log('[GXEON_GATEWAY] Disconnected from Kafka');
    console.log('[GXEON_GATEWAY] Final metrics:', this.metrics);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT AND RUN
// ═══════════════════════════════════════════════════════════════════════════
module.exports = { GXEONApiGateway, GATEWAY_CONFIG, KAFKA_TOPICS };

// Run if called directly
if (require.main === module) {
  const gateway = new GXEONApiGateway();
  
  gateway.initialize().catch(error => {
    console.error('[GXEON_GATEWAY] Fatal error:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[GXEON_GATEWAY] SIGINT received');
    await gateway.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[GXEON_GATEWAY] SIGTERM received');
    await gateway.shutdown();
    process.exit(0);
  });
}
