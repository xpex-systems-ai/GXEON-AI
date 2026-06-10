import {
  getMicrosoft365ConnectorConfig,
  getMicrosoft365ScopePolicy,
  isMicrosoft365RedirectUriValid,
} from "./microsoft365ConnectorConfig";
import type {
  Microsoft365ConnectorErrorCode,
  Microsoft365OAuthReadiness,
  Microsoft365TenantProbe,
} from "./microsoft365ConnectorTypes";

export class Microsoft365ReadonlyClientError extends Error {
  constructor(
    public readonly code: Microsoft365ConnectorErrorCode,
    message: string,
    public readonly status: number | null = null,
  ) {
    super(message);
  }
}

function normalizeMicrosoft365Error(status: number | null): Microsoft365ConnectorErrorCode {
  if (status === 400) return "MICROSOFT365_400";
  if (status === 404) return "MICROSOFT365_404";
  if (status === 401) return "MICROSOFT365_401";
  if (status === 403) return "MICROSOFT365_403";
  if (status === 429) return "RATE_LIMITED";
  if (status && status >= 500) return "MICROSOFT365_5XX";
  return "NETWORK_ERROR";
}

function openIdConfigurationUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/v2.0/.well-known/openid-configuration`;
}

export function createMicrosoft365AuthorizeUrl(): string | null {
  const config = getMicrosoft365ConnectorConfig();
  const scopePolicy = getMicrosoft365ScopePolicy(config.scopes);
  if (!config.tenantId || !config.clientId || !config.redirectUri || !config.clientSecret) return null;
  if (!scopePolicy.safe || !isMicrosoft365RedirectUriValid(config.redirectUri)) return null;

  const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", scopePolicy.safeScopes.join(" "));
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function probeMicrosoft365TenantMetadata(): Promise<Microsoft365TenantProbe> {
  const config = getMicrosoft365ConnectorConfig();
  if (!config.tenantId) {
    return {
      attempted: false,
      ok: false,
      status: null,
      code: "MISSING_MICROSOFT365_CONFIG",
      safeMessage: "Create or access Microsoft Entra tenant before App Registration. Then configure MICROSOFT365_TENANT_ID in the backend runtime.",
      authorizationEndpointReady: false,
      tokenEndpointReady: false,
    };
  }

  try {
    const response = await fetch(openIdConfigurationUrl(config.tenantId), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        attempted: true,
        ok: false,
        status: response.status,
        code: normalizeMicrosoft365Error(response.status),
        safeMessage: response.status === 400 || response.status === 404
          ? "Check tenant ID or directory availability. A personal Outlook account without a Microsoft Entra tenant is not enough for App Registration."
          : "Microsoft identity tenant metadata endpoint did not return a successful readiness response.",
        authorizationEndpointReady: false,
        tokenEndpointReady: false,
      };
    }
    const payload = (await response.json()) as {
      authorization_endpoint?: string;
      token_endpoint?: string;
    };
    const authorizationEndpointReady = Boolean(payload.authorization_endpoint?.startsWith("https://"));
    const tokenEndpointReady = Boolean(payload.token_endpoint?.startsWith("https://"));
    return {
      attempted: true,
      ok: authorizationEndpointReady && tokenEndpointReady,
      status: response.status,
      code: authorizationEndpointReady && tokenEndpointReady ? null : "TENANT_METADATA_UNREACHABLE",
      safeMessage: authorizationEndpointReady && tokenEndpointReady ? null : "Tenant metadata is reachable but OAuth endpoint metadata is incomplete.",
      authorizationEndpointReady,
      tokenEndpointReady,
    };
  } catch {
    return {
      attempted: true,
      ok: false,
      status: null,
      code: "NETWORK_ERROR",
      safeMessage: "Network error while checking Microsoft identity tenant metadata.",
      authorizationEndpointReady: false,
      tokenEndpointReady: false,
    };
  }
}

export async function getMicrosoft365OAuthReadiness(): Promise<Microsoft365OAuthReadiness> {
  const config = getMicrosoft365ConnectorConfig();
  const redirectUriValid = isMicrosoft365RedirectUriValid(config.redirectUri);
  const scopePolicy = getMicrosoft365ScopePolicy(config.scopes);
  const tenantProbe = config.tenantId ? await probeMicrosoft365TenantMetadata() : {
    attempted: false,
    ok: false,
    status: null,
    code: "MISSING_MICROSOFT365_CONFIG" as const,
    safeMessage: "Create or access Microsoft Entra tenant before App Registration. Then configure Microsoft 365 backend environment variables.",
    authorizationEndpointReady: false,
    tokenEndpointReady: false,
  };
  const authorizeUrl = createMicrosoft365AuthorizeUrl();
  const configPresent = Boolean(config.tenantId && config.clientId && config.clientSecret && config.redirectUri && config.scopesPresent);
  const configured = configPresent && redirectUriValid && scopePolicy.safe;
  const consentReady = configured && tenantProbe.ok && Boolean(authorizeUrl);
  const lastErrorCode: Microsoft365ConnectorErrorCode = !configPresent
    ? "MISSING_MICROSOFT365_CONFIG"
    : !redirectUriValid
      ? "INVALID_REDIRECT_URI"
      : !scopePolicy.safe
        ? "FORBIDDEN_SCOPE_REQUESTED"
        : tenantProbe.ok
          ? "NONE"
          : tenantProbe.code ?? "TENANT_METADATA_UNREACHABLE";

  return {
    provider: "microsoft365",
    status: consentReady ? "READY_FOR_CONSENT" : configPresent ? "FAILED" : "NOT_CONFIGURED",
    configured,
    tenantReachable: tenantProbe.ok,
    connectUrlReady: Boolean(authorizeUrl) && consentReady,
    consentReady,
    redirectUriValid,
    scopePolicySafe: scopePolicy.safe,
    authorizeUrl: consentReady ? authorizeUrl : null,
    tenantProbe,
    lastErrorCode,
  };
}
