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

type SafeEndpoint = {
  url: URL;
  host: string;
  path: string;
};

const probeTimeoutMs = 8_000;

export class SupabaseReadonlyClientError extends Error {
  code: SupabaseConnectorErrorCode;
  status: number | null;
  stage: SupabaseProbeStage;
  host: string | null;
  path: string | null;

  constructor(
    code: SupabaseConnectorErrorCode,
    message: string,
    stage: SupabaseProbeStage,
    status: number | null = null,
    endpoint: Pick<SafeEndpoint, "host" | "path"> | null = null,
  ) {
    super(sanitizeMessage(message));
    this.name = "SupabaseReadonlyClientError";
    this.code = code;
    this.status = status;
    this.stage = stage;
    this.host = endpoint?.host ?? null;
    this.path = endpoint?.path ?? null;
  }
}

function sanitizeMessage(message: string): string {
  return message.replace(/[\r\n\t]+/g, " ").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 300);
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
  if (code === "INVALID_SUPABASE_URL") return "Confirm SUPABASE_URL uses https://PROJECT_REF.supabase.co with no path, query string or key material.";
  if (code === "TIMEOUT") return "Supabase probe timed out from the backend runtime; check Railway outbound networking and Supabase project availability.";
  if (code === "TLS_DNS_ERROR") return "Backend could not resolve or establish TLS with the Supabase host; verify project ref and DNS/TLS reachability.";
  if (code === "NETWORK_ERROR") return "Backend network probe failed before Supabase returned an HTTP response.";
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
      host: error.host,
      path: error.path,
    };
  }
  return {
    code: "SUPABASE_READ_FAILED",
    message: sanitizeMessage(fallbackMessage),
    hint: null,
    status: null,
    stage,
    host: null,
    path: null,
  };
}

