'use strict';

const counters = new Map();
const cache = new Map();

function sanitizeProviderLog(key, details) {
  const state = details?.state || 'RECOVERING';
  const nextRetry = details?.next_retry_seconds ?? 5;
  const cacheKey = `${key}:${state}:${nextRetry}`;
  const current = (counters.get(cacheKey) || 0) + 1;
  counters.set(cacheKey, current);

  const line = `[SIGNAL_PROVIDER] reconnect_attempts: ${current} state: ${state} next_retry: ${nextRetry}s`;
  cache.set(cacheKey, line);
  return line;
}

function getSanitizedProviderSummary() {
  const rows = [];
  for (const [k, count] of counters.entries()) {
    rows.push({ key: k, count, message: cache.get(k) });
  }
  return rows.sort((a, b) => b.count - a.count);
}

module.exports = { sanitizeProviderLog, getSanitizedProviderSummary };
