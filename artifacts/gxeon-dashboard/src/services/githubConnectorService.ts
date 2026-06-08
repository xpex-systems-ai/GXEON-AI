import {
  githubReadonlySnapshot,
  type GitHubConnectorDiagnostics,
  type GitHubConnectorErrorCode,
  type GitHubReadonlySnapshot,
} from "@/data/github-readonly-connector";

export type GitHubConnectorApiBaseMode =
  | "same-origin"
  | "configured-backend-url";

export type GitHubConnectorServiceState = {
  loading: boolean;
  error: string | null;
  backendReachability: "ONLINE" | "UNREACHABLE";
  apiBaseMode: GitHubConnectorApiBaseMode;
  lastErrorCode: GitHubConnectorErrorCode;
  data: GitHubReadonlySnapshot;
};

const configuredApiBaseUrl =
  (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, "") ?? "";

export const githubConnectorApiBaseMode: GitHubConnectorApiBaseMode =
  configuredApiBaseUrl ? "configured-backend-url" : "same-origin";

export const githubConnectorApiBaseDisplay =
  configuredApiBaseUrl || "same-origin dashboard host";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

export type SafeJsonFetchError = {
  code: GitHubConnectorErrorCode | "CONFIG_MISSING";
  message: string;
  calledUrl: string;
  apiBaseMode: GitHubConnectorApiBaseMode;
  status: number | null;
  contentType: string | null;
  missing?: string[];
};

export class GitHubConnectorFetchError extends Error {
  details: SafeJsonFetchError;

  constructor(details: SafeJsonFetchError) {
    super(details.message);
    this.name = "GitHubConnectorFetchError";
    this.details = details;
  }
}

function safeErrorMessage(code: SafeJsonFetchError["code"]): string {
  if (code === "BACKEND_URL_MISCONFIGURED") {
    return "Set VITE_GXEON_API_BASE_URL to Railway API public URL and redeploy Vercel";
  }
  if (code === "BACKEND_RETURNED_HTML") {
    return "Backend returned HTML instead of JSON.";
  }
  if (code === "BACKEND_UNAVAILABLE") {
    return "Backend API is unreachable from this dashboard runtime.";
  }
  return code;
}

