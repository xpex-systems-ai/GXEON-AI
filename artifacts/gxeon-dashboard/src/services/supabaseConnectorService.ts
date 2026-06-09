export type SupabaseConnectorStatus =
  | "READY"
  | "CONNECTED_READONLY"
  | "PARTIAL_READONLY"
  | "FAILED";

export type SupabaseConnectorErrorCode =
  | "NONE"
  | "MISSING_SUPABASE_CONFIG"
  | "SUPABASE_401"
  | "SUPABASE_403"
  | "SUPABASE_404"
  | "RATE_LIMITED"
  | "SUPABASE_5XX"
  | "INVALID_SUPABASE_URL"
  | "TIMEOUT"
  | "TLS_DNS_ERROR"
  | "NETWORK_ERROR"
  | "SUPABASE_READ_FAILED"
  | "DB_METADATA_UNAVAILABLE"
  | "BACKEND_RETURNED_HTML"
  | "BACKEND_URL_MISCONFIGURED"
  | "BACKEND_UNAVAILABLE";

export type SupabaseConnectorSectionError = {
  code: SupabaseConnectorErrorCode;
  message: string;
  hint: string | null;
  status?: number | null;
  stage?: string;
  host?: string | null;
  path?: string | null;
};

export type SupabaseConnectorDiagnostics = {
  provider: "supabase";
  routeStatus: "ONLINE";
  configured: boolean;
  urlPresent: boolean;
  anonKeyPresent: boolean;
  serviceRolePresent: boolean;
  projectRefPresent: boolean;
  dbUrlPresent: boolean;
  missing: SupabaseConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  readProbe: {
    attempted: boolean;
    ok: boolean;
    stage: string | null;
    status: number | null;
    code: SupabaseConnectorErrorCode | null;
    safeMessage: string | null;
    hint: string | null;
    host?: string | null;
    path?: string | null;
  } | null;
  timestamp: string;
};

export type SupabaseReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "REST" | "AUTH" | "STORAGE" | "DATABASE" | "RLS" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type SupabaseReadonlySnapshot = {
  provider: "supabase";
  status: SupabaseConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: SupabaseConnectorErrorCode;
  projectError: SupabaseConnectorSectionError | null;
  restError: SupabaseConnectorSectionError | null;
  authError: SupabaseConnectorSectionError | null;
  storageError: SupabaseConnectorSectionError | null;
  databaseMetadataError: SupabaseConnectorSectionError | null;
  rlsMetadataError: SupabaseConnectorSectionError | null;
  urlConfigured: boolean;
  anonConfigured: boolean;
  serviceRoleConfigured: boolean;
  dbUrlConfigured: boolean;
  restReachable: boolean;
  authReachable: boolean;
  storageReachable: boolean;
  dbMetadataReachable: boolean;
  bucketCount: number | null;
  schemaCount: number | null;
  tableCount: number | null;
  rlsEnabledTables: number | null;
  rlsMissingTables: number | null;
  evidenceTimeline: SupabaseReadonlyEvidence[];
  health: {
    connectorGateway: "READY";
    supabaseConnector:
      | "READY_FOR_BACKEND_READONLY_CONNECTION"
      | "CONNECTED_READONLY"
      | "PARTIAL_READONLY"
      | "FAILED";
    healthScore: number;
    lastSyncAt: string | null;
    lastErrorCode: SupabaseConnectorErrorCode;
    frontendServiceRoleStorage: false;
    frontendDbUrlStorage: false;
    providerWrites: false;
    migrations: false;
    secretExposure: false;
  };
};

export type SupabaseConnectorActivityEvent = {
  timestamp: string;
  eventType:
    | "diagnostics_checked"
    | "snapshot_requested"
    | "project_read"
    | "rest_probe_read"
    | "storage_metadata_read"
    | "database_metadata_read"
    | "rls_metadata_read"
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

export const supabaseReadonlySnapshotFallback: SupabaseReadonlySnapshot = {
  provider: "supabase",
  status: "READY",
  statusLabel: "READY_FOR_BACKEND_READONLY_CONNECTION",
  configured: false,
  lastErrorCode: "MISSING_SUPABASE_CONFIG",
  projectError: null,
  restError: null,
  authError: null,
  storageError: null,
  databaseMetadataError: null,
  rlsMetadataError: null,
  urlConfigured: false,
  anonConfigured: false,
  serviceRoleConfigured: false,
  dbUrlConfigured: false,
  restReachable: false,
  authReachable: false,
  storageReachable: false,
  dbMetadataReachable: false,
  bucketCount: null,
  schemaCount: null,
  tableCount: null,
  rlsEnabledTables: null,
  rlsMissingTables: null,
  evidenceTimeline: [
    {
      id: "supabase-ui-safe-fallback",
      type: "HEALTH",
      title: "Supabase connector frontend is backend-only",
      description: "Dashboard fetches only GXEON backend connector routes and never stores Supabase credentials.",
      occurredAt: new Date().toISOString(),
      source: "GXEON dashboard safe fallback",
    },
  ],
  health: {
    connectorGateway: "READY",
    supabaseConnector: "READY_FOR_BACKEND_READONLY_CONNECTION",
    healthScore: 0,
    lastSyncAt: null,
    lastErrorCode: "MISSING_SUPABASE_CONFIG",
    frontendServiceRoleStorage: false,
    frontendDbUrlStorage: false,
    providerWrites: false,
    migrations: false,
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
  if (!response.ok) throw new Error("SUPABASE_READ_FAILED");
  return payload;
}

export async function fetchSupabaseConnectorSnapshot(
  signal?: AbortSignal,
): Promise<SupabaseReadonlySnapshot> {
  try {
    return await safeJsonFetch<SupabaseReadonlySnapshot>("/api/connectors/supabase/snapshot", signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return supabaseReadonlySnapshotFallback;
  }
}

export async function fetchSupabaseConnectorDiagnostics(
  signal?: AbortSignal,
): Promise<SupabaseConnectorDiagnostics | null> {
  try {
    return await safeJsonFetch<SupabaseConnectorDiagnostics>("/api/connectors/supabase/diagnostics", signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchSupabaseConnectorActivity(
  signal?: AbortSignal,
): Promise<SupabaseConnectorActivityEvent[]> {
  try {
    const payload = await safeJsonFetch<{ events: SupabaseConnectorActivityEvent[] }>(
      "/api/connectors/supabase/activity",
      signal,
    );
    return payload.events;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return [];
  }
}
