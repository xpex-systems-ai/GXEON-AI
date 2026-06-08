import { type GitHubConnectorConfig, type GitHubConnectorRuntimeDiagnostics, type GitHubConnectorSafeStatus } from "./githubConnectorTypes";

const DEFAULT_OWNER = "xpex-systems-ai";
const DEFAULT_REPO = "GXEON-AI";

function runtimeServiceName(env: NodeJS.ProcessEnv): string | null {
  return env["RAILWAY_SERVICE_NAME"]?.trim()
    || env["RAILWAY_SERVICE_ID"]?.trim()
    || env["VERCEL_PROJECT_PRODUCTION_URL"]?.trim()
    || env["VERCEL_URL"]?.trim()
    || null;
}

export function getGitHubConnectorConfig(env: NodeJS.ProcessEnv = process.env): GitHubConnectorConfig & { token: string | null } {
  const token = env["GITHUB_CONNECTOR_TOKEN"]?.trim() || null;
  const owner = env["GITHUB_CONNECTOR_OWNER"]?.trim() || DEFAULT_OWNER;
  const repo = env["GITHUB_CONNECTOR_REPO"]?.trim() || DEFAULT_REPO;
  const tokenPresent = Boolean(token);
  const ownerPresent = Boolean(owner);
  const repoPresent = Boolean(repo);
  const missing: GitHubConnectorConfig["missing"] = [];

  if (!tokenPresent) missing.push("MISSING_TOKEN");
  if (!ownerPresent) missing.push("MISSING_OWNER");
  if (!repoPresent) missing.push("MISSING_REPO");

  return {
    owner,
    repo,
    token,
    tokenPresent,
    ownerPresent,
    repoPresent,
    isConfigured: missing.length === 0,
    missing,
  };
}

export function toSafeGitHubConnectorStatus(config: GitHubConnectorConfig, lastSyncAt: string | null = null): GitHubConnectorSafeStatus {
  return {
    provider: "github",
    status: config.isConfigured ? "CONNECTED_READONLY" : "READY",
    configured: config.isConfigured,
    owner: config.ownerPresent ? config.owner : null,
    repo: config.repoPresent ? config.repo : null,
    missing: config.missing,
    lastSyncAt,
    lastErrorCode: config.missing[0] ?? "NONE",
    message: config.isConfigured
      ? "GitHub connector backend variables are present; use snapshot to confirm GitHub read success."
      : "GitHub connector is ready but missing backend-only runtime configuration.",
  };
}

export function toGitHubConnectorDiagnostics(env: NodeJS.ProcessEnv = process.env): GitHubConnectorRuntimeDiagnostics {
  const config = getGitHubConnectorConfig(env);

  return {
    provider: "github",
    routeStatus: "ONLINE",
    tokenPresent: config.tokenPresent,
    ownerPresent: config.ownerPresent,
    repoPresent: config.repoPresent,
    configured: config.isConfigured,
    owner: config.ownerPresent ? config.owner : null,
    repo: config.repoPresent ? config.repo : null,
    missing: config.missing,
    runtimeServiceName: runtimeServiceName(env),
    nodeEnv: env["NODE_ENV"]?.trim() || null,
    timestamp: new Date().toISOString(),
  };
}
