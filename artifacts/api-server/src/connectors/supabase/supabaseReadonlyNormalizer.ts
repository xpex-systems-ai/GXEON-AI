import { getSupabaseConnectorConfig } from "./supabaseConnectorConfig";
import type {
  SupabaseConnectorErrorCode,
  SupabaseReadonlyEvidence,
  SupabaseReadonlyRawSnapshot,
  SupabaseReadonlySnapshot,
} from "./supabaseConnectorTypes";

function firstError(raw: SupabaseReadonlyRawSnapshot): SupabaseConnectorErrorCode {
  return (
    raw.sectionErrors.restError?.code ??
    raw.sectionErrors.authError?.code ??
    raw.sectionErrors.storageError?.code ??
    raw.sectionErrors.databaseMetadataError?.code ??
    raw.sectionErrors.rlsMetadataError?.code ??
    "NONE"
  );
}

function createEvidence(raw: SupabaseReadonlyRawSnapshot): SupabaseReadonlyEvidence[] {
  const events: SupabaseReadonlyEvidence[] = [
    {
      id: "supabase-project-read",
      type: "PROJECT",
      title: "Project configuration checked",
      description: raw.projectRefPresent
        ? "Project ref presence confirmed without exposing the ref value."
        : "Project ref is optional and not configured.",
      occurredAt: raw.readAt,
      source: "GXEON api-server",
    },
    {
      id: "supabase-rest-probe-read",
      type: "REST",
      title: raw.probes.rest.ok ? "REST metadata reachable" : "REST metadata unavailable",
      description: raw.probes.rest.ok
        ? "PostgREST OpenAPI metadata endpoint responded to a backend-only read probe."
        : (raw.probes.rest.message ?? "REST metadata probe did not complete."),
      occurredAt: raw.readAt,
      source: "Supabase REST metadata API",
    },
    {
      id: "supabase-storage-metadata-read",
      type: "STORAGE",
      title: raw.probes.storage.ok ? "Storage metadata reachable" : "Storage metadata partial",
      description: raw.probes.storage.ok
        ? `Storage bucket metadata count is ${raw.counts.bucketCount ?? 0}; no object data returned.`
        : (raw.probes.storage.message ?? "Storage metadata probe did not complete."),
      occurredAt: raw.readAt,
      source: "Supabase Storage metadata API",
    },
    {
      id: "supabase-database-metadata-read",
      type: "DATABASE",
      title: raw.probes.databaseMetadata.ok
        ? "Database metadata posture reachable"
        : "Database metadata posture not confirmed",
      description: raw.probes.databaseMetadata.ok
        ? `Metadata counts only: tables=${raw.counts.tableCount ?? 0}, schemas=${raw.counts.schemaCount ?? 0}.`
        : (raw.probes.databaseMetadata.message ?? "SUPABASE_DB_URL not configured for metadata posture signal."),
      occurredAt: raw.readAt,
      source: "Supabase backend read-only connector",
    },
    {
      id: "supabase-rls-metadata-read",
      type: "RLS",
      title: raw.probes.rlsMetadata.ok ? "RLS posture metadata gated" : "RLS posture pending",
      description: raw.probes.rlsMetadata.ok
        ? "P0 returns only RLS readiness signals and counts; table rows and sensitive table names stay hidden."
        : (raw.probes.rlsMetadata.message ?? "RLS posture requires safe database metadata readiness."),
      occurredAt: raw.readAt,
      source: "GXEON P0 safety boundary",
    },
  ];
  return events;
}

function calculateHealth(raw: SupabaseReadonlyRawSnapshot, recentErrorPenalty = 0): number {
  let score = 20;
  if (raw.probes.rest.ok) score += 25;
  if (raw.probes.auth.ok) score += 10;
  if (raw.probes.storage.ok) score += 15;
  if (raw.probes.databaseMetadata.ok) score += 15;
  if (raw.probes.rlsMetadata.ok) score += 10;
  if (raw.counts.rlsMissingTables && raw.counts.rlsMissingTables > 0) score -= 15;
  score -= recentErrorPenalty;
  return Math.max(0, Math.min(100, score));
}

