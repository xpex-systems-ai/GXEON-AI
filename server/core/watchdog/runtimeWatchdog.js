import os from 'os';
import telemetry from '../observability/runtimeTelemetry.js';

const DEFAULT_WATCHES = [
  'radar',
  'signal_providers',
  'supabase',
  'websocket_streams',
  'scanners',
  'monetization_engine'
];

export class RuntimeWatchdog {
  constructor(options = {}) {
    this.options = {
      heartbeatTtlMs: options.heartbeatTtlMs || 120000,
      memoryRssLimitBytes: options.memoryRssLimitBytes || Number(process.env.GXEON_MEMORY_RSS_LIMIT_BYTES || 512 * 1024 * 1024),
      alertSink: options.alertSink || null
    };
    this.watches = new Map();
    this.restarts = [];
    this.alerts = [];
    this.startedAt = Date.now();
    DEFAULT_WATCHES.forEach((name) => this.register(name));
  }

  register(name, metadata = {}) {
    if (!this.watches.has(name)) {
      this.watches.set(name, {
        name,
        state: 'ready',
        metadata,
        lastHeartbeatAt: Date.now(),
        staleCount: 0,
        restartCount: 0,
        lastRestartAt: null,
        lastError: null
      });
    }
    return this.watches.get(name);
  }

  heartbeat(name, metadata = {}) {
    const watch = this.register(name, metadata);
    watch.state = 'healthy';
    watch.metadata = { ...watch.metadata, ...metadata };
    watch.lastHeartbeatAt = Date.now();
    watch.lastError = null;
    telemetry.markModule(`watchdog:${name}`, 'healthy', watch);
    return watch;
  }

  reportError(name, error, metadata = {}) {
    const watch = this.register(name, metadata);
    watch.state = 'degraded';
    watch.lastError = error?.message || String(error);
    watch.metadata = { ...watch.metadata, ...metadata };
    telemetry.captureError(error, { component: 'watchdog', module: name });
    telemetry.markModule(`watchdog:${name}`, 'degraded', watch);
    return watch;
  }

  restart(name, reason = 'watchdog_restart') {
    const watch = this.register(name);
    watch.restartCount += 1;
    watch.lastRestartAt = Date.now();
    watch.lastHeartbeatAt = Date.now();
    watch.state = 'restarted';
    const event = {
      name,
      reason,
      restarted_at: new Date().toISOString(),
      restart_count: watch.restartCount
    };
    this.restarts.push(event);
    if (this.restarts.length > 50) this.restarts.shift();
    this.alert('watchdog_restart', event);
    telemetry.markModule(`watchdog:${name}`, 'restarted', watch);
    return event;
  }

  alert(type, payload) {
    const alert = {
      type,
      payload,
      ts: new Date().toISOString(),
      sink: process.env.SLACK_WEBHOOK_URL ? 'slack_configured' : 'local'
    };
    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
    telemetry.log('warn', `Watchdog alert: ${type}`, payload);
    return alert;
  }

  scan(providerGuardian = null, supabaseSnapshot = null) {
    const now = Date.now();
    for (const watch of this.watches.values()) {
      if (now - watch.lastHeartbeatAt > this.options.heartbeatTtlMs) {
        watch.staleCount += 1;
        watch.state = 'stalled';
        this.restart(watch.name, 'stalled_loop_detected');
      }
    }

    const memory = process.memoryUsage();
    if (memory.rss > this.options.memoryRssLimitBytes) {
      this.alert('memory_leak_suspected', {
        rss: memory.rss,
        limit: this.options.memoryRssLimitBytes
      });
    }

    const providerStatus = providerGuardian?.getStatus();
    if (providerStatus?.runtime === 'degraded') {
      this.reportError('signal_providers', new Error('Provider runtime degraded'), providerStatus.summary);
    }

    if (supabaseSnapshot && supabaseSnapshot.runtime !== 'healthy') {
      this.reportError('supabase', new Error(`Supabase ${supabaseSnapshot.runtime}`), supabaseSnapshot);
    }

    return this.getStatus();
  }

  getStatus() {
    const watches = Array.from(this.watches.values()).map((watch) => ({
      ...watch,
      lastHeartbeatAt: new Date(watch.lastHeartbeatAt).toISOString(),
      lastRestartAt: watch.lastRestartAt ? new Date(watch.lastRestartAt).toISOString() : null
    }));
    const unhealthy = watches.filter((watch) => ['stalled', 'degraded'].includes(watch.state));

    return {
      state: unhealthy.length ? 'degraded' : 'ready',
      uptime_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      watches,
      restarts: this.restarts.slice(-25),
      alerts: this.alerts.slice(-25),
      memory: process.memoryUsage(),
      cpu: {
        load_average: os.loadavg()
      }
    };
  }
}

export const runtimeWatchdog = new RuntimeWatchdog();
export default runtimeWatchdog;
