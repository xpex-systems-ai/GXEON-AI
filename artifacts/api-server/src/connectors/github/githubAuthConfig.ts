export type GitHubAuthMissingCode =
  | "MISSING_GITHUB_APP_CLIENT_ID"
  | "MISSING_GITHUB_APP_CLIENT_SECRET"
  | "MISSING_GITHUB_APP_ID"
  | "MISSING_GITHUB_APP_PRIVATE_KEY"
  | "MISSING_GITHUB_APP_SLUG"
  | "MISSING_GITHUB_OAUTH_STATE_SECRET"
  | "MISSING_GXEON_DASHBOARD_URL"
  | "MISSING_GXEON_API_PUBLIC_URL"
  | "INVALID_GXEON_DASHBOARD_URL"
  | "INVALID_GXEON_API_PUBLIC_URL";

export type GitHubAuthConfig = {
  provider: "github";
  mode: "github_app_installation" | "oauth_app_authorization";
  clientId: string | null;
  appId: string | null;
  appSlug: string | null;
  dashboardUrl: string | null;
  apiPublicUrl: string | null;
  callbackUrl: string | null;
  clientSecretPresent: boolean;
  privateKeyPresent: boolean;
  stateSecretPresent: boolean;
  appInstallationReady: boolean;
  installationTokenReady: boolean;
  oauthReady: boolean;
  missing: GitHubAuthMissingCode[];
};

function trimmed(env: NodeJS.ProcessEnv, key: string): string | null {
  return env[key]?.trim() || null;
}

function normalizedHttpsUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getGitHubAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): GitHubAuthConfig {
  const clientId = trimmed(env, "GITHUB_APP_CLIENT_ID");
  const clientSecretPresent = Boolean(trimmed(env, "GITHUB_APP_CLIENT_SECRET"));
  const appId = trimmed(env, "GITHUB_APP_ID");
  const privateKeyPresent = Boolean(trimmed(env, "GITHUB_APP_PRIVATE_KEY"));
  const appSlug = trimmed(env, "GITHUB_APP_SLUG");
  const stateSecretPresent = Boolean(trimmed(env, "GITHUB_OAUTH_STATE_SECRET"));
  const dashboardUrlRaw = trimmed(env, "GXEON_DASHBOARD_URL");
  const apiPublicUrlRaw = trimmed(env, "GXEON_API_PUBLIC_URL");
  const dashboardUrl = normalizedHttpsUrl(dashboardUrlRaw);
  const apiPublicUrl = normalizedHttpsUrl(apiPublicUrlRaw);
  const missing: GitHubAuthMissingCode[] = [];

  if (!clientId) missing.push("MISSING_GITHUB_APP_CLIENT_ID");
  if (!clientSecretPresent) missing.push("MISSING_GITHUB_APP_CLIENT_SECRET");
  if (!appId) missing.push("MISSING_GITHUB_APP_ID");
  if (!privateKeyPresent) missing.push("MISSING_GITHUB_APP_PRIVATE_KEY");
  if (!appSlug) missing.push("MISSING_GITHUB_APP_SLUG");
  if (!stateSecretPresent) missing.push("MISSING_GITHUB_OAUTH_STATE_SECRET");
  if (!dashboardUrlRaw) missing.push("MISSING_GXEON_DASHBOARD_URL");
  if (dashboardUrlRaw && !dashboardUrl)
    missing.push("INVALID_GXEON_DASHBOARD_URL");
  if (!apiPublicUrlRaw) missing.push("MISSING_GXEON_API_PUBLIC_URL");
  if (apiPublicUrlRaw && !apiPublicUrl)
    missing.push("INVALID_GXEON_API_PUBLIC_URL");

  const callbackUrl = apiPublicUrl
    ? `${apiPublicUrl}/api/connectors/github/callback`
    : null;
  const appInstallationReady = Boolean(
    appSlug && stateSecretPresent && dashboardUrl && apiPublicUrl,
  );
  const installationTokenReady = Boolean(appId && privateKeyPresent);
  const oauthReady = Boolean(
    clientId &&
    clientSecretPresent &&
    stateSecretPresent &&
    dashboardUrl &&
    apiPublicUrl,
  );

  return {
    provider: "github",
    mode: appSlug ? "github_app_installation" : "oauth_app_authorization",
    clientId,
    appId,
    appSlug,
    dashboardUrl,
    apiPublicUrl,
    callbackUrl,
    clientSecretPresent,
    privateKeyPresent,
    stateSecretPresent,
    appInstallationReady,
    installationTokenReady,
    oauthReady,
    missing,
  };
}

export function safeGitHubAuthDiagnostics(
  config: GitHubAuthConfig = getGitHubAuthConfig(),
) {
  return {
    provider: config.provider,
    mode: config.mode,
    clientIdPresent: Boolean(config.clientId),
    appIdPresent: Boolean(config.appId),
    appSlugPresent: Boolean(config.appSlug),
    clientSecretPresent: config.clientSecretPresent,
    privateKeyPresent: config.privateKeyPresent,
    stateSecretPresent: config.stateSecretPresent,
    dashboardUrlPresent: Boolean(config.dashboardUrl),
    apiPublicUrlPresent: Boolean(config.apiPublicUrl),
    callbackUrl: config.callbackUrl,
    appInstallationReady: config.appInstallationReady,
    installationTokenReady: config.installationTokenReady,
    oauthReady: config.oauthReady,
    missing: config.missing,
  };
}
