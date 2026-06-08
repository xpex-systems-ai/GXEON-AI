export type VercelConnectorStatus = "READY" | "CONNECTED_READONLY" | "FAILED";

export type VercelConnectorErrorCode =
  | "NONE"
  | "MISSING_VERCEL_TOKEN"
  | "VERCEL_401"
  | "VERCEL_403"
  | "VERCEL_404"
  | "RATE_LIMITED"
  | "VERCEL_5XX"
  | "NETWORK_ERROR"
  | "VERCEL_READ_FAILED"
  | "BACKEND_RETURNED_HTML"
  | "BACKEND_URL_MISCONFIGURED"
  | "BACKEND_UNAVAILABLE";

export type VercelConnectorDiagnostics = {
  provider: "vercel";
  routeStatus: "ONLINE";
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  apiBaseUrlConfigured: boolean;
  missing: VercelConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  timestamp: string;
};

export type VercelReadonlyProject = {
  id: string;
  name: string;
  framework: string | null;
  productionUrl: string | null;
  latestDeploymentState: string;
  lastReadAt: string;
};

export type VercelReadonlyDeployment = {
  id: string;
  projectId: string;
  name: string;
  url: string | null;
  state: string;
  target: string | null;
  createdAt: string | null;
};

export type VercelReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "DEPLOYMENT" | "DOMAIN" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type VercelReadonlySnapshot = {
  provider: "vercel";
  status: VercelConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: VercelConnectorErrorCode;
  totalProjects: number;
  productionReady: number;
  failedLast24h: number;
  domainsConfigured: number;
  previewCount: number;
  projects: VercelReadonlyProject[];
  latestDeployments: VercelReadonlyDeployment[];
  evidenceTimeline: VercelReadonlyEvidence[];
  health: {
    connectorGateway: "READY";
    vercelConnector: "READY_FOR_CONNECTION" | "CONNECTED_READONLY" | "FAILED";
    healthScore: number;
    lastSyncAt: string | null;
    lastErrorCode: VercelConnectorErrorCode;
    frontendTokenStorage: false;
    providerWrites: false;
    secretExposure: false;
  };
};

export type VercelConnectorActivityEvent = {
  timestamp: string;
  eventType:
    | "diagnostics_checked"
    | "snapshot_requested"
    | "projects_read"
    | "deployments_read"
    | "domains_read"
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

export const vercelReadonlySnapshotFallback: VercelReadonlySnapshot = {
  provider: "vercel",
  status: "READY",
  statusLabel: "READY_FOR_BACKEND_TOKEN",
  configured: false,
  lastErrorCode: "MISSING_VERCEL_TOKEN",
  totalProjects: 0,
  productionReady: 0,
  failedLast24h: 0,
  domainsConfigured: 0,
  previewCount: 0,
  projects: [],
  latestDeployments: [],
  evidenceTimeline: [
    {
      id: "vercel-ui-safe-fallback",
      type: "HEALTH",
      title: "Vercel connector frontend is read-only",
      description: "Dashboard fetches only GXEON backend routes and never stores credentials.",
      occurredAt: new Date().toISOString(),
      source: "GXEON dashboard safe fallback",
    },
  ],
  health: {
    connectorGateway: "READY",
    vercelConnector: "READY_FOR_CONNECTION",
    healthScore: 0,
    lastSyncAt: null,
    lastErrorCode: "MISSING_VERCEL_TOKEN",
    frontendTokenStorage: false,
    providerWrites: false,
    secretExposure: false,
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
  if (!response.ok) throw new Error("VERCEL_READ_FAILED");
  return payload;
}

export async function fetchVercelConnectorSnapshot(
  signal?: AbortSignal,
): Promise<VercelReadonlySnapshot> {
  try {
    return await safeJsonFetch<VercelReadonlySnapshot>(
      "/api/connectors/vercel/snapshot",
      signal,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const code =
      error instanceof Error && error.message === "BACKEND_URL_MISCONFIGURED"
        ? "BACKEND_URL_MISCONFIGURED"
        : "BACKEND_UNAVAILABLE";
    return {
      ...vercelReadonlySnapshotFallback,
      statusLabel: code,
      lastErrorCode: code,
      health: {
        ...vercelReadonlySnapshotFallback.health,
        lastErrorCode: code,
      },
    };
  }
}

export async function fetchVercelConnectorDiagnostics(
  signal?: AbortSignal,
): Promise<VercelConnectorDiagnostics | null> {
  try {
    return await safeJsonFetch<VercelConnectorDiagnostics>(
      "/api/connectors/vercel/diagnostics",
      signal,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchVercelConnectorActivity(
  signal?: AbortSignal,
): Promise<VercelConnectorActivityEvent[]> {
  try {
    const payload = await safeJsonFetch<{
      provider: "vercel";
      events: VercelConnectorActivityEvent[];
    }>("/api/connectors/vercel/activity", signal);
    return payload.events;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}
