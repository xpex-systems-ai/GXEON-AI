import type {
  SupabaseConnectorConfig,
  SupabaseConnectorRuntimeDiagnostics,
} from "./supabaseConnectorTypes";

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function cleanUrl(value: string | null): string | null {
  return value ? value.replace(/\/$/, "") : null;
}

function runtimeServiceName(env: NodeJS.ProcessEnv): string | null {
  return clean(env["RAILWAY_SERVICE_NAME"]) ?? clean(env["RAILWAY_SERVICE_ID"]);
}

export function getSupabaseConnectorConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseConnectorConfig & {
  anonKey: string | null;
  serviceRoleKey: string | null;
  dbUrl: string | null;
} {
  const supabaseUrl = cleanUrl(clean(env["SUPABASE_URL"]));
  const anonKey = clean(env["SUPABASE_ANON_KEY"]);
  const serviceRoleKey = clean(env["SUPABASE_SERVICE_ROLE_KEY"]);
  const projectRef = clean(env["SUPABASE_PROJECT_REF"]);
  const dbUrl = clean(env["SUPABASE_DB_URL"]);
  const configured = Boolean(supabaseUrl && anonKey);

  return {
    supabaseUrl,
    projectRef,
    configured,
    urlPresent: Boolean(supabaseUrl),
    anonKeyPresent: Boolean(anonKey),
    serviceRolePresent: Boolean(serviceRoleKey),
    projectRefPresent: Boolean(projectRef),
    dbUrlPresent: Boolean(dbUrl),
    missing: configured ? [] : ["MISSING_SUPABASE_CONFIG"],
    anonKey,
    serviceRoleKey,
    dbUrl,
  };
}

export function toSupabaseConnectorDiagnostics(
  readProbe: SupabaseConnectorRuntimeDiagnostics["readProbe"] = null,
): SupabaseConnectorRuntimeDiagnostics {
  const config = getSupabaseConnectorConfig();
  return {
    provider: "supabase",
    routeStatus: "ONLINE",
    configured: config.configured,
    urlPresent: config.urlPresent,
    anonKeyPresent: config.anonKeyPresent,
    serviceRolePresent: config.serviceRolePresent,
    projectRefPresent: config.projectRefPresent,
    dbUrlPresent: config.dbUrlPresent,
    missing: config.missing,
    runtimeServiceName: runtimeServiceName(process.env),
    nodeEnv: clean(process.env["NODE_ENV"]),
    readProbe,
    timestamp: new Date().toISOString(),
  };
}
