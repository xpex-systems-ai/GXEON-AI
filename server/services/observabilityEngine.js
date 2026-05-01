#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OBSERVABILITY ENGINE v1.0 - System Monitoring & Event Tracking
 * 
 * Features:
 * - Real-time event logging
 * - Signal lifecycle tracking
 * - Payment event monitoring
 * - Error tracking
 * - Performance metrics
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import EventEmitter from 'events';

// Event types
const EVENT_TYPES = {
  SIGNAL: {
    CREATED: 'SIGNAL_CREATED',
    SENT: 'SIGNAL_SENT',
    FAILED: 'SIGNAL_FAILED',
    HIT_TARGET: 'SIGNAL_HIT_TARGET',
    HIT_STOP: 'SIGNAL_HIT_STOP',
    EXPIRED: 'SIGNAL_EXPIRED',
    VALIDATED: 'SIGNAL_VALIDATED'
  },
  PAYMENT: {
    CREATED: 'PAYMENT_CREATED',
    CONFIRMED: 'PAYMENT_CONFIRMED',
    FAILED: 'PAYMENT_FAILED',
    REFUNDED: 'PAYMENT_REFUNDED'
  },
  USER: {
    REGISTERED: 'USER_REGISTERED',
    SUBSCRIBED: 'USER_SUBSCRIBED',
    UPGRADED: 'USER_UPGRADED',
    REFERRED: 'USER_REFERRED',
    CONVERTED: 'USER_CONVERTED'
  },
  SYSTEM: {
    STARTUP: 'SYSTEM_STARTUP',
    ERROR: 'SYSTEM_ERROR',
    WARNING: 'SYSTEM_WARNING',
    HEALTH_CHECK: 'SYSTEM_HEALTH_CHECK'
  }
};

