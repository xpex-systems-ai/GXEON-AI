'use strict';

const counters = new Map();

function sanitizeProviderLog(key, details) {
  const count = (counters.get(key) || 0) + 1;
  counters.set(key, count);
  const nextRetry = details?.next_retry_seconds ?? 5;
  return `[SIGNAL_PROVIDER] reconnect_attempts: ${count} state: ${details?.state || 'RECOVERING'} next_retry: ${nextRetry}s`;
}

module.exports = { sanitizeProviderLog };
