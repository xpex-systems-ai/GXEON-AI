import { getSupabaseConnectorConfig } from "./supabaseConnectorConfig";
import type {
  SupabaseConnectorErrorCode,
  SupabaseConnectorSectionError,
  SupabaseProbeResult,
  SupabaseProbeStage,
  SupabaseReadonlyRawSnapshot,
} from "./supabaseConnectorTypes";

type SupabaseClientConfig = ReturnType<typeof getSupabaseConnectorConfig>;

type OpenApiDocument = {
  definitions?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
  paths?: Record<string, unknown>;
};

export class SupabaseReadonlyClientError extends Error {
  code: SupabaseConnectorErrorCode;
  status: number | null;
  stage: SupabaseProbeStage;

  constructor(
    code: SupabaseConnectorErrorCode,
    message: string,
    stage: SupabaseProbeStage,
    status: number | null = null,
  ) {
    super(message);
    this.name = "SupabaseReadonlyClientError";
    this.code = code;
    this.status = status;
    this.stage = stage;
  }
}

function codeForStatus(status: number): SupabaseConnectorErrorCode {
  if (status === 401) return "SUPABASE_401";
  if (status === 403) return "SUPABASE_403";
  if (status === 404) return "SUPABASE_404";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SUPABASE_5XX";
  return "SUPABASE_READ_FAILED";
}

function safeHint(code: SupabaseConnectorErrorCode, stage: SupabaseProbeStage): string | null {
  if (code === "SUPABASE_401") return "Supabase backend key is invalid or expired.";
  if (code === "SUPABASE_403") return "Supabase backend key lacks permission for this read-only metadata endpoint.";
  if (code === "SUPABASE_404" && stage === "storage") return "Storage API is disabled or not available for this Supabase project.";
  if (code === "RATE_LIMITED") return "Supabase rate limit reached; retry after cooldown.";
  if (code === "DB_METADATA_UNAVAILABLE") return "Database metadata posture could not be inferred from safe read-only metadata.";
  return null;
}

function toSectionError(
  error: unknown,
  fallbackMessage: string,
  stage: SupabaseProbeStage,
): SupabaseConnectorSectionError {
  if (error instanceof SupabaseReadonlyClientError) {
    return {
      code: error.code,
      message: error.message,
      hint: safeHint(error.code, error.stage),
      status: error.status,
      stage: error.stage,
    };
  }
  return {
    code: "SUPABASE_READ_FAILED",
    message: fallbackMessage,
    hint: null,
    status: null,
    stage,
  };
}

