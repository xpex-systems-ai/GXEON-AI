export type Microsoft365ConnectorStatus =
  | "NOT_CONFIGURED"
  | "READY_FOR_CONSENT"
  | "CONNECTED_READONLY"
  | "FAILED";

export type Microsoft365ConnectorErrorCode =
  | "NONE"
  | "MISSING_MICROSOFT365_CONFIG"
  | "INVALID_REDIRECT_URI"
  | "FORBIDDEN_SCOPE_REQUESTED"
  | "MICROSOFT365_400"
  | "MICROSOFT365_401"
  | "MICROSOFT365_403"
  | "RATE_LIMITED"
  | "MICROSOFT365_5XX"
  | "NETWORK_ERROR"
  | "TENANT_METADATA_UNREACHABLE"
  | "MICROSOFT365_READINESS_FAILED"
  | "BACKEND_RETURNED_HTML"
  | "BACKEND_URL_MISCONFIGURED"
  | "BACKEND_UNAVAILABLE";

export type Microsoft365SubsystemReadiness = {
  id: "outlook" | "calendar" | "contacts" | "onedrive" | "proposalCenter";
  label: string;
  status: "NOT_CONFIGURED" | "READY_AFTER_CONSENT" | "READY_MANUAL_FIRST" | "CONNECTED_READONLY" | "FAILED";
  detail: string;
};

