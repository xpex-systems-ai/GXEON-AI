import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getSupabaseUrl, getSupabaseKey, validateSupabaseEnv } = require('../runtime/compatibility.cjs');

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// GXEON SUPABASE ALIGNMENT - CANONICAL SUPABASE_URL WITH DEGRADED MODE
// ═══════════════════════════════════════════════════════════════════════════

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();
const validation = validateSupabaseEnv();

let supabase = null;

if (!validation.configured) {
  console.warn('[SUPABASE_ALIGNMENT] Persistence degraded:', validation.warnings.join(' | '));
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'gxeon-enterprise-runtime',
          'x-client-info': 'runtime-governed'
        }
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[SUPABASE_ALIGNMENT] Supabase client initialized');
      console.log('[SUPABASE_ALIGNMENT] Project:', supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown');
      if (validation.warnings.length) {
        console.warn('[SUPABASE_ALIGNMENT] Warnings:', validation.warnings.join(' | '));
      }
    }
  } catch (error) {
    console.error('[SUPABASE_ALIGNMENT] Failed to initialize Supabase:', error.message);
    console.warn('[SUPABASE_ALIGNMENT] Continuing in degraded persistence mode');
    supabase = null;
  }
}

export function getSupabaseHealth() {
  return {
    status: supabase ? 'ready' : 'degraded',
    configured: validation.configured,
    canonical_url: validation.canonical_url,
    warnings: validation.warnings
  };
}

export default supabase;
