import type {
  Microsoft365ConnectorErrorCode,
  Microsoft365OAuthReadiness,
  Microsoft365ReadonlyEvidence,
  Microsoft365ReadonlySnapshot,
  Microsoft365SubsystemReadiness,
} from "./microsoft365ConnectorTypes";
import { getMicrosoft365ConnectorConfig, getMicrosoft365ScopePolicy, isMicrosoft365RedirectUriValid } from "./microsoft365ConnectorConfig";

function statusLabel(status: Microsoft365ReadonlySnapshot["status"]): string {
  if (status === "READY_FOR_CONSENT") return "READY_FOR_MICROSOFT_GRAPH_CONSENT";
  if (status === "CONNECTED_READONLY") return "CONNECTED_READONLY_BACKEND_TOKEN_READY";
  if (status === "FAILED") return "MICROSOFT365_OAUTH_READINESS_FAILED";
  return "NOT_CONFIGURED";
}

function calculateHealthScore(input: {
  configured: boolean;
  tenantReachable: boolean;
  scopePolicySafe: boolean;
  consentReady: boolean;
  redirectUriValid: boolean;
}): number {
  let score = 0;
  if (input.configured) score += 25;
  if (input.redirectUriValid) score += 15;
  if (input.scopePolicySafe) score += 25;
  if (input.tenantReachable) score += 20;
  if (input.consentReady) score += 15;
  return Math.min(100, score);
}

function createSubsystems(configured: boolean, connected: boolean): Microsoft365SubsystemReadiness[] {
  const readStatus = connected ? "CONNECTED_READONLY" : configured ? "READY_AFTER_CONSENT" : "NOT_CONFIGURED";
  return [
    {
      id: "outlook",
      label: "Outlook",
      status: readStatus,
      detail: "P0 prepares Mail.ReadBasic-style readiness only; no send, move, delete or body read is enabled.",
    },
    {
      id: "calendar",
      label: "Calendar",
      status: readStatus,
      detail: "Calendar visibility remains ready-after-consent; create, update and delete are disabled.",
    },
    {
      id: "contacts",
      label: "Contacts",
      status: readStatus,
      detail: "Contacts visibility remains ready-after-consent with no contact viewer or mutation in P0.",
    },
    {
      id: "onedrive",
      label: "OneDrive",
      status: readStatus,
      detail: "OneDrive visibility remains ready-after-consent; no file browser, upload, move, update or delete in P0.",
    },
    {
      id: "proposalCenter",
      label: "Proposal Center",
      status: connected ? "CONNECTED_READONLY" : configured ? "READY_MANUAL_FIRST" : "NOT_CONFIGURED",
      detail: "Manual-first proposal center can prepare workflow once backend OAuth readiness is configured.",
    },
  ];
}

function evidence(readiness: {
  status: Microsoft365ReadonlySnapshot["status"];
  configured: boolean;
  tenantReachable: boolean;
  scopePolicySafe: boolean;
  consentReady: boolean;
  connectUrlReady: boolean;
  safeScopes: string[];
  lastErrorCode: Microsoft365ConnectorErrorCode;
}): Microsoft365ReadonlyEvidence[] {
  const now = new Date().toISOString();
  return [
    {
      id: "m365-scope-policy",
      type: "SCOPE_POLICY",
      title: readiness.scopePolicySafe ? "Microsoft Graph scope policy is safe" : "Microsoft Graph scope policy blocked",
      description: readiness.scopePolicySafe
        ? `Allowed safe scopes: ${readiness.safeScopes.join(", ") || "offline_access, User.Read"}. Forbidden write scopes are filtered.`
        : "One or more forbidden Microsoft Graph write scopes were requested; connector fails closed.",
      occurredAt: now,
      source: "GXEON Microsoft 365 backend-only scope policy",
    },
    {
      id: "m365-tenant-readiness",
      type: "TENANT",
      title: readiness.tenantReachable ? "Tenant metadata reachable" : "Tenant metadata not ready",
      description: readiness.tenantReachable
        ? "Microsoft identity OpenID metadata was reachable from the backend."
        : readiness.lastErrorCode === "MISSING_MICROSOFT365_CONFIG"
          ? "Create or access Microsoft Entra tenant before App Registration, then configure the backend tenant id without exposing secrets."
          : readiness.lastErrorCode === "MICROSOFT365_400" || readiness.lastErrorCode === "MICROSOFT365_404"
            ? "Check tenant ID or directory availability before retrying consent readiness."
            : "Tenant metadata is not confirmed; check backend tenant id and network reachability.",
      occurredAt: now,
      source: "Microsoft identity OpenID configuration probe",
    },
    {
      id: "m365-consent-readiness",
      type: "OAUTH",
      title: readiness.consentReady ? "Consent URL ready" : "Consent URL not ready",
      description: readiness.connectUrlReady
        ? "Backend can generate a Microsoft consent URL without exposing secrets or tokens to the browser."
        : "Consent URL remains disabled until tenant, client, secret, redirect URI and scope policy are valid.",
      occurredAt: now,
      source: "GXEON api-server OAuth readiness client",
    },
    {
      id: "m365-p0-safety-boundary",
      type: "HEALTH",
      title: "P0 read-only manual-first boundary enforced",
      description: "No Microsoft Graph mail, calendar, contact or drive data endpoint is called in P0, and no personal data is persisted.",
      occurredAt: now,
      source: "GXEON_MICROSOFT365_CONNECTOR_P0_READONLY_OAUTH_READINESS",
    },
  ];
}

