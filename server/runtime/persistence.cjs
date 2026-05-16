'use strict';

const crypto = require('crypto');
const { createRequire } = require('module');
const { getSupabaseUrl, getSupabaseKey, validateSupabaseEnv } = require('./compatibility.cjs');

const requireFromServer = createRequire(`${__dirname}/../index.js`);

const TABLES = Object.freeze([
  'swarm_tasks',
  'swarm_agents',
  'swarm_events',
  'swarm_memory',
  'monetization_ledger',
  'runtime_metrics',
  'deployment_reports',
  'recovery_reports'
]);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function boundedPush(list, item, max = 250) {
  list.unshift(item);
  if (list.length > max) list.length = max;
}

class RuntimePersistenceService {
  constructor() {
    this.validation = validateSupabaseEnv();
    this.supabase = null;
    this.status = this.validation.configured ? 'initializing' : 'degraded';
    this.mode = this.validation.configured ? 'supabase' : 'memory';
    this.retryQueue = [];
    this.idempotencyKeys = new Set();
    this.buffers = Object.fromEntries(TABLES.map((table) => [table, []]));
    this.stats = {
      writes_attempted: 0,
      writes_persisted: 0,
      writes_buffered: 0,
      writes_deduplicated: 0,
      retries_attempted: 0,
      retries_succeeded: 0,
      last_write_at: null,
      last_error: null
    };
    this.initializeSupabase();
  }

  initializeSupabase() {
    if (!this.validation.configured) return;

    try {
      const { createClient } = requireFromServer('@supabase/supabase-js');
      this.supabase = createClient(getSupabaseUrl(), getSupabaseKey(), {
        auth: { persistSession: false },
        global: { headers: { 'x-application-name': 'gxeon-phase5-persistence' } }
      });
      this.status = 'ready';
    } catch (error) {
      this.status = 'degraded';
      this.mode = 'memory';
      this.stats.last_error = error.message;
    }
  }

  normalizeTable(table) {
    if (!TABLES.includes(table)) throw new Error(`Unsupported persistence table: ${table}`);
    return table;
  }

  buildRecord(table, payload, idempotencyKey) {
    const now = new Date().toISOString();
    const eventId = idempotencyKey || payload?.idempotency_key || payload?.id || stableHash({ table, payload });
    return {
      idempotency_key: eventId,
      source: payload?.source || 'gxeon-runtime',
      status: payload?.status || 'recorded',
      payload: payload || {},
      metadata: payload?.metadata || {},
      created_at: payload?.created_at || now,
      updated_at: now
    };
  }

  async persist(table, payload = {}, options = {}) {
    const target = this.normalizeTable(table);
    const idempotencyKey = options.idempotencyKey || payload.idempotency_key || payload.id || stableHash({ target, payload });
    const scopedKey = `${target}:${idempotencyKey}`;
    this.stats.writes_attempted += 1;

    if (this.idempotencyKeys.has(scopedKey)) {
      this.stats.writes_deduplicated += 1;
      return { persisted: false, deduplicated: true, table: target, idempotency_key: idempotencyKey };
    }

    const record = this.buildRecord(target, payload, idempotencyKey);
    this.idempotencyKeys.add(scopedKey);

    if (!this.supabase) {
      boundedPush(this.buffers[target], record);
      this.stats.writes_buffered += 1;
      this.stats.last_write_at = record.updated_at;
      return { persisted: false, buffered: true, table: target, idempotency_key: idempotencyKey, mode: 'memory' };
    }

    try {
      const { error } = await this.supabase
        .from(target)
        .upsert(record, { onConflict: 'idempotency_key', ignoreDuplicates: false });

      if (error) throw error;
      this.stats.writes_persisted += 1;
      this.stats.last_write_at = record.updated_at;
      boundedPush(this.buffers[target], record, 100);
      return { persisted: true, table: target, idempotency_key: idempotencyKey, mode: 'supabase' };
    } catch (error) {
      this.stats.last_error = error.message;
      boundedPush(this.retryQueue, { table: target, record, attempts: 0, next_retry_at: Date.now() + 5000 }, 500);
      boundedPush(this.buffers[target], record);
      this.stats.writes_buffered += 1;
      return { persisted: false, buffered: true, table: target, idempotency_key: idempotencyKey, error: error.message };
    }
  }

  async flushRetries(limit = 25) {
    if (!this.supabase || this.retryQueue.length === 0) return { attempted: 0, succeeded: 0, remaining: this.retryQueue.length };

    let attempted = 0;
    let succeeded = 0;
    const now = Date.now();
    const pending = [];

    while (this.retryQueue.length && attempted < limit) {
      const item = this.retryQueue.pop();
      if (item.next_retry_at > now) {
        pending.push(item);
        continue;
      }

      attempted += 1;
      this.stats.retries_attempted += 1;
      try {
        const { error } = await this.supabase
          .from(item.table)
          .upsert(item.record, { onConflict: 'idempotency_key', ignoreDuplicates: false });
        if (error) throw error;
        succeeded += 1;
        this.stats.retries_succeeded += 1;
        this.stats.writes_persisted += 1;
      } catch (error) {
        item.attempts += 1;
        item.next_retry_at = Date.now() + Math.min(60000, 5000 * (item.attempts + 1));
        item.last_error = error.message;
        pending.push(item);
      }
    }

    this.retryQueue.push(...pending);
    return { attempted, succeeded, remaining: this.retryQueue.length };
  }

  recordRuntimeMetric(name, value, metadata = {}) {
    return this.persist('runtime_metrics', {
      id: `metric:${name}:${Math.floor(Date.now() / 30000)}`,
      metric_name: name,
      value,
      metadata,
      source: 'runtime-metrics'
    });
  }

  getRecent(table, limit = 25) {
    const target = this.normalizeTable(table);
    return this.buffers[target].slice(0, limit);
  }

  getStatus() {
    return {
      status: this.status,
      mode: this.mode,
      configured: this.validation.configured,
      degraded: !this.supabase,
      supported_tables: TABLES,
      retry_queue_depth: this.retryQueue.length,
      idempotency_keys: this.idempotencyKeys.size,
      buffered_records: Object.fromEntries(TABLES.map((table) => [table, this.buffers[table].length])),
      stats: this.stats,
      warnings: this.validation.warnings
    };
  }
}

const persistence = new RuntimePersistenceService();

module.exports = {
  TABLES,
  persistence,
  RuntimePersistenceService,
  stableHash
};