class ObservabilityEngine extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.metrics = {
      requests: new Map(), // endpoint -> { count, errors, latencies }
      signals: {
        created: 0,
        sent: 0,
        failed: 0,
        hit_target: 0,
        hit_stop: 0
      },
      payments: {
        created: 0,
        confirmed: 0,
        failed: 0,
        total_revenue: 0
      },
      errors: [],
      latency_samples: []
    };
    
    this.startTime = Date.now();
    this.isConnected = false;
    
    this.init();
  }
  
  async init() {
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isConnected = true;
    }
    
    this.startMetricsAggregation();
    console.log('[🔍 Observability] Engine initialized');
  }
  
  /**
   * Log event to database and emit
   */
  async logEvent(eventType, payload, severity = 'info') {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      severity,
      payload,
      timestamp: new Date().toISOString(),
      source: payload.source || 'system'
    };
    
    // Store in Supabase
    if (this.isConnected) {
      try {
        await this.supabase
          .from('observability_events')
          .insert({
            event_id: event.id,
            event_type: eventType,
            severity,
            payload: payload,
            source: payload.source,
            created_at: event.timestamp
          });
      } catch (err) {
        console.error('[🔍 Observability] Failed to log event:', err);
      }
    }
    
    // Emit for real-time consumers
    this.emit('event', event);
    this.emit(`event:${eventType}`, event);
    
    // Update metrics
    this.updateMetrics(eventType, payload);
    
    return event;
  }
  
  /**
   * Track signal lifecycle
   */
  async trackSignalLifecycle(signalId, stage, data = {}) {
    const eventType = EVENT_TYPES.SIGNAL[stage];
    
    if (!eventType) {
      console.warn(`[🔍 Observability] Unknown signal stage: ${stage}`);
      return;
    }
    
    await this.logEvent(eventType, {
      signal_id: signalId,
      ...data,
      source: 'signal_lifecycle'
    });
    
    // Update signal tracking
    if (this.isConnected) {
      try {
        await this.supabase
          .from('signal_lifecycle_tracking')
          .insert({
            signal_id: signalId,
            stage: stage.toLowerCase(),
            data: data,
            tracked_at: new Date().toISOString()
          });
      } catch (err) {
        // Silent
      }
    }
  }
  
  /**
   * Track payment event
   */
  async trackPayment(paymentType, status, data) {
    const eventType = EVENT_TYPES.PAYMENT[status];
    
    await this.logEvent(eventType, {
      payment_type: paymentType,
      ...data,
      source: 'payment_system'
    }, status === 'FAILED' ? 'error' : 'info');
    
    // Update revenue metrics
    if (status === 'CONFIRMED' && data.amount) {
      this.metrics.payments.confirmed++;
      this.metrics.payments.total_revenue += parseFloat(data.amount);
    } else if (status === 'CREATED') {
      this.metrics.payments.created++;
    } else if (status === 'FAILED') {
      this.metrics.payments.failed++;
    }
  }
  
  /**
   * Track API request
   */
  trackApiRequest(endpoint, method, latencyMs, statusCode) {
    const key = `${method} ${endpoint}`;
    
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        errors: 0,
        latencies: [],
        last_error: null
      });
    }
    
    const metrics = this.metrics.requests.get(key);
    metrics.count++;
    metrics.latencies.push(latencyMs);
    
    if (statusCode >= 400) {
      metrics.errors++;
      metrics.last_error = new Date().toISOString();
    }
    
    // Keep only last 100 latencies
    if (metrics.latencies.length > 100) {
      metrics.latencies.shift();
    }
    
    // Global latency tracking
    this.metrics.latency_samples.push(latencyMs);
    if (this.metrics.latency_samples.length > 1000) {
      this.metrics.latency_samples.shift();
    }
  }
  
  /**
   * Track error
   */
  async trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.errors.push(errorData);
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
    
    await this.logEvent(EVENT_TYPES.SYSTEM.ERROR, {
      error: error.message,
      stack: error.stack,
      ...context,
      source: 'error_handler'
    }, 'error');
  }
  
  /**
   * Get real-time stats
   */
  getStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Calculate average latency
    const avgLatency = this.metrics.latency_samples.length > 0
      ? this.metrics.latency_samples.reduce((a, b) => a + b, 0) / this.metrics.latency_samples.length
      : 0;
    
    // Calculate error rate
    const totalRequests = Array.from(this.metrics.requests.values())
      .reduce((sum, m) => sum + m.count, 0);
    const totalErrors = Array.from(this.metrics.requests.values())
      .reduce((sum, m) => sum + m.errors, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    return {
      uptime,
      signals: this.metrics.signals,
      payments: {
        ...this.metrics.payments,
        conversion_rate: this.metrics.payments.created > 0
          ? (this.metrics.payments.confirmed / this.metrics.payments.created * 100).toFixed(2)
          : 0
      },
      api: {
        total_requests: totalRequests,
        total_errors: totalErrors,
        error_rate: errorRate.toFixed(2),
        avg_latency_ms: Math.round(avgLatency),
        endpoints: Array.from(this.metrics.requests.entries()).map(([key, m]) => ({
          endpoint: key,
          count: m.count,
          errors: m.errors,
          avg_latency: m.latencies.length > 0
            ? Math.round(m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length)
            : 0
        }))
      },
      recent_errors: this.metrics.errors.slice(-5)
    };
  }
  
  /**
   * Get events for dashboard
   */
  async getRecentEvents(limit = 50) {
    if (!this.isConnected) {
      return [];
    }
    
    try {
      const { data } = await this.supabase
        .from('observability_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return data || [];
    } catch (err) {
      return [];
    }
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    const checks = {
      database: false,
      event_logging: false,
      metrics: false
    };
    
    if (this.isConnected) {
      try {
        const { error } = await this.supabase
          .from('observability_events')
          .select('count')
          .limit(1);
        
        checks.database = !error;
        checks.event_logging = true;
      } catch (err) {
        checks.database = false;
      }
    }
    
    checks.metrics = this.metrics.latency_samples.length > 0;
    
    const allHealthy = Object.values(checks).every(c => c);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  updateMetrics(eventType, payload) {
    // Signal metrics
    if (eventType === EVENT_TYPES.SIGNAL.CREATED) {
      this.metrics.signals.created++;
    } else if (eventType === EVENT_TYPES.SIGNAL.SENT) {
      this.metrics.signals.sent++;
    } else if (eventType === EVENT_TYPES.SIGNAL.FAILED) {
      this.metrics.signals.failed++;
    } else if (eventType === EVENT_TYPES.SIGNAL.HIT_TARGET) {
      this.metrics.signals.hit_target++;
    } else if (eventType === EVENT_TYPES.SIGNAL.HIT_STOP) {
      this.metrics.signals.hit_stop++;
    }
  }
  
  startMetricsAggregation() {
    // Aggregate metrics every minute
    setInterval(async () => {
      if (this.isConnected) {
        try {
          await this.supabase
            .from('observability_metrics')
            .insert({
              timestamp: new Date().toISOString(),
              metrics: this.getStats(),
              period: '1m'
            });
        } catch (err) {
          // Silent
        }
      }
    }, 60000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════════════════════

function createObservabilityMiddleware(observability) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.json to track response
    const originalJson = res.json;
    res.json = function(data) {
      const latency = Date.now() - startTime;
      
      observability.trackApiRequest(
        req.path,
        req.method,
        latency,
        res.statusCode
      );
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
const observability = new ObservabilityEngine();

export {
  ObservabilityEngine,
  EVENT_TYPES,
  observability,
  createObservabilityMiddleware
};
export default observability;
