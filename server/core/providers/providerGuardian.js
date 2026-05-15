import telemetry from '../observability/runtimeTelemetry.js';

export const PROVIDER_STATES = Object.freeze({
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  RECONNECTING: 'reconnecting',
  QUARANTINED: 'quarantined',
  OFFLINE: 'offline'
});

const DEFAULT_OPTIONS = {
  baseBackoffMs: 500,
  maxBackoffMs: 30000,
  maxFailuresBeforeQuarantine: 3,
  quarantineMs: 60000,
  heartbeatTtlMs: 120000
};

export class ProviderGuardian {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.providers = new Map();
    this.startedAt = Date.now();
  }

  registerProvider(name, endpoints = [], metadata = {}) {
    const existing = this.providers.get(name);
    const provider = {
      name,
      endpoints: endpoints.length ? endpoints : existing?.endpoints || [],
      activeEndpointIndex: existing?.activeEndpointIndex || 0,
      state: existing?.state || PROVIDER_STATES.DEGRADED,
      failures: existing?.failures || 0,
      reconnectAttempts: existing?.reconnectAttempts || 0,
      quarantinedUntil: existing?.quarantinedUntil || null,
      lastHeartbeatAt: existing?.lastHeartbeatAt || null,
      lastError: existing?.lastError || null,
      metrics: existing?.metrics || {
        successes: 0,
        failures: 0,
        rotations: 0,
        quarantines: 0,
        recoveries: 0
      },
      metadata,
      updatedAt: new Date().toISOString()
    };

    this.providers.set(name, provider);
    telemetry.markModule(`provider:${name}`, provider.state, provider);
    return provider;
  }

  heartbeat(name, metadata = {}) {
    const provider = this.providers.get(name) || this.registerProvider(name, [], metadata);
    provider.lastHeartbeatAt = Date.now();
    provider.updatedAt = new Date().toISOString();
    provider.metrics.successes += 1;
    provider.failures = 0;
    provider.reconnectAttempts = 0;
    provider.lastError = null;
    provider.metadata = { ...provider.metadata, ...metadata };

    if (provider.state !== PROVIDER_STATES.HEALTHY) {
      provider.metrics.recoveries += 1;
    }
    provider.state = PROVIDER_STATES.HEALTHY;
    provider.quarantinedUntil = null;
    telemetry.markModule(`provider:${name}`, provider.state, provider);
    return provider;
  }

  reportFailure(name, error, metadata = {}) {
    const provider = this.providers.get(name) || this.registerProvider(name, [], metadata);
    provider.failures += 1;
    provider.metrics.failures += 1;
    provider.lastError = error?.message || String(error);
    provider.metadata = { ...provider.metadata, ...metadata };
    provider.updatedAt = new Date().toISOString();

    if (provider.failures >= this.options.maxFailuresBeforeQuarantine) {
      provider.state = PROVIDER_STATES.QUARANTINED;
      provider.quarantinedUntil = Date.now() + this.options.quarantineMs;
      provider.metrics.quarantines += 1;
      telemetry.log('warn', 'Provider quarantined', { name, error: provider.lastError });
    } else {
      provider.state = PROVIDER_STATES.RECONNECTING;
      this.rotateProvider(name);
    }

    telemetry.markModule(`provider:${name}`, provider.state, provider);
    return provider;
  }

  rotateProvider(name) {
    const provider = this.providers.get(name);
    if (!provider || provider.endpoints.length <= 1) return provider;
    provider.activeEndpointIndex = (provider.activeEndpointIndex + 1) % provider.endpoints.length;
    provider.metrics.rotations += 1;
    provider.updatedAt = new Date().toISOString();
    return provider;
  }

  getBackoffMs(name) {
    const provider = this.providers.get(name);
    const attempts = provider?.reconnectAttempts || 0;
    return Math.min(this.options.baseBackoffMs * (2 ** attempts), this.options.maxBackoffMs);
  }

  async reconnect(name, connectFn) {
    const provider = this.providers.get(name) || this.registerProvider(name);

    if (provider.state === PROVIDER_STATES.QUARANTINED && provider.quarantinedUntil > Date.now()) {
      return provider;
    }

    provider.state = PROVIDER_STATES.RECONNECTING;
    provider.reconnectAttempts += 1;
    telemetry.markModule(`provider:${name}`, provider.state, provider);

    const backoffMs = this.getBackoffMs(name);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    try {
      await connectFn(provider.endpoints[provider.activeEndpointIndex], provider);
      return this.heartbeat(name, { reconnected: true });
    } catch (error) {
      return this.reportFailure(name, error);
    }
  }

  sweep() {
    const now = Date.now();
    for (const provider of this.providers.values()) {
      if (provider.state === PROVIDER_STATES.QUARANTINED && provider.quarantinedUntil <= now) {
        provider.state = PROVIDER_STATES.DEGRADED;
        provider.quarantinedUntil = null;
      }

      if (provider.lastHeartbeatAt && now - provider.lastHeartbeatAt > this.options.heartbeatTtlMs) {
        provider.state = provider.failures > 0 ? PROVIDER_STATES.DEGRADED : PROVIDER_STATES.OFFLINE;
      }
      provider.updatedAt = new Date().toISOString();
      telemetry.markModule(`provider:${provider.name}`, provider.state, provider);
    }
  }

  getStatus() {
    this.sweep();
    const providers = Array.from(this.providers.values()).map((provider) => ({
      name: provider.name,
      state: provider.state,
      active_endpoint: provider.endpoints[provider.activeEndpointIndex] || null,
      endpoints: provider.endpoints.length,
      failures: provider.failures,
      reconnect_attempts: provider.reconnectAttempts,
      quarantined_until: provider.quarantinedUntil ? new Date(provider.quarantinedUntil).toISOString() : null,
      last_heartbeat_at: provider.lastHeartbeatAt ? new Date(provider.lastHeartbeatAt).toISOString() : null,
      last_error: provider.lastError,
      metrics: provider.metrics,
      metadata: provider.metadata,
      updated_at: provider.updatedAt
    }));

    const summary = providers.reduce((acc, provider) => {
      acc[provider.state] = (acc[provider.state] || 0) + 1;
      return acc;
    }, { healthy: 0, degraded: 0, reconnecting: 0, quarantined: 0, offline: 0 });

    return {
      runtime: providers.length > 0 && providers.every((provider) => provider.state === PROVIDER_STATES.HEALTHY)
        ? 'healthy'
        : 'degraded',
      summary,
      providers,
      updated_at: new Date().toISOString()
    };
  }
}

export const providerGuardian = new ProviderGuardian();
export default providerGuardian;
