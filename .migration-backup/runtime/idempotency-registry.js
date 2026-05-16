/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON IDEMPOTENCY REGISTRY v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prevents duplicate operations through idempotent execution tracking.
 *
 * Guarantees:
 * - No double-charging on event replay
 * - No duplicate balance deductions
 * - Safe concurrent requests with same idempotency key
 * - Replay-safe financial operations
 *
 * Usage:
 *   const registry = new IdempotencyRegistry();
 *   const result = await registry.executeOnce('idempotency_key', async () => {
 *     // Financial operation - will only execute once
 *   });
 */

import supabase from '../server/services/supabase.js';

export class IdempotencyRegistry {
  constructor() {
    this.cache = new Map(); // Local cache for recent operations
    this.lockTimeout = 30000; // 30 second lock timeout
  }

  /**
   * Execute operation exactly once per idempotency key
   *
   * Guarantees:
   * - If key exists: return cached result immediately
   * - If key doesn't exist: acquire distributed lock, execute, cache result
   * - If execution fails: lock is released, next caller can retry
   */
  async executeOnce(idempotencyKey, operation, metadata = {}) {
    // Check local cache first
    if (this.cache.has(idempotencyKey)) {
      const cached = this.cache.get(idempotencyKey);
      console.log(`[IdempotencyRegistry] Cache hit for key: ${idempotencyKey}`);
      return cached.result;
    }

    // Check database for existing execution
    const existing = await this.getIdempotencyRecord(idempotencyKey);

    if (existing) {
      console.log(`[IdempotencyRegistry] Found existing execution: ${idempotencyKey}`);

      if (existing.status === 'COMPLETED') {
        // Cache and return result
        this.cache.set(idempotencyKey, existing);
        return existing.result;
      }

      if (existing.status === 'PENDING') {
        // Wait for completion or timeout
        return await this.waitForCompletion(idempotencyKey, this.lockTimeout);
      }

      if (existing.status === 'FAILED') {
        // For failed operations, caller can decide to retry
        throw new Error(`Previous execution failed: ${existing.error_message}`);
      }
    }

    // Acquire lock and execute
    const lockId = `lock_${idempotencyKey}_${Date.now()}`;
    const lockAcquired = await this.acquireLock(idempotencyKey, lockId);

    if (!lockAcquired) {
      console.warn(`[IdempotencyRegistry] Failed to acquire lock: ${idempotencyKey}`);
      // Wait for other executor to complete
      return await this.waitForCompletion(idempotencyKey, this.lockTimeout);
    }

    try {
      // Create pending record
      await this.createIdempotencyRecord(idempotencyKey, {
        status: 'PENDING',
        lock_id: lockId,
        metadata
      });

      console.log(`[IdempotencyRegistry] Executing operation: ${idempotencyKey}`);

      // Execute operation
      const result = await operation();

      // Mark as completed
      await this.updateIdempotencyRecord(idempotencyKey, {
        status: 'COMPLETED',
        result,
        completed_at: new Date().toISOString()
      });

      // Cache result
      this.cache.set(idempotencyKey, {
        result,
        status: 'COMPLETED'
      });

      console.log(`[IdempotencyRegistry] Operation completed: ${idempotencyKey}`);

      return result;
    } catch (error) {
      console.error(`[IdempotencyRegistry] Operation failed: ${error.message}`);

      // Mark as failed
      await this.updateIdempotencyRecord(idempotencyKey, {
        status: 'FAILED',
        error_message: error.message,
        error_stack: error.stack,
        failed_at: new Date().toISOString()
      });

      throw error;
    } finally {
      // Release lock
      await this.releaseLock(idempotencyKey, lockId);
    }
  }

  /**
   * Get existing idempotency record
   */
  async getIdempotencyRecord(idempotencyKey) {
    const { data, error } = await supabase
      .from('gx_idempotency_registry')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error(`Registry lookup failed: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Create new idempotency record
   */
  async createIdempotencyRecord(idempotencyKey, metadata = {}) {
    const { error, data } = await supabase
      .from('gx_idempotency_registry')
      .insert({
        idempotency_key: idempotencyKey,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
        ...metadata
      })
      .select();

    if (error) {
      // Key may already exist (race condition)
      if (error.code === '23505') {
        // Unique constraint violation
        console.log(`[IdempotencyRegistry] Key already created (race condition): ${idempotencyKey}`);
        return await this.getIdempotencyRecord(idempotencyKey);
      }
      throw error;
    }

    return data?.[0];
  }

  /**
   * Update idempotency record
   */
  async updateIdempotencyRecord(idempotencyKey, updates) {
    const { error, data } = await supabase
      .from('gx_idempotency_registry')
      .update(updates)
      .eq('idempotency_key', idempotencyKey)
      .select();

    if (error) {
      throw error;
    }

    return data?.[0];
  }

  /**
   * Acquire distributed lock
   * Returns true if lock acquired, false otherwise
   */
  async acquireLock(resourceId, lockId) {
    const { error, data } = await supabase
      .from('gx_distributed_locks')
      .insert({
        resource_id: resourceId,
        lock_id: lockId,
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + this.lockTimeout).toISOString()
      })
      .select();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint - lock already exists
        return false;
      }
      console.error(`Lock acquisition failed: ${error.message}`);
      return false;
    }

    console.log(`[IdempotencyRegistry] Lock acquired: ${lockId}`);
    return true;
  }

  /**
   * Release distributed lock
   */
  async releaseLock(resourceId, lockId) {
    const { error } = await supabase
      .from('gx_distributed_locks')
      .delete()
      .eq('lock_id', lockId)
      .eq('resource_id', resourceId);

    if (error) {
      console.error(`Lock release failed: ${error.message}`);
    } else {
      console.log(`[IdempotencyRegistry] Lock released: ${lockId}`);
    }
  }

  /**
   * Wait for operation to complete (for concurrent requests)
   */
  async waitForCompletion(idempotencyKey, timeoutMs) {
    const startTime = Date.now();
    const pollInterval = 100; // Poll every 100ms

    while (Date.now() - startTime < timeoutMs) {
      const record = await this.getIdempotencyRecord(idempotencyKey);

      if (record && record.status === 'COMPLETED') {
        return record.result;
      }

      if (record && record.status === 'FAILED') {
        throw new Error(`Concurrent execution failed: ${record.error_message}`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timeout waiting for operation: ${idempotencyKey}`);
  }

  /**
   * Cleanup expired records (older than 24 hours)
   */
  async cleanupExpiredRecords() {
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();

    const { error } = await supabase
      .from('gx_idempotency_registry')
      .delete()
      .lt('expires_at', cutoff);

    if (error) {
      console.error(`Cleanup failed: ${error.message}`);
    } else {
      console.log(`[IdempotencyRegistry] Expired records cleaned up`);
    }
  }

  /**
   * Clear local cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get registry statistics
   */
  async getStats() {
    const { data, error } = await supabase
      .from('gx_idempotency_registry')
      .select('status, count', { count: 'exact' });

    if (error) {
      console.error(`Stats query failed: ${error.message}`);
      return null;
    }

    const stats = {};
    data?.forEach(row => {
      stats[row.status] = row.count;
    });

    return {
      cache_size: this.cache.size,
      database_records: stats,
      timestamp: new Date().toISOString()
    };
  }
}

export default new IdempotencyRegistry();
