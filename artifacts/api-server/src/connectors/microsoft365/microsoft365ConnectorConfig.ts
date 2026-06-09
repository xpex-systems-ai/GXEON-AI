import type {
  Microsoft365ConnectorConfig,
  Microsoft365ConnectorRuntimeDiagnostics,
  Microsoft365ScopePolicy,
} from "./microsoft365ConnectorTypes";

export const recommendedMicrosoft365P0Scopes = ["offline_access", "User.Read"] as const;
export const futureMicrosoft365ReadonlyScopesRequiresApproval = [
  "Mail.ReadBasic",
  "Calendars.Read",
  "Contacts.Read",
  "Files.Read.All",
] as const;
export const forbiddenMicrosoft365P0Scopes = [
  "Mail.Send",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
  "Contacts.ReadWrite",
  "Files.ReadWrite",
  "Files.ReadWrite.All",
  "Directory.ReadWrite.All",
  "User.ReadWrite",
  "Group.ReadWrite.All",
] as const;

const forbiddenScopeSet = new Set<string>(forbiddenMicrosoft365P0Scopes);

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function runtimeServiceName(env: NodeJS.ProcessEnv): string | null {
  return clean(env["RAILWAY_SERVICE_NAME"]) ?? clean(env["RAILWAY_SERVICE_ID"]);
}

function parseScopes(value: string | null): string[] {
  if (!value) return [...recommendedMicrosoft365P0Scopes];
  return Array.from(new Set(value.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean)));
}

export function getMicrosoft365ScopePolicy(scopes: string[]): Microsoft365ScopePolicy {
  const forbiddenScopesRequested = scopes.filter((scope) => forbiddenScopeSet.has(scope));
  const safeScopes = scopes.filter((scope) => !forbiddenScopeSet.has(scope));
  return {
    safe: forbiddenScopesRequested.length === 0,
    recommendedScopes: [...recommendedMicrosoft365P0Scopes],
    futureReadonlyScopesRequiresApproval: [...futureMicrosoft365ReadonlyScopesRequiresApproval],
    forbiddenScopes: [...forbiddenMicrosoft365P0Scopes],
    safeScopes,
    forbiddenScopesRequested,
  };
}

export function isMicrosoft365RedirectUriValid(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getMicrosoft365ConnectorConfig(
  env: NodeJS.ProcessEnv = process.env,
): Microsoft365ConnectorConfig {
  const tenantId = clean(env["MICROSOFT365_TENANT_ID"]);
  const clientId = clean(env["MICROSOFT365_CLIENT_ID"]);
  const clientSecret = clean(env["MICROSOFT365_CLIENT_SECRET"]);
  const redirectUri = clean(env["MICROSOFT365_REDIRECT_URI"]);
  const rawScopes = clean(env["MICROSOFT365_SCOPES"]);
  const scopes = parseScopes(rawScopes);
  const scopePolicy = getMicrosoft365ScopePolicy(scopes);
  const configured = Boolean(tenantId && clientId && clientSecret && redirectUri && rawScopes && scopePolicy.safe);

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    tenantIdPresent: Boolean(tenantId),
    clientIdPresent: Boolean(clientId),
    clientSecretPresent: Boolean(clientSecret),
    redirectUriPresent: Boolean(redirectUri),
    scopesPresent: Boolean(rawScopes),
    configured,
    safeScopes: scopePolicy.safeScopes,
    forbiddenScopesRequested: scopePolicy.forbiddenScopesRequested,
    missing: configured ? [] : [scopePolicy.safe ? "MISSING_MICROSOFT365_CONFIG" : "FORBIDDEN_SCOPE_REQUESTED"],
  };
}

export function toMicrosoft365ConnectorDiagnostics(
  tenantProbe: Microsoft365ConnectorRuntimeDiagnostics["tenantProbe"] = null,
): Microsoft365ConnectorRuntimeDiagnostics {
  const config = getMicrosoft365ConnectorConfig();
  return {
    provider: "microsoft365",
    routeStatus: "ONLINE",
    configured: config.configured,
    tenantIdPresent: config.tenantIdPresent,
    clientIdPresent: config.clientIdPresent,
    clientSecretPresent: config.clientSecretPresent,
    redirectUriPresent: config.redirectUriPresent,
    scopesPresent: config.scopesPresent,
    safeScopes: config.safeScopes,
    forbiddenScopesRequested: config.forbiddenScopesRequested,
    scopePolicy: getMicrosoft365ScopePolicy(config.scopes),
    redirectUriValid: isMicrosoft365RedirectUriValid(config.redirectUri),
    runtimeServiceName: runtimeServiceName(process.env),
    nodeEnv: clean(process.env["NODE_ENV"]),
    tenantProbe,
    timestamp: new Date().toISOString(),
  };
}
