import { type GitHubConnectorConfig, type GitHubConnectorSafeStatus } from "./githubConnectorTypes";

const DEFAULT_OWNER = "xpex-systems-ai";
const DEFAULT_REPO = "GXEON-AI";

export function getGitHubConnectorConfig(env: NodeJS.ProcessEnv = process.env): GitHubConnectorConfig & { token: string | null } {
  const token = env["GITHUB_CONNECTOR_TOKEN"]?.trim() || null;
  const owner = env["GITHUB_CONNECTOR_OWNER"]?.trim() || DEFAULT_OWNER;
  const repo = env["GITHUB_CONNECTOR_REPO"]?.trim() || DEFAULT_REPO;
  const missing = token ? [] : ["GITHUB_CONNECTOR_TOKEN"];

  return {
    owner,
    repo,
    token,
    isConfigured: missing.length === 0,
    missing,
  };
}

export function toSafeGitHubConnectorStatus(config: GitHubConnectorConfig, lastSyncAt: string | null = null): GitHubConnectorSafeStatus {
  return {
    provider: "github",
    status: config.isConfigured ? "CONNECTED_READONLY" : "READY",
    configured: config.isConfigured,
    owner: config.owner,
    repo: config.repo,
    missing: config.missing,
    lastSyncAt,
    message: config.isConfigured
      ? "GitHub connector backend variables are configured for read-only runtime reads."
      : "GitHub connector is ready but missing backend-only runtime credentials.",
  };
}
