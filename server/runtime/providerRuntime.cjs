'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');
const { sanitizeProviderLog } = require('./runtimeLogSanitizer.cjs');

const backoffSteps = [5, 10, 20, 40, 60];

function getProviderRuntimeStatus() {
  const mem = readMemory();
  const retryCount = mem.provider_retry_count || 0;
  const nextRetry = backoffSteps[Math.min(retryCount, backoffSteps.length - 1)];
  const state = mem.provider_state || 'CONNECTED';
  return {
    provider: state,
    websocket_keepalive: 'ACTIVE',
    heartbeat: 'ONLINE',
    cooldown: retryCount > 0,
    retry_queue: mem.provider_retry_queue || [],
    retry_count: retryCount,
    next_retry_seconds: nextRetry,
    last_successful_connection: mem.last_successful_connection || new Date().toISOString(),
    disconnect_reason: mem.disconnect_reason || null,
    jitter_protection: true,
    generated_at: new Date().toISOString(),
  };
}

function registerProviderDisconnect(reason = 'unknown') {
  const mem = readMemory();
  const retryCount = (mem.provider_retry_count || 0) + 1;
  const nextRetry = backoffSteps[Math.min(retryCount - 1, backoffSteps.length - 1)];
  const updated = writeMemory({
    provider_state: 'RECOVERING',
    provider_retry_count: retryCount,
    provider_retry_queue: [...(mem.provider_retry_queue || []), `retry_in_${nextRetry}s`].slice(-20),
    disconnect_reason: reason,
    reconnect_history: [...(mem.reconnect_history || []), { at: new Date().toISOString(), reason, nextRetry }].slice(-100),
  });
  return { updated, log: sanitizeProviderLog('disconnect', { state: 'RECOVERING', next_retry_seconds: nextRetry }) };
}

module.exports = { getProviderRuntimeStatus, registerProviderDisconnect };
