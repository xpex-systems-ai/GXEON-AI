import { appendFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import os from 'os';

const MAX_ERRORS = 100;
const MAX_EVENTS = 500;
const RUNTIME_LOG_DIR = 'logs/runtime';
const ERROR_LOG_PATH = join(RUNTIME_LOG_DIR, 'errors.ndjson');
const RUNTIME_LOG_PATH = join(RUNTIME_LOG_DIR, 'runtime.ndjson');

class RuntimeTelemetry {
  constructor() {
    this.startedAt = Date.now();
    this.events = [];
    this.errors = [];
    this.requestStats = {
      total: 0,
      byRoute: {},
      statusCodes: {},
      latencyMs: {
        count: 0,
        total: 0,
        max: 0
      }
    };
    this.modules = new Map();
    this.execution = {
      pendingTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      monetizationEvents: 0,
      revenueUsd: 0
    };
    this.websocket = {
      status: 'unknown',
      active: 0,
      failures: 0,
      lastEventAt: null
    };
    mkdirSync(RUNTIME_LOG_DIR, { recursive: true });
  }

  log(level, message, meta = {}) {
    const event = {
      ts: new Date().toISOString(),
      level,
      message,
      meta
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();

    try {
      appendFileSync(RUNTIME_LOG_PATH, `${JSON.stringify(event)}\n`);
    } catch (error) {
      console.error('[GXEON_OBSERVABILITY] runtime log write failed:', error.message);
    }

    const line = `[GXEON_${level.toUpperCase()}] ${message}`;
    if (level === 'error') console.error(line, meta);
    else if (level === 'warn') console.warn(line, meta);
    else console.log(line, meta);
  }

  captureError(error, context = {}) {
    const normalized = {
      ts: new Date().toISOString(),
      name: error?.name || 'Error',
      message: error?.message || String(error),
      stack: error?.stack || null,
      context
    };

    this.errors.push(normalized);
    if (this.errors.length > MAX_ERRORS) this.errors.shift();

    try {
      appendFileSync(ERROR_LOG_PATH, `${JSON.stringify(normalized)}\n`);
    } catch (writeError) {
      console.error('[GXEON_OBSERVABILITY] error log write failed:', writeError.message);
    }

    return normalized;
  }

  requestMiddleware() {
    return (req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        const latency = Date.now() - started;
        const routeKey = req.route?.path || req.path || req.url || 'unknown';
        this.requestStats.total += 1;
        this.requestStats.byRoute[routeKey] = (this.requestStats.byRoute[routeKey] || 0) + 1;
        this.requestStats.statusCodes[res.statusCode] = (this.requestStats.statusCodes[res.statusCode] || 0) + 1;
        this.requestStats.latencyMs.count += 1;
        this.requestStats.latencyMs.total += latency;
        this.requestStats.latencyMs.max = Math.max(this.requestStats.latencyMs.max, latency);
      });
      next();
    };
  }

  markModule(name, status, details = {}) {
    this.modules.set(name, {
      name,
      status,
      details,
      updatedAt: new Date().toISOString()
    });
  }

  recordTask(status = 'completed') {
    if (status === 'pending') this.execution.pendingTasks += 1;
    if (status === 'completed') this.execution.completedTasks += 1;
    if (status === 'failed') this.execution.failedTasks += 1;
    if (status !== 'pending' && this.execution.pendingTasks > 0) this.execution.pendingTasks -= 1;
  }

  recordMonetization(amountUsd = 0) {
    this.execution.monetizationEvents += 1;
    this.execution.revenueUsd += Number(amountUsd) || 0;
  }

  updateWebSocketStatus(status, patch = {}) {
    this.websocket = {
      ...this.websocket,
      status,
      ...patch,
      lastEventAt: new Date().toISOString()
    };
  }

  getMetrics(providerGuardian = null, watchdog = null) {
    const memory = process.memoryUsage();
    const avgLatency = this.requestStats.latencyMs.count > 0
      ? Math.round(this.requestStats.latencyMs.total / this.requestStats.latencyMs.count)
      : 0;

    return {
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heap_total: memory.heapTotal,
        heap_used: memory.heapUsed,
        external: memory.external
      },
      cpu: {
        load_average: os.loadavg(),
        cores: os.cpus()?.length || 0
      },
      active_agents: Array.from(this.modules.values()).filter((module) => module.status === 'healthy').length,
      active_providers: providerGuardian?.getStatus().summary.healthy || 0,
      websocket_status: this.websocket,
      pending_tasks: this.execution.pendingTasks,
      execution_rate: {
        completed: this.execution.completedTasks,
        failed: this.execution.failedTasks,
        requests: this.requestStats.total,
        avg_latency_ms: avgLatency,
        max_latency_ms: this.requestStats.latencyMs.max
      },
      monetization_stats: {
        events: this.execution.monetizationEvents,
        revenue_usd: Number(this.execution.revenueUsd.toFixed(6))
      },
      providers: providerGuardian?.getStatus() || null,
      watchdog: watchdog?.getStatus() || null
    };
  }

  getRuntime(providerGuardian = null, watchdog = null) {
    return {
      mode: process.env.GXEON_RUNTIME_MODE || 'SAFE_AUTONOMOUS_PRODUCTION',
      deployment_target: detectDeploymentTarget(),
      node_env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      started_at: new Date(this.startedAt).toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      modules: Array.from(this.modules.values()),
      provider_health: providerGuardian?.getStatus() || null,
      watchdog: watchdog?.getStatus() || null,
      recent_events: this.events.slice(-25)
    };
  }

  getErrors() {
    return {
      count: this.errors.length,
      recent: this.errors.slice(-50),
      log_path: ERROR_LOG_PATH
    };
  }
}

export function detectDeploymentTarget() {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) return 'railway';
  if (process.env.VERCEL || process.env.VERCEL_ENV) return 'vercel';
  if (process.env.RENDER) return 'render';
  if (process.env.FLY_APP_NAME) return 'fly';
  return process.env.DEPLOYMENT_TARGET || 'local';
}

export const telemetry = new RuntimeTelemetry();
export default telemetry;
