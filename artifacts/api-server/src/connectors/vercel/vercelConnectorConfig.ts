import type {
  VercelConnectorConfig,
  VercelConnectorRuntimeDiagnostics,
} from "./vercelConnectorTypes";

const DEFAULT_VERCEL_API_BASE_URL = "https://api.vercel.com";

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function runtimeServiceName(env: NodeJS.ProcessEnv): string | null {
  return clean(env["RAILWAY_SERVICE_NAME"]) ?? clean(env["RAILWAY_SERVICE_ID"]);
}

export function getVercelConnectorConfig(
  env: NodeJS.ProcessEnv = process.env,
): VercelConnectorConfig & { token: string | null } {
  const token = clean(env["VERCEL_TOKEN"]);
  const teamId = clean(env["VERCEL_TEAM_ID"]);
  const apiBaseUrl =
    clean(env["VERCEL_API_BASE_URL"]) ?? DEFAULT_VERCEL_API_BASE_URL;
  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    teamId,
    configured: Boolean(token),
    tokenPresent: Boolean(token),
    teamIdPresent: Boolean(teamId),
    missing: token ? [] : ["MISSING_VERCEL_TOKEN"],
    token,
  };
}

export function toVercelConnectorDiagnostics(
  readProbe: VercelConnectorRuntimeDiagnostics["readProbe"] = null,
): VercelConnectorRuntimeDiagnostics {
export function toVercelConnectorDiagnostics(): VercelConnectorRuntimeDiagnostics {
  const config = getVercelConnectorConfig();
  return {
    provider: "vercel",
    routeStatus: "ONLINE",
    configured: config.configured,
    tokenPresent: config.tokenPresent,
    teamIdPresent: config.teamIdPresent,
    apiBaseUrlConfigured: Boolean(process.env["VERCEL_API_BASE_URL"]?.trim()),
    apiBaseUrl: config.apiBaseUrl,
    missing: config.missing,
    runtimeServiceName: runtimeServiceName(process.env),
    nodeEnv: clean(process.env["NODE_ENV"]),
    readProbe,
    missing: config.missing,
    runtimeServiceName: runtimeServiceName(process.env),
    nodeEnv: clean(process.env["NODE_ENV"]),
    timestamp: new Date().toISOString(),
  };
}
