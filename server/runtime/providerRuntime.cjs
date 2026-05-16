'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { sanitizeProviderLog } = require('./runtimeLogSanitizer.cjs');

const backoffSteps = [5, 10, 20, 40, 60];
const MIN_RETRY_INTERVAL_MS = 1000;

function nowIso() { return new Date().toISOString(); }

function getBackoffSeconds(retryCount) {
  const idx = Math.max(0, Math.min(retryCount, backoffSteps.length - 1));
  return backoffSteps[idx];
}

function getProviderRuntimeStatus() {
  const mem = readMemory();
  const retryCount = mem.provider_retry_count || 0;
  const nextRetry = getBackoffSeconds(retryCount);
  const state = mem.provider_state || 'CONNECTED';
  return {
    provider: state,
    websocket_keepalive: state === 'CONNECTED' ? 'ACTIVE' : 'RECOVERING',
    heartbeat: mem.provider_heartbeat || 'ONLINE',
    cooldown: retryCount > 0,
    retry_queue: mem.provider_retry_queue || [],
    retry_count: retryCount,
    next_retry_seconds: nextRetry,
    last_successful_connection: mem.last_successful_connection || nowIso(),
    last_disconnect_at: mem.last_disconnect_at || null,
    disconnect_reason: mem.disconnect_reason || null,
    jitter_protection: true,
    reconnect_loop_protection: true,
    generated_at: nowIso(),
  };
}

function registerProviderConnected() {
  const mem = readMemory();
  return writeMemory({
    provider_state: 'CONNECTED',
    provider_heartbeat: 'ONLINE',
    provider_retry_count: 0,
    provider_retry_queue: [],
    disconnect_reason: null,
    last_successful_connection: nowIso(),
    last_provider_transition: 'CONNECTED',
    reconnect_history: mem.reconnect_history || [],
  });
}

function registerProviderDisconnect(reason = 'unknown') {
  const mem = readMemory();
  const now = Date.now();
  const lastAttemptMs = mem.provider_last_attempt_ms || 0;
  if (now - lastAttemptMs < MIN_RETRY_INTERVAL_MS) {
    return { skipped: true, log: sanitizeProviderLog('disconnect-throttled', { state: 'COOLDOWN', next_retry_seconds: 1 }) };
  }

  const retryCount = (mem.provider_retry_count || 0) + 1;
  const nextRetry = getBackoffSeconds(retryCount - 1);
  const updated = writeMemory({
    provider_state: 'RECOVERING',
    provider_heartbeat: 'DEGRADED',
    provider_retry_count: retryCount,
    provider_last_attempt_ms: now,
    provider_cooldown_until_ms: now + (nextRetry * 1000),
    provider_retry_queue: [...(mem.provider_retry_queue || []), `retry_in_${nextRetry}s`].slice(-20),
    disconnect_reason: reason,
    last_disconnect_at: nowIso(),
    reconnect_history: [...(mem.reconnect_history || []), { at: nowIso(), reason, nextRetry }].slice(-100),
  });
  return { updated, log: sanitizeProviderLog('disconnect', { state: 'RECOVERING', next_retry_seconds: nextRetry }) };
}

module.exports = { getProviderRuntimeStatus, registerProviderDisconnect, registerProviderConnected };
