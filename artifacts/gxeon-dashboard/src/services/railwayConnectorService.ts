export type RailwayConnectorStatus =
  | "READY"
  | "CONNECTED_READONLY"
  | "PARTIAL_READONLY"
  | "FAILED";

export type RailwayConnectorErrorCode =
  | "NONE"
  | "MISSING_RAILWAY_TOKEN"
  | "RAILWAY_401"
  | "RAILWAY_403"
  | "RAILWAY_404"
  | "RATE_LIMITED"
  | "RAILWAY_5XX"
  | "RAILWAY_GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "RAILWAY_READ_FAILED"
  | "BACKEND_RETURNED_HTML"
  | "BACKEND_URL_MISCONFIGURED"
  | "BACKEND_UNAVAILABLE";

export type RailwayConnectorSectionError = {
  code: RailwayConnectorErrorCode;
  message: string;
  hint: string | null;
};

export type RailwayConnectorDiagnostics = {
  provider: "railway";
  routeStatus: "ONLINE";
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  projectIdPresent: boolean;
  environmentIdPresent: boolean;
  apiBaseUrlConfigured: boolean;
  apiBaseUrl: string;
  missing: RailwayConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  readProbe: {
    attempted: boolean;
    ok: boolean;
    status: number | null;
    code: RailwayConnectorErrorCode | null;
    projectCount: number | null;
    hint: string | null;
  } | null;
  timestamp: string;
};

export type RailwayReadonlyProject = {
  id: string;
  name: string;
  updatedAt: string | null;
};

export type RailwayReadonlyService = {
  id: string;
  name: string;
  status: string;
  latestDeploymentStatus: string;
  domainCount: number;
  publicUrl: string | null;
  updatedAt: string | null;
};

export type RailwayReadonlyDeployment = {
  id: string;
  serviceId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RailwayReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "SERVICE" | "DEPLOYMENT" | "DOMAIN" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type RailwayReadonlySnapshot = {
  provider: "railway";
  status: RailwayConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: RailwayConnectorErrorCode;
  viewerError: RailwayConnectorSectionError | null;
  projectsError: RailwayConnectorSectionError | null;
  servicesError: RailwayConnectorSectionError | null;
  deploymentsError: RailwayConnectorSectionError | null;
  domainsError: RailwayConnectorSectionError | null;
  envPresenceError: RailwayConnectorSectionError | null;
  projectCount: number;
  serviceCount: number;
  deploymentCount: number;
  failedDeployments: number;
  runningServices: number;
  domainCount: number;
  selectedProject: RailwayReadonlyProject | null;
  services: RailwayReadonlyService[];
  deployments: RailwayReadonlyDeployment[];
  evidenceTimeline: RailwayReadonlyEvidence[];
  health: {
    connectorGateway: "READY";
    railwayConnector:
      | "READY_FOR_CONNECTION"
      | "CONNECTED_READONLY"
      | "PARTIAL_READONLY"
      | "FAILED";
    healthScore: number;
    lastSyncAt: string | null;
    lastErrorCode: RailwayConnectorErrorCode;
    frontendTokenStorage: false;
    providerWrites: false;
    secretExposure: false;
    commandExecution: false;
  };
};

export type RailwayConnectorActivityEvent = {
  timestamp: string;
  eventType:
    | "diagnostics_checked"
    | "snapshot_requested"
    | "projects_read"
    | "services_read"
    | "deployments_read"
    | "env_presence_read"
    | "logs_metadata_read"
    | "snapshot_success"
    | "snapshot_failed";
  status: "success" | "failed" | "info";
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

const configuredApiBaseUrl =
  (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

export const railwayReadonlySnapshotFallback: RailwayReadonlySnapshot = {
  provider: "railway",
  status: "READY",
  statusLabel: "READY_FOR_BACKEND_READONLY_CONNECTION",
  configured: false,
  lastErrorCode: "MISSING_RAILWAY_TOKEN",
  viewerError: null,
  projectsError: null,
  servicesError: null,
  deploymentsError: null,
  domainsError: null,
  envPresenceError: null,
  projectCount: 0,
  serviceCount: 0,
  deploymentCount: 0,
  failedDeployments: 0,
  runningServices: 0,
  domainCount: 0,
  selectedProject: null,
  services: [],
  deployments: [],
  evidenceTimeline: [
    {
      id: "railway-ui-safe-fallback",
      type: "HEALTH",
      title: "Railway connector frontend is read-only",
      description: "Dashboard fetches only GXEON backend routes and never stores credentials.",
      occurredAt: new Date().toISOString(),
      source: "GXEON dashboard safe fallback",
    },
  ],
  health: {
    connectorGateway: "READY",
    railwayConnector: "READY_FOR_CONNECTION",
    healthScore: 0,
    lastSyncAt: null,
    lastErrorCode: "MISSING_RAILWAY_TOKEN",
    frontendTokenStorage: false,
    providerWrites: false,
    secretExposure: false,
    commandExecution: false,
  },
};

async function safeJsonFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
    });
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
  if (!response.ok) throw new Error("RAILWAY_READ_FAILED");
  return payload;
}

export async function fetchRailwayConnectorSnapshot(
  signal?: AbortSignal,
): Promise<RailwayReadonlySnapshot> {
  try {
    return await safeJsonFetch<RailwayReadonlySnapshot>(
      "/api/connectors/railway/snapshot",
      signal,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const code =
      error instanceof Error && error.message === "BACKEND_URL_MISCONFIGURED"
        ? "BACKEND_URL_MISCONFIGURED"
        : "BACKEND_UNAVAILABLE";
    return {
      ...railwayReadonlySnapshotFallback,
      statusLabel: code,
      lastErrorCode: code,
      health: {
        ...railwayReadonlySnapshotFallback.health,
        lastErrorCode: code,
      },
    };
  }
}

export async function fetchRailwayConnectorDiagnostics(
  signal?: AbortSignal,
): Promise<RailwayConnectorDiagnostics | null> {
  try {
    return await safeJsonFetch<RailwayConnectorDiagnostics>(
      "/api/connectors/railway/diagnostics",
      signal,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchRailwayConnectorActivity(
  signal?: AbortSignal,
): Promise<RailwayConnectorActivityEvent[]> {
  try {
    const payload = await safeJsonFetch<{ events: RailwayConnectorActivityEvent[] }>(
      "/api/connectors/railway/activity",
      signal,
    );
    return payload.events ?? [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}
