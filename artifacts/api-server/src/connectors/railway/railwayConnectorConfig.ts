import type {
  RailwayConnectorConfig,
  RailwayConnectorRuntimeDiagnostics,
} from "./railwayConnectorTypes";

const DEFAULT_RAILWAY_API_BASE_URL = "https://backboard.railway.app/graphql/v2";

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function runtimeServiceName(env: NodeJS.ProcessEnv): string | null {
  return clean(env["RAILWAY_SERVICE_NAME"]) ?? clean(env["RAILWAY_SERVICE_ID"]);
}

export function getRailwayConnectorConfig(
  env: NodeJS.ProcessEnv = process.env,
): RailwayConnectorConfig & { token: string | null } {
  const token = clean(env["RAILWAY_TOKEN"]);
  const teamId = clean(env["RAILWAY_TEAM_ID"]);
  const projectId = clean(env["RAILWAY_PROJECT_ID"]);
  const environmentId = clean(env["RAILWAY_ENVIRONMENT_ID"]);
  const apiBaseUrl = clean(env["RAILWAY_API_BASE_URL"]) ?? DEFAULT_RAILWAY_API_BASE_URL;
  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    teamId,
    projectId,
    environmentId,
    configured: Boolean(token),
    tokenPresent: Boolean(token),
    teamIdPresent: Boolean(teamId),
    projectIdPresent: Boolean(projectId),
    environmentIdPresent: Boolean(environmentId),
    missing: token ? [] : ["MISSING_RAILWAY_TOKEN"],
    token,
  };
}

export function toRailwayConnectorDiagnostics(
  readProbe: RailwayConnectorRuntimeDiagnostics["readProbe"] = null,
): RailwayConnectorRuntimeDiagnostics {
  const config = getRailwayConnectorConfig();
  return {
    provider: "railway",
    routeStatus: "ONLINE",
    configured: config.configured,
    tokenPresent: config.tokenPresent,
    teamIdPresent: config.teamIdPresent,
    projectIdPresent: config.projectIdPresent,
    environmentIdPresent: config.environmentIdPresent,
    apiBaseUrlConfigured: Boolean(process.env["RAILWAY_API_BASE_URL"]?.trim()),
    apiBaseUrl: config.apiBaseUrl,
    missing: config.missing,
    runtimeServiceName: runtimeServiceName(process.env),
    nodeEnv: clean(process.env["NODE_ENV"]),
    readProbe,
    timestamp: new Date().toISOString(),
  };
}