function validateSupabaseEndpoint(
  config: SupabaseClientConfig,
  path: string,
  stage: SupabaseProbeStage,
): SafeEndpoint {
  if (!config.supabaseUrl || !config.anonKey) {
    throw new SupabaseReadonlyClientError(
      "MISSING_SUPABASE_CONFIG",
      "Supabase backend URL and anon key are not configured.",
      stage,
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(config.supabaseUrl);
  } catch {
    throw new SupabaseReadonlyClientError(
      "INVALID_SUPABASE_URL",
      "SUPABASE_URL is not a valid URL. Expected https://PROJECT_REF.supabase.co.",
      stage,
    );
  }

  if (baseUrl.protocol !== "https:" && process.env.NODE_ENV !== "development") {
    throw new SupabaseReadonlyClientError(
      "INVALID_SUPABASE_URL",
      "SUPABASE_URL must use https:// outside development.",
      stage,
      null,
      { host: baseUrl.hostname, path: baseUrl.pathname || "/" },
    );
  }

  if (!baseUrl.hostname || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new SupabaseReadonlyClientError(
      "INVALID_SUPABASE_URL",
      "SUPABASE_URL must include only scheme and host, without credentials, query string or fragment.",
      stage,
      null,
      { host: baseUrl.hostname, path: baseUrl.pathname || "/" },
    );
  }

  if (baseUrl.pathname !== "/" && baseUrl.pathname !== "") {
    throw new SupabaseReadonlyClientError(
      "INVALID_SUPABASE_URL",
      "SUPABASE_URL must not include an API path. Expected https://PROJECT_REF.supabase.co.",
      stage,
      null,
      { host: baseUrl.hostname, path: baseUrl.pathname },
    );
  }

  const url = new URL(path, `${baseUrl.origin}/`);
  return { url, host: url.hostname, path: url.pathname };
}

function classifyFetchError(error: unknown): SupabaseConnectorErrorCode {
  if (error instanceof DOMException && error.name === "AbortError") return "TIMEOUT";
  if (error instanceof Error) {
    const message = `${error.name} ${error.message}`.toLowerCase();
    if (message.includes("abort") || message.includes("timeout")) return "TIMEOUT";
    if (
      message.includes("enotfound") ||
      message.includes("eai_again") ||
      message.includes("certificate") ||
      message.includes("tls") ||
      message.includes("ssl") ||
      message.includes("self-signed") ||
      message.includes("dns")
    ) {
      return "TLS_DNS_ERROR";
    }
  }
  return "NETWORK_ERROR";
}

async function safeSupabaseGet<T>(
  config: SupabaseClientConfig,
  path: string,
  stage: SupabaseProbeStage,
  preferServiceRole = false,
): Promise<{ data: T; status: number; endpoint: SafeEndpoint }> {
  const endpoint = validateSupabaseEndpoint(config, path, stage);
  const key = preferServiceRole && config.serviceRoleKey ? config.serviceRoleKey : config.anonKey;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), probeTimeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint.url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        apikey: key ?? "",
        Authorization: `Bearer ${key ?? ""}`,
      },
    });
  } catch (error) {
    const code = classifyFetchError(error);
    const details = error instanceof Error ? ` ${sanitizeMessage(error.message)}` : "";
    throw new SupabaseReadonlyClientError(
      code,
      `Supabase read-only ${stage} network probe failed.${details}`,
      stage,
      null,
      endpoint,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SupabaseReadonlyClientError(
      codeForStatus(response.status),
      `Supabase read-only ${stage} request failed with status ${response.status}.`,
      stage,
      response.status,
      endpoint,
    );
  }

  try {
    return { data: (await response.json()) as T, status: response.status, endpoint };
  } catch {
    throw new SupabaseReadonlyClientError(
      "SUPABASE_READ_FAILED",
      `Supabase read-only ${stage} response was not valid JSON metadata.`,
      stage,
      response.status,
      endpoint,
    );
  }
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
    host: error.host ?? null,
    path: error.path ?? null,
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
  attempted: boolean;
  ok: boolean;
  stage: SupabaseProbeStage | null;
  status: number | null;
  code: SupabaseConnectorErrorCode | null;
  safeMessage: string | null;
  hint: string | null;
  host?: string | null;
  path?: string | null;
}> {
  const config = getSupabaseConnectorConfig();
  if (!config.configured) {
    return {
      attempted: false,
      ok: false,
      stage: null,
      status: null,
      code: "MISSING_SUPABASE_CONFIG",
      safeMessage: "Supabase backend URL and anon key are not configured.",
      hint: "Add SUPABASE_URL and SUPABASE_ANON_KEY in Railway api-server variables.",
    };
  }

  const attempts: Array<{ path: string; stage: SupabaseProbeStage; preferServiceRole?: boolean }> = [
    { path: "/rest/v1/", stage: "rest" },
    { path: "/auth/v1/settings", stage: "auth" },
    { path: "/storage/v1/bucket", stage: "storage", preferServiceRole: true },
  ];
  let firstError: SupabaseConnectorSectionError | null = null;

  for (const attempt of attempts) {
    try {
      const result = await safeSupabaseGet<unknown>(
        config,
        attempt.path,
        attempt.stage,
        attempt.preferServiceRole,
      );
      return {
        attempted: true,
        ok: true,
        stage: attempt.stage,
        status: result.status,
        code: null,
        safeMessage: null,
        hint: null,
        host: result.endpoint.host,
        path: result.endpoint.path,
      };
    } catch (error) {
      const sectionError = toSectionError(error, `Supabase ${attempt.stage} read-only probe failed.`, attempt.stage);
      firstError ??= sectionError;
      if (sectionError.code === "INVALID_SUPABASE_URL") break;
    }
  }

  return {
    attempted: true,
    ok: false,
    stage: firstError?.stage ?? "rest",
    status: firstError?.status ?? null,
    code: firstError?.code ?? "SUPABASE_READ_FAILED",
    safeMessage: firstError?.message ?? "Supabase read-only probe failed.",
    hint: firstError?.hint ?? null,
    host: firstError?.host ?? null,
    path: firstError?.path ?? null,
  };
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

  let project = okProbe(200);
  let rest: SupabaseProbeResult = skippedProbe("REST probe not attempted.");
  let auth: SupabaseProbeResult = skippedProbe("Auth settings probe not attempted.");
  let storage: SupabaseProbeResult = skippedProbe("Storage metadata probe not attempted.");
  let databaseMetadata: SupabaseProbeResult = skippedProbe("Database metadata is optional until SUPABASE_DB_URL is configured.");
  let rlsMetadata: SupabaseProbeResult = skippedProbe("RLS metadata requires database metadata readiness.");
  let bucketCount: number | null = null;
  let schemaCount: number | null = null;
  let tableCount: number | null = null;
  let rlsEnabledTables: number | null = null;
  let rlsMissingTables: number | null = null;
  let openApiDocument: OpenApiDocument | null = null;

  try {
    validateSupabaseEndpoint(config, "/", "project");
  } catch (error) {
    projectError = toSectionError(error, "Supabase project URL validation failed.", "project");
    project = failedProbe(projectError);
  }

  try {
    const result = await safeSupabaseGet<OpenApiDocument>(config, "/rest/v1/", "rest");
    openApiDocument = result.data;
    rest = okProbe(result.status);
  } catch (error) {
    restError = toSectionError(error, "Supabase REST metadata probe failed.", "rest");
    rest = failedProbe(restError);
  }

  try {
    const result = await safeSupabaseGet<unknown>(config, "/auth/v1/settings", "auth");
    auth = okProbe(result.status);
  } catch (error) {
    authError = toSectionError(error, "Supabase auth settings metadata probe failed.", "auth");
    auth = failedProbe(authError);
  }

  try {
    const result = await safeSupabaseGet<unknown[]>(config, "/storage/v1/bucket", "storage", true);
    bucketCount = Array.isArray(result.data) ? result.data.length : null;
    storage = okProbe(result.status);
  } catch (error) {
    storageError = toSectionError(error, "Supabase storage bucket metadata probe failed.", "storage");
    storage = failedProbe(storageError);
  }

  if (config.dbUrlPresent) {
    try {
      if (!openApiDocument) {
        const result = await safeSupabaseGet<OpenApiDocument>(config, "/rest/v1/", "database_metadata");
        openApiDocument = result.data;
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
        host: databaseMetadataError.host ?? null,
        path: databaseMetadataError.path ?? null,
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