export type Microsoft365ReadonlyEvidence = {
  id: string;
  type: "OAUTH" | "TENANT" | "SCOPE_POLICY" | "SUBSYSTEM" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type Microsoft365ReadonlySnapshot = {
  provider: "microsoft365";
  status: Microsoft365ConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: Microsoft365ConnectorErrorCode;
  tenantIdPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  scopesPresent: boolean;
  safeScopes: string[];
  forbiddenScopesRequested: string[];
  tenantReachable: boolean;
  consentReady: boolean;
  connectUrlReady: boolean;
  scopePolicySafe: boolean;
  redirectUriValid: boolean;
  subsystems: Microsoft365SubsystemReadiness[];
  evidenceTimeline: Microsoft365ReadonlyEvidence[];
  health: {
    connectorGateway: "READY";
    microsoft365Connector: Microsoft365ConnectorStatus;
    healthScore: number;
    lastSyncAt: string | null;
    lastErrorCode: Microsoft365ConnectorErrorCode;
    frontendTokenStorage: false;
    clientSecretExposure: false;
    graphWrites: false;
    mailSend: false;
    calendarWrites: false;
    fileWrites: false;
    personalDataPersistence: false;
  };
};

export type Microsoft365ConnectorDiagnostics = {
  provider: "microsoft365";
  routeStatus: "ONLINE";
  configured: boolean;
  tenantIdPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  scopesPresent: boolean;
  safeScopes: string[];
  forbiddenScopesRequested: string[];
  redirectUriValid: boolean;
  tenantProbe: {
    attempted: boolean;
    ok: boolean;
    status: number | null;
    code: Microsoft365ConnectorErrorCode | null;
    safeMessage: string | null;
    authorizationEndpointReady: boolean;
    tokenEndpointReady: boolean;
  } | null;
  timestamp: string;
};

export type Microsoft365ConnectorActivityEvent = {
  timestamp: string;
  eventType:
    | "diagnostics_checked"
    | "oauth_url_generated"
    | "tenant_metadata_read"
    | "scope_policy_checked"
    | "snapshot_requested"
    | "snapshot_success"
    | "snapshot_failed";
  status: "success" | "failed" | "info";
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type Microsoft365ConnectUrlResponse = {
  provider: "microsoft365";
  status: Microsoft365ConnectorStatus;
  connectUrlReady: boolean;
  connectUrl: string | null;
  lastErrorCode: Microsoft365ConnectorErrorCode;
};

const configuredApiBaseUrl =
  (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

const now = new Date().toISOString();

export const microsoft365ReadonlySnapshotFallback: Microsoft365ReadonlySnapshot = {
  provider: "microsoft365",
  status: "NOT_CONFIGURED",
  statusLabel: "NOT_CONFIGURED",
  configured: false,
  lastErrorCode: "MISSING_MICROSOFT365_CONFIG",
  tenantIdPresent: false,
  clientIdPresent: false,
  clientSecretPresent: false,
  redirectUriPresent: false,
  scopesPresent: false,
  safeScopes: ["offline_access", "User.Read"],
  forbiddenScopesRequested: [],
  tenantReachable: false,
  consentReady: false,
  connectUrlReady: false,
  scopePolicySafe: true,
  redirectUriValid: false,
  subsystems: [
    { id: "outlook", label: "Outlook", status: "NOT_CONFIGURED", detail: "Ready after backend OAuth consent; no mail bodies in P0." },
    { id: "calendar", label: "Calendar", status: "NOT_CONFIGURED", detail: "Ready after consent; writes disabled." },
    { id: "contacts", label: "Contacts", status: "NOT_CONFIGURED", detail: "Ready after consent; viewer disabled in P0." },
    { id: "onedrive", label: "OneDrive", status: "NOT_CONFIGURED", detail: "Ready after consent; file browser disabled in P0." },
    { id: "proposalCenter", label: "Proposal Center", status: "NOT_CONFIGURED", detail: "Manual-first workflow awaits backend config." },
  ],
  evidenceTimeline: [
    {
      id: "m365-ui-safe-fallback",
      type: "HEALTH",
      title: "Microsoft 365 connector frontend is backend-only",
      description: "Dashboard calls GXEON api-server routes only and never stores Microsoft credentials or tokens.",
      occurredAt: now,
      source: "GXEON dashboard safe fallback",
    },
  ],
  health: {
    connectorGateway: "READY",
    microsoft365Connector: "NOT_CONFIGURED",
    healthScore: 0,
    lastSyncAt: null,
    lastErrorCode: "MISSING_MICROSOFT365_CONFIG",
    frontendTokenStorage: false,
    clientSecretExposure: false,
    graphWrites: false,
    mailSend: false,
    calendarWrites: false,
    fileWrites: false,
    personalDataPersistence: false,
  },
};

async function safeJsonFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { method: "GET", signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("BACKEND_UNAVAILABLE");
  }
  const contentType = response.headers.get("content-type");
  const bodyText = await response.text();
  const trimmedBody = bodyText.trimStart().toLowerCase();
  if (contentType?.includes("text/html") || trimmedBody.startsWith("<!doctype") || trimmedBody.startsWith("<html")) {
    throw new Error("BACKEND_URL_MISCONFIGURED");
  }
  const payload = (bodyText ? JSON.parse(bodyText) : {}) as T;
  if (!response.ok) throw new Error("MICROSOFT365_READINESS_FAILED");
  return payload;
}

export async function fetchMicrosoft365ConnectorSnapshot(signal?: AbortSignal): Promise<Microsoft365ReadonlySnapshot> {
  try {
    return await safeJsonFetch<Microsoft365ReadonlySnapshot>("/api/connectors/microsoft365/snapshot", signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const code = error instanceof Error && error.message === "BACKEND_URL_MISCONFIGURED" ? "BACKEND_URL_MISCONFIGURED" : "BACKEND_UNAVAILABLE";
    return {
      ...microsoft365ReadonlySnapshotFallback,
      statusLabel: code,
      lastErrorCode: code,
      health: { ...microsoft365ReadonlySnapshotFallback.health, lastErrorCode: code },
    };
  }
}

export async function fetchMicrosoft365ConnectorDiagnostics(signal?: AbortSignal): Promise<Microsoft365ConnectorDiagnostics | null> {
  try {
    return await safeJsonFetch<Microsoft365ConnectorDiagnostics>("/api/connectors/microsoft365/diagnostics", signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchMicrosoft365ConnectorActivity(signal?: AbortSignal): Promise<Microsoft365ConnectorActivityEvent[]> {
  try {
    const payload = await safeJsonFetch<{ events: Microsoft365ConnectorActivityEvent[] }>("/api/connectors/microsoft365/activity", signal);
    return payload.events;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}

export async function fetchMicrosoft365ConnectUrl(signal?: AbortSignal): Promise<Microsoft365ConnectUrlResponse> {
  return safeJsonFetch<Microsoft365ConnectUrlResponse>("/api/connectors/microsoft365/connect-url", signal);
}
