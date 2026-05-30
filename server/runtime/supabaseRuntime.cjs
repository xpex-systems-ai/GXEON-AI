"use strict";

function firstConfigured(...keys) {
  return keys.map((key) => process.env[key]).find(Boolean) || "";
}

function getSupabaseEnv() {
  const supabaseUrl = firstConfigured(
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_URL",
  );
  const anonKey = firstConfigured(
    "VITE_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: firstConfigured("SUPABASE_SERVICE_ROLE_KEY"),
    VITE_SUPABASE_URL: firstConfigured(
      "VITE_SUPABASE_URL",
      "SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_URL",
    ),
    VITE_SUPABASE_ANON_KEY: firstConfigured(
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ),
    EXPO_PUBLIC_SUPABASE_URL: firstConfigured(
      "EXPO_PUBLIC_SUPABASE_URL",
      "SUPABASE_URL",
      "VITE_SUPABASE_URL",
    ),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: firstConfigured(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ),
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_PUBLISHABLE_KEY: firstConfigured("SUPABASE_PUBLISHABLE_KEY"),
  };
}

function maskConfigured(value = "") {
  const text = String(value || "");
  if (!text) return { configured: false, masked: null, length: 0 };
  if (text.length <= 12)
    return {
      configured: true,
      masked: `${text.slice(0, 2)}…${text.slice(-2)}`,
      length: text.length,
    };
  return {
    configured: true,
    masked: `${text.slice(0, 8)}…${text.slice(-6)}`,
    length: text.length,
  };
}

function getSupabaseRuntimeStatus() {
  const resolved = getSupabaseEnv();
  const checks = {
    SUPABASE_URL: Boolean(resolved.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(resolved.SUPABASE_SERVICE_ROLE_KEY),
    VITE_SUPABASE_URL: Boolean(resolved.VITE_SUPABASE_URL),
    VITE_SUPABASE_ANON_KEY: Boolean(resolved.VITE_SUPABASE_ANON_KEY),
    EXPO_PUBLIC_SUPABASE_URL: Boolean(resolved.EXPO_PUBLIC_SUPABASE_URL),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: Boolean(
      resolved.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
  const allConfigured = Object.values(checks).every(Boolean);
  return {
    supabase: allConfigured ? "SYNCHRONIZED" : "DEGRADED",
    all_required_keys_configured: allConfigured,
    checks,
    aliases_supported: {
      anon_key: ["SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"],
      url_fallback: [
        "SUPABASE_URL",
        "VITE_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_URL",
      ],
    },
    resolved: {
      SUPABASE_URL: maskConfigured(resolved.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: maskConfigured(
        resolved.SUPABASE_SERVICE_ROLE_KEY,
      ),
      VITE_SUPABASE_URL: maskConfigured(resolved.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: maskConfigured(resolved.VITE_SUPABASE_ANON_KEY),
      EXPO_PUBLIC_SUPABASE_URL: maskConfigured(
        resolved.EXPO_PUBLIC_SUPABASE_URL,
      ),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: maskConfigured(
        resolved.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ),
      SUPABASE_ANON_KEY: maskConfigured(resolved.SUPABASE_ANON_KEY),
      SUPABASE_PUBLISHABLE_KEY: maskConfigured(
        resolved.SUPABASE_PUBLISHABLE_KEY,
      ),
    },
    database_target: resolved.SUPABASE_URL || null,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getSupabaseRuntimeStatus, getSupabaseEnv };