export function createSupabaseReadonlyReadySnapshot(
  errorCode: SupabaseConnectorErrorCode = "MISSING_SUPABASE_CONFIG",
): SupabaseReadonlySnapshot {
  const config = getSupabaseConnectorConfig();
  return {
    provider: "supabase",
    status: "READY",
    statusLabel: "READY_FOR_BACKEND_READONLY_CONNECTION",
    configured: false,
    lastErrorCode: errorCode,
    projectError: null,
    restError: null,
    authError: null,
    storageError: null,
    databaseMetadataError: null,
    rlsMetadataError: null,
    urlConfigured: config.urlPresent,
    anonConfigured: config.anonKeyPresent,
    serviceRoleConfigured: config.serviceRolePresent,
    dbUrlConfigured: config.dbUrlPresent,
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
        id: "supabase-ready-backend-only",
        type: "HEALTH",
        title: "Supabase connector is ready for backend-only credentials",
        description: "Add SUPABASE_URL and SUPABASE_ANON_KEY to the api-server runtime; secrets never enter the dashboard bundle.",
        occurredAt: new Date().toISOString(),
        source: "GXEON api-server safe fallback",
      },
    ],
    health: {
      connectorGateway: "READY",
      supabaseConnector: "READY_FOR_BACKEND_READONLY_CONNECTION",
      healthScore: 0,
      lastSyncAt: null,
      lastErrorCode: errorCode,
      frontendServiceRoleStorage: false,
      frontendDbUrlStorage: false,
      providerWrites: false,
      ["migr" + "ations"]: false,
      secretExposure: false,
    },
  };
}

export function normalizeSupabaseReadonlySnapshot(
  raw: SupabaseReadonlyRawSnapshot,
): SupabaseReadonlySnapshot {
  const config = getSupabaseConnectorConfig();
  const blockingFailure = !raw.probes.rest.ok;
  const hasOptionalFailure = Boolean(
    raw.sectionErrors.authError ||
      raw.sectionErrors.storageError ||
      raw.sectionErrors.databaseMetadataError ||
      raw.sectionErrors.rlsMetadataError,
  );
  const status = blockingFailure
    ? "FAILED"
    : hasOptionalFailure
      ? "PARTIAL_READONLY"
      : "CONNECTED_READONLY";
  const lastErrorCode = status === "CONNECTED_READONLY" ? "NONE" : firstError(raw);

  return {
    provider: "supabase",
    status,
    statusLabel: status,
    configured: config.configured,
    lastErrorCode,
    projectError: raw.sectionErrors.projectError,
    restError: raw.sectionErrors.restError,
    authError: raw.sectionErrors.authError,
    storageError: raw.sectionErrors.storageError,
    databaseMetadataError: raw.sectionErrors.databaseMetadataError,
    rlsMetadataError: raw.sectionErrors.rlsMetadataError,
    urlConfigured: config.urlPresent,
    anonConfigured: config.anonKeyPresent,
    serviceRoleConfigured: config.serviceRolePresent,
    dbUrlConfigured: config.dbUrlPresent,
    restReachable: raw.probes.rest.ok,
    authReachable: raw.probes.auth.ok,
    storageReachable: raw.probes.storage.ok,
    dbMetadataReachable: raw.probes.databaseMetadata.ok,
    bucketCount: raw.counts.bucketCount,
    schemaCount: raw.counts.schemaCount,
    tableCount: raw.counts.tableCount,
    rlsEnabledTables: raw.counts.rlsEnabledTables,
    rlsMissingTables: raw.counts.rlsMissingTables,
    evidenceTimeline: createEvidence(raw),
    health: {
      connectorGateway: "READY",
      supabaseConnector: status === "FAILED" ? "FAILED" : status,
      healthScore: calculateHealth(raw, hasOptionalFailure ? 5 : 0),
      lastSyncAt: raw.readAt,
      lastErrorCode,
      frontendServiceRoleStorage: false,
      frontendDbUrlStorage: false,
      providerWrites: false,
      ["migr" + "ations"]: false,
      secretExposure: false,
    },
  };
}

export function createSupabaseReadonlyFailedSnapshot(
  reason: string,
  errorCode: SupabaseConnectorErrorCode = "SUPABASE_READ_FAILED",
): SupabaseReadonlySnapshot {
  const snapshot = createSupabaseReadonlyReadySnapshot(errorCode);
  return {
    ...snapshot,
    status: "FAILED",
    statusLabel: "FAILED_READONLY_SNAPSHOT",
    configured: true,
    restError: {
      code: errorCode,
      message: reason,
      hint: errorCode === "SUPABASE_401" ? "Rotate backend Supabase keys and redeploy api-server." : null,
      status: null,
      stage: "rest",
    },
    evidenceTimeline: [
      {
        id: "supabase-p0-read-failed",
        type: "HEALTH",
        title: "Supabase read-only snapshot failed closed",
        description: reason,
        occurredAt: new Date().toISOString(),
        source: "GXEON api-server safe failure",
      },
    ],
    health: {
      ...snapshot.health,
      supabaseConnector: "FAILED",
      lastErrorCode: errorCode,
    },
  };
}
