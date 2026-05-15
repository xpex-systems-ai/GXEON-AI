import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import telemetry from '../core/observability/runtimeTelemetry.js';

dotenv.config();
dotenv.config({ path: './config/secure/.env' });

const DEFAULT_TABLES = [
  'signals',
  'wallets',
  'mev_events',
  'trade_logs',
  'smart_wallets',
  'system_events',
  'fleet_heartbeat',
  'revenue_events',
  'api_usage_logs'
];

let singleton = null;
let lastValidation = null;
let lastHealth = {
  connected: false,
  latency: null,
  tables: DEFAULT_TABLES,
  runtime: 'uninitialized',
  checked_at: null,
  errors: []
};

function resolveEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function validateSupabaseEnv() {
  const env = resolveEnv();
  const missing = [];
  if (!env.url) missing.push('SUPABASE_URL');
  if (!env.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!env.anonKey) missing.push('SUPABASE_ANON_KEY');

  const warnings = [];
  if (env.url && !/^https:\/\/[^\s]+\.supabase\.co$/i.test(env.url)) {
    warnings.push('SUPABASE_URL does not look like a Supabase project URL');
  }
  if (env.serviceRoleKey && !env.serviceRoleKey.includes('.')) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY does not look like a JWT');
  }
  if (env.anonKey && !env.anonKey.includes('.')) {
    warnings.push('SUPABASE_ANON_KEY does not look like a JWT');
  }

  lastValidation = {
    valid: missing.length === 0,
    missing,
    warnings,
    has_url: Boolean(env.url),
    has_service_role_key: Boolean(env.serviceRoleKey),
    has_anon_key: Boolean(env.anonKey),
    checked_at: new Date().toISOString()
  };

  return lastValidation;
}

export function getSupabaseClient() {
  if (singleton) return singleton;

  const validation = validateSupabaseEnv();
  const env = resolveEnv();

  if (!env.url || !env.serviceRoleKey) {
    telemetry.log('warn', 'Supabase singleton not initialized: missing required env', validation);
    return null;
  }

  singleton = createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'gxeon-autonomous-runtime',
        'x-client-info': 'singleton-production-resilient'
      }
    }
  });

  telemetry.markModule('supabase', 'degraded', { reason: 'initialized_pending_healthcheck' });
  telemetry.log('info', 'Supabase singleton initialized', {
    project: env.url.split('//')[1]?.split('.')[0] || 'unknown'
  });

  return singleton;
}

export function resetSupabaseClient() {
  singleton = null;
  return getSupabaseClient();
}

export async function withSupabaseRetry(operation, options = {}) {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const client = getSupabaseClient();
      if (!client || typeof client.from !== 'function') {
        throw new Error('SUPABASE_CLIENT_UNAVAILABLE');
      }
      return await operation(client, attempt);
    } catch (error) {
      lastError = error;
      telemetry.captureError(error, { component: 'supabase', attempt });
      if (attempt < retries) {
        const delay = baseDelayMs * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function validateSupabaseHealth(options = {}) {
  const started = Date.now();
  const tables = options.tables || DEFAULT_TABLES;
  const validation = validateSupabaseEnv();

  if (!validation.valid || !resolveEnv().serviceRoleKey) {
    lastHealth = {
      connected: false,
      latency: `${Date.now() - started}ms`,
      tables,
      runtime: 'missing_env',
      checked_at: new Date().toISOString(),
      env: validation,
      errors: validation.missing
    };
    telemetry.markModule('supabase', 'offline', lastHealth);
    return lastHealth;
  }

  try {
    await withSupabaseRetry(async (client) => {
      const { error } = await client.from(tables[0]).select('*', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      return true;
    }, { retries: options.retries ?? 1 });

    lastHealth = {
      connected: true,
      latency: `${Date.now() - started}ms`,
      tables,
      runtime: 'healthy',
      checked_at: new Date().toISOString(),
      env: validation,
      errors: []
    };
    telemetry.markModule('supabase', 'healthy', lastHealth);
    return lastHealth;
  } catch (error) {
    lastHealth = {
      connected: false,
      latency: `${Date.now() - started}ms`,
      tables,
      runtime: 'degraded',
      checked_at: new Date().toISOString(),
      env: validation,
      errors: [error.message]
    };
    telemetry.markModule('supabase', 'degraded', lastHealth);
    return lastHealth;
  }
}

export function getSupabaseHealthSnapshot() {
  return lastHealth;
}

export function getSupabaseRuntime() {
  const validation = lastValidation || validateSupabaseEnv();
  const client = getSupabaseClient();

  return {
    singleton: Boolean(client),
    has_from: typeof client?.from === 'function',
    validation,
    health: lastHealth
  };
}

export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export default supabase;