async function safeSupabaseGet<T>(
  config: SupabaseClientConfig,
  path: string,
  stage: SupabaseProbeStage,
  preferServiceRole = false,
): Promise<T> {
  if (!config.supabaseUrl || !config.anonKey) {
    throw new SupabaseReadonlyClientError(
      "MISSING_SUPABASE_CONFIG",
      "Supabase backend URL and anon key are not configured.",
      stage,
    );
  }
  const url = new URL(path, `${config.supabaseUrl}/`);
  const key = preferServiceRole && config.serviceRoleKey ? config.serviceRoleKey : config.anonKey;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
  } catch {
    throw new SupabaseReadonlyClientError(
      "NETWORK_ERROR",
      "Supabase read-only network request failed.",
      stage,
    );
  }

  if (!response.ok) {
    throw new SupabaseReadonlyClientError(
      codeForStatus(response.status),
      `Supabase read-only ${stage} request failed with status ${response.status}.`,
      stage,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function okProbe(status: number | null = 200): SupabaseProbeResult {
  return { attempted: true, ok: true, status, code: null, message: null };
}

function failedProbe(error: SupabaseConnectorSectionError): SupabaseProbeResult {
  return {
    attempted: true,
    ok: false,
    status: error.status ?? null,
    code: error.code,
    message: error.message,
  };
}

function skippedProbe(message: string): SupabaseProbeResult {
  return { attempted: false, ok: false, status: null, code: null, message };
}

function tableCountFromOpenApi(document: OpenApiDocument): number | null {
  const schemas = document.definitions ?? document.components?.schemas;
  if (schemas && typeof schemas === "object") return Object.keys(schemas).length;
  if (document.paths && typeof document.paths === "object") {
    return Object.keys(document.paths).filter((path) => path !== "/").length;
  }
  return null;
}

export async function probeSupabaseRestRead(): Promise<{
  ok: boolean;
  status: number | null;
  code: SupabaseConnectorErrorCode | null;
  safeMessage: string | null;
  hint: string | null;
}> {
  const config = getSupabaseConnectorConfig();
  try {
    await safeSupabaseGet<OpenApiDocument>(config, "/rest/v1/", "rest");
    return { ok: true, status: 200, code: null, safeMessage: null, hint: null };
  } catch (error) {
    const sectionError = toSectionError(error, "Supabase REST read-only probe failed.", "rest");
    return {
      ok: false,
      status: sectionError.status ?? null,
      code: sectionError.code,
      safeMessage: sectionError.message,
      hint: sectionError.hint,
    };
  }
}

export async function readSupabaseReadonlySnapshot(): Promise<SupabaseReadonlyRawSnapshot> {
  const config = getSupabaseConnectorConfig();
  if (!config.configured) {
    throw new SupabaseReadonlyClientError(
      "MISSING_SUPABASE_CONFIG",
      "Supabase backend URL and anon key are not configured.",
      "project",
    );
  }

  const readAt = new Date().toISOString();
  let projectError: SupabaseConnectorSectionError | null = null;
  let restError: SupabaseConnectorSectionError | null = null;
  let authError: SupabaseConnectorSectionError | null = null;
  let storageError: SupabaseConnectorSectionError | null = null;
  let databaseMetadataError: SupabaseConnectorSectionError | null = null;
  let rlsMetadataError: SupabaseConnectorSectionError | null = null;

  const project = okProbe(200);
  let rest: SupabaseProbeResult = skippedProbe("REST probe not attempted.");
  let auth: SupabaseProbeResult = skippedProbe("Auth settings probe not attempted.");
  let storage: SupabaseProbeResult = skippedProbe("Storage metadata probe not attempted.");
  let databaseMetadata: SupabaseProbeResult = skippedProbe("Database metadata requires SUPABASE_DB_URL presence signal.");
  let rlsMetadata: SupabaseProbeResult = skippedProbe("RLS metadata requires database metadata readiness.");
  let bucketCount: number | null = null;
  let schemaCount: number | null = null;
  let tableCount: number | null = null;
  let rlsEnabledTables: number | null = null;
  let rlsMissingTables: number | null = null;
  let openApiDocument: OpenApiDocument | null = null;

  try {
    openApiDocument = await safeSupabaseGet<OpenApiDocument>(config, "/rest/v1/", "rest");
    rest = okProbe(200);
  } catch (error) {
    restError = toSectionError(error, "Supabase REST metadata probe failed.", "rest");
    rest = failedProbe(restError);
  }

  try {
    await safeSupabaseGet<unknown>(config, "/auth/v1/settings", "auth");
    auth = okProbe(200);
  } catch (error) {
    authError = toSectionError(error, "Supabase auth settings metadata probe failed.", "auth");
    auth = failedProbe(authError);
  }

  try {
    const buckets = await safeSupabaseGet<unknown[]>(config, "/storage/v1/bucket", "storage", true);
    bucketCount = Array.isArray(buckets) ? buckets.length : null;
    storage = okProbe(200);
  } catch (error) {
    storageError = toSectionError(error, "Supabase storage bucket metadata probe failed.", "storage");
    storage = failedProbe(storageError);
  }

  if (config.dbUrlPresent) {
    try {
      if (!openApiDocument) {
        openApiDocument = await safeSupabaseGet<OpenApiDocument>(config, "/rest/v1/", "database_metadata");
      }
      tableCount = tableCountFromOpenApi(openApiDocument);
      schemaCount = tableCount === null ? null : 1;
      databaseMetadata = okProbe(200);
      rlsEnabledTables = null;
      rlsMissingTables = null;
      rlsMetadata = {
        attempted: true,
        ok: true,
        status: 200,
        code: null,
        message: "RLS posture remains metadata-only in P0; no table row data returned.",
      };
    } catch (error) {
      databaseMetadataError = toSectionError(
        error,
        "Supabase database metadata probe failed.",
        "database_metadata",
      );
      databaseMetadata = failedProbe(databaseMetadataError);
      rlsMetadataError = {
        code: "DB_METADATA_UNAVAILABLE",
        message: "RLS metadata could not be checked because database metadata was unavailable.",
        hint: safeHint("DB_METADATA_UNAVAILABLE", "rls_metadata"),
        status: null,
        stage: "rls_metadata",
      };
      rlsMetadata = failedProbe(rlsMetadataError);
    }
  }

  return {
    readAt,
    projectRefPresent: config.projectRefPresent,
    probes: { project, rest, auth, storage, databaseMetadata, rlsMetadata },
    counts: { bucketCount, schemaCount, tableCount, rlsEnabledTables, rlsMissingTables },
    sectionErrors: {
      projectError,
      restError,
      authError,
      storageError,
      databaseMetadataError,
      rlsMetadataError,
    },
  };
}
