'use strict';

function getSupabaseRuntimeStatus() {
  const checks = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    VITE_SUPABASE_URL: Boolean(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_ANON_KEY: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    EXPO_PUBLIC_SUPABASE_URL: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  };
  const allConfigured = Object.values(checks).every(Boolean);
  return {
    supabase: allConfigured ? 'SYNCHRONIZED' : 'DEGRADED',
    all_required_keys_configured: allConfigured,
    checks,
    database_target: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || null,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getSupabaseRuntimeStatus };
