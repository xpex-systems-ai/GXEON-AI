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
  | "NETWORK_ERROR"
  | "SUPABASE_READ_FAILED"
  | "DB_METADATA_UNAVAILABLE";

export type SupabaseProbeStage =
  | "project"
  | "rest"
  | "auth"
  | "storage"
  | "database_metadata"
  | "rls_metadata";

export type SupabaseConnectorSectionError = {
  code: SupabaseConnectorErrorCode;
  message: string;
  hint: string | null;
  status?: number | null;
  stage?: SupabaseProbeStage;
};

export type SupabaseConnectorConfig = {
  supabaseUrl: string | null;
  projectRef: string | null;
  configured: boolean;
  urlPresent: boolean;
  anonKeyPresent: boolean;
  serviceRolePresent: boolean;
  projectRefPresent: boolean;
  dbUrlPresent: boolean;
  missing: SupabaseConnectorErrorCode[];
};

export type SupabaseConnectorRuntimeDiagnostics = {
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
    stage: SupabaseProbeStage | null;
    status: number | null;
    code: SupabaseConnectorErrorCode | null;
    safeMessage: string | null;
    hint: string | null;
  } | null;
  timestamp: string;
};

export type SupabaseReadonlyRawSnapshot = {
  readAt: string;
  projectRefPresent: boolean;
  probes: {
    project: SupabaseProbeResult;
    rest: SupabaseProbeResult;
    auth: SupabaseProbeResult;
    storage: SupabaseProbeResult;
    databaseMetadata: SupabaseProbeResult;
    rlsMetadata: SupabaseProbeResult;
  };
  counts: {
    bucketCount: number | null;
    schemaCount: number | null;
    tableCount: number | null;
    rlsEnabledTables: number | null;
    rlsMissingTables: number | null;
  };
  sectionErrors: {
    projectError: SupabaseConnectorSectionError | null;
    restError: SupabaseConnectorSectionError | null;
    authError: SupabaseConnectorSectionError | null;
    storageError: SupabaseConnectorSectionError | null;
    databaseMetadataError: SupabaseConnectorSectionError | null;
    rlsMetadataError: SupabaseConnectorSectionError | null;
  };
};

export type SupabaseProbeResult = {
  attempted: boolean;
  ok: boolean;
  status: number | null;
  code: SupabaseConnectorErrorCode | null;
  message: string | null;
};

export type SupabaseReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "REST" | "AUTH" | "STORAGE" | "DATABASE" | "RLS" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type SupabaseReadonlyHealth = {
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
  secretExposure: false;
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
  health: SupabaseReadonlyHealth;
};