export function normalizeMicrosoft365ReadonlySnapshot(
  readiness: Microsoft365OAuthReadiness,
): Microsoft365ReadonlySnapshot {
  const config = getMicrosoft365ConnectorConfig();
  const scopePolicy = getMicrosoft365ScopePolicy(config.scopes);
  const connected = false;
  const status = connected ? "CONNECTED_READONLY" : readiness.status;
  const healthScore = calculateHealthScore({
    configured: readiness.configured,
    tenantReachable: readiness.tenantReachable,
    scopePolicySafe: readiness.scopePolicySafe,
    consentReady: readiness.consentReady,
    redirectUriValid: readiness.redirectUriValid,
  });
  return {
    provider: "microsoft365",
    status,
    statusLabel: statusLabel(status),
    configured: readiness.configured,
    lastErrorCode: readiness.lastErrorCode,
    tenantIdPresent: config.tenantIdPresent,
    clientIdPresent: config.clientIdPresent,
    clientSecretPresent: config.clientSecretPresent,
    redirectUriPresent: config.redirectUriPresent,
    scopesPresent: config.scopesPresent,
    safeScopes: scopePolicy.safeScopes,
    forbiddenScopesRequested: scopePolicy.forbiddenScopesRequested,
    tenantReachable: readiness.tenantReachable,
    consentReady: readiness.consentReady,
    connectUrlReady: readiness.connectUrlReady,
    scopePolicySafe: readiness.scopePolicySafe,
    redirectUriValid: readiness.redirectUriValid,
    subsystems: createSubsystems(readiness.configured, connected),
    evidenceTimeline: evidence({
      status,
      configured: readiness.configured,
      tenantReachable: readiness.tenantReachable,
      scopePolicySafe: readiness.scopePolicySafe,
      consentReady: readiness.consentReady,
      connectUrlReady: readiness.connectUrlReady,
      safeScopes: scopePolicy.safeScopes,
      lastErrorCode: readiness.lastErrorCode,
    }),
    health: {
      connectorGateway: "READY",
      microsoft365Connector: status,
      healthScore,
      lastSyncAt: status === "NOT_CONFIGURED" ? null : new Date().toISOString(),
      lastErrorCode: readiness.lastErrorCode,
      frontendTokenStorage: false,
      clientSecretExposure: false,
      graphWrites: false,
      mailSend: false,
      calendarWrites: false,
      fileWrites: false,
      personalDataPersistence: false,
    },
  };
}

export function createMicrosoft365ReadonlyNotConfiguredSnapshot(
  errorCode: Microsoft365ConnectorErrorCode = "MISSING_MICROSOFT365_CONFIG",
): Microsoft365ReadonlySnapshot {
  const config = getMicrosoft365ConnectorConfig();
  const scopePolicy = getMicrosoft365ScopePolicy(config.scopes);
  return normalizeMicrosoft365ReadonlySnapshot({
    provider: "microsoft365",
    status: "NOT_CONFIGURED",
    configured: false,
    tenantReachable: false,
    connectUrlReady: false,
    consentReady: false,
    redirectUriValid: isMicrosoft365RedirectUriValid(config.redirectUri),
    scopePolicySafe: scopePolicy.safe,
    authorizeUrl: null,
    tenantProbe: {
      attempted: false,
      ok: false,
      status: null,
      code: errorCode,
      safeMessage: "Create or access Microsoft Entra tenant before App Registration. Then configure Microsoft 365 backend OAuth environment variables.",
      authorizationEndpointReady: false,
      tokenEndpointReady: false,
    },
    lastErrorCode: errorCode,
  });
}

export function createMicrosoft365ReadonlyFailedSnapshot(
  reason: string,
  errorCode: Microsoft365ConnectorErrorCode = "MICROSOFT365_READINESS_FAILED",
): Microsoft365ReadonlySnapshot {
  const snapshot = createMicrosoft365ReadonlyNotConfiguredSnapshot(errorCode);
  return {
    ...snapshot,
    status: "FAILED",
    statusLabel: "MICROSOFT365_OAUTH_READINESS_FAILED",
    lastErrorCode: errorCode,
    evidenceTimeline: [
      {
        id: "m365-readiness-failed",
        type: "HEALTH",
        title: "Microsoft 365 readiness failed closed",
        description: reason,
        occurredAt: new Date().toISOString(),
        source: "GXEON Microsoft 365 fail-closed normalizer",
      },
      ...snapshot.evidenceTimeline,
    ],
    health: {
      ...snapshot.health,
      microsoft365Connector: "FAILED",
      lastErrorCode: errorCode,
    },
  };
}