async function safeJsonFetch<T>(
  path: string,
  signal?: AbortSignal,
): Promise<{ payload: T; contentType: string | null; calledUrl: string }> {
  const calledUrl = apiUrl(path);
  let response: Response;

  try {
    response = await fetch(calledUrl, {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new GitHubConnectorFetchError({
      code: "BACKEND_UNAVAILABLE",
      message: safeErrorMessage("BACKEND_UNAVAILABLE"),
      calledUrl,
      apiBaseMode: githubConnectorApiBaseMode,
      status: null,
      contentType: null,
    });
  }

  const contentType = response.headers.get("content-type");
  const bodyText = await response.text();
  const trimmedBody = bodyText.trimStart();
  const isHtml =
    contentType?.toLowerCase().includes("text/html") ||
    trimmedBody.toLowerCase().startsWith("<!doctype") ||
    trimmedBody.toLowerCase().startsWith("<html");

  if (isHtml) {
    throw new GitHubConnectorFetchError({
      code: "BACKEND_URL_MISCONFIGURED",
      message: safeErrorMessage("BACKEND_URL_MISCONFIGURED"),
      calledUrl,
      apiBaseMode: githubConnectorApiBaseMode,
      status: response.status,
      contentType,
    });
  }

  let payload: T & {
    status?: string;
    missing?: string[];
    lastErrorCode?: GitHubConnectorErrorCode;
    health?: { lastErrorCode?: GitHubConnectorErrorCode };
  };
  try {
    payload = (bodyText ? JSON.parse(bodyText) : {}) as T & {
      status?: string;
      missing?: string[];
      lastErrorCode?: GitHubConnectorErrorCode;
      health?: { lastErrorCode?: GitHubConnectorErrorCode };
    };
  } catch {
    throw new GitHubConnectorFetchError({
      code: "BACKEND_RETURNED_HTML",
      message: safeErrorMessage("BACKEND_RETURNED_HTML"),
      calledUrl,
      apiBaseMode: githubConnectorApiBaseMode,
      status: response.status,
      contentType,
    });
  }

  if (!response.ok) {
    const rawCode =
      payload.lastErrorCode ?? payload.health?.lastErrorCode ?? payload.status;
    const code = (rawCode ||
      "GITHUB_READ_FAILED") as SafeJsonFetchError["code"];
    throw new GitHubConnectorFetchError({
      code,
      message: safeErrorMessage(code),
      calledUrl,
      apiBaseMode: githubConnectorApiBaseMode,
      status: response.status,
      contentType,
      missing: payload.missing,
    });
  }

  return { payload, contentType, calledUrl };
}

function backendUnavailableSnapshot(
  errorCode: GitHubConnectorErrorCode = "BACKEND_UNAVAILABLE",
): GitHubReadonlySnapshot {
  return {
    ...githubReadonlySnapshot,
    status: "READY",
    statusLabel:
      errorCode === "BACKEND_URL_MISCONFIGURED"
        ? "BACKEND_URL_MISCONFIGURED"
        : "READY_BACKEND_UNAVAILABLE",
    lastErrorCode: errorCode,
    health: {
      ...githubReadonlySnapshot.health,
      githubConnector: "READY_FOR_CONNECTION",
      lastSyncAt: null,
      lastErrorCode: errorCode,
    },
  };
}

export type GitHubConnectUrlResponse = {
  url: string;
  provider: "github";
  mode: "github_app_installation" | "oauth_app_authorization";
  stateIssuedAt: string;
};

export type GitHubFinalReadinessResponse = {
  provider: "github";
  status: "READY" | "READY_TO_DISCOVER_INSTALLATION" | "CONFIG_MISSING";
  apiRuntime: { online: boolean; routeStatus: "ONLINE" };
  connectionMode: "github_app_installation" | "backend_token" | "not_connected";
  missing: string[];
  callbackUrl: string | null;
  dashboardUrlPresent: boolean;
  apiPublicUrlPresent: boolean;
  auth: GitHubConnectorDiagnostics["auth"];
  connector: GitHubConnectorDiagnostics;
  connection: GitHubConnectorDiagnostics["connection"];
  canAutodiscoverInstallations?: boolean;
  installationStatePresent?: boolean;
  installationStateSource?: "memory" | "env" | "autodiscovered" | "none";
  selectedRepoReady?: boolean;
  nextStep?: string;
  timestamp: string;
};

export async function fetchGitHubConnectUrl(
  signal?: AbortSignal,
): Promise<GitHubConnectUrlResponse> {
  const { payload } = await safeJsonFetch<GitHubConnectUrlResponse>(
    "/api/connectors/github/connect-url",
    signal,
  );
  return payload;
}

export async function fetchGitHubConnectorSnapshot(
  signal?: AbortSignal,
): Promise<GitHubReadonlySnapshot> {
  try {
    const { payload } = await safeJsonFetch<GitHubReadonlySnapshot>(
      "/api/connectors/github/snapshot",
      signal,
    );
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof GitHubConnectorFetchError) {
      return backendUnavailableSnapshot(
        error.details.code === "CONFIG_MISSING"
          ? "GITHUB_AUTH_CONFIG_MISSING"
          : (error.details.code as GitHubConnectorErrorCode),
      );
    }
    return backendUnavailableSnapshot();
  }
}

export async function fetchGitHubConnectorDiagnostics(
  signal?: AbortSignal,
): Promise<GitHubConnectorDiagnostics | null> {
  try {
    const { payload } = await safeJsonFetch<GitHubConnectorDiagnostics>(
      "/api/connectors/github/diagnostics",
      signal,
    );
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}

export async function fetchGitHubFinalReadiness(
  signal?: AbortSignal,
): Promise<GitHubFinalReadinessResponse | null> {
  try {
    const { payload } = await safeJsonFetch<GitHubFinalReadinessResponse>(
      "/api/connectors/github/final-readiness",
      signal,
    );
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}

export type GitHubConnectorActivityEvent = {
  timestamp: string;
  eventType: string;
  status: "success" | "failed" | "info";
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export async function fetchGitHubConnectorActivity(
  signal?: AbortSignal,
): Promise<GitHubConnectorActivityEvent[]> {
  try {
    const { payload } = await safeJsonFetch<{
      provider: "github";
      events?: GitHubConnectorActivityEvent[];
    }>("/api/connectors/github/activity", signal);
    return payload.events ?? [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return [];
  }
}
