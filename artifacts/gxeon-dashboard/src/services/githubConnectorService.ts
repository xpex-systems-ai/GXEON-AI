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

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

function backendUnavailableSnapshot(): GitHubReadonlySnapshot {
  return {
    ...githubReadonlySnapshot,
    status: "READY",
    statusLabel: "READY_BACKEND_UNAVAILABLE",
    lastErrorCode: "BACKEND_UNAVAILABLE",
    health: {
      ...githubReadonlySnapshot.health,
      githubConnector: "READY_FOR_CONNECTION",
      lastSyncAt: null,
      lastErrorCode: "BACKEND_UNAVAILABLE",
    },
  };
}

export type GitHubConnectUrlResponse = {
  url: string;
  provider: "github";
  mode: "github_app_installation" | "oauth_app_authorization";
  stateIssuedAt: string;
};

export async function fetchGitHubConnectUrl(
  signal?: AbortSignal,
): Promise<GitHubConnectUrlResponse> {
  const response = await fetch(apiUrl("/api/connectors/github/connect-url"), {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
    },
  });
  const payload = (await response.json()) as GitHubConnectUrlResponse & {
    missing?: string[];
    status?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.missing?.[0] ?? payload.status ?? "GITHUB_CONNECT_URL_FAILED",
    );
  }

  return payload;
}

export async function fetchGitHubConnectorSnapshot(
  signal?: AbortSignal,
): Promise<GitHubReadonlySnapshot> {
  try {
    const response = await fetch(apiUrl("/api/connectors/github/snapshot"), {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json()) as GitHubReadonlySnapshot;
    if (!response.ok) {
      return {
        ...githubReadonlySnapshot,
        ...payload,
        status: payload.status ?? "FAILED",
        statusLabel: payload.statusLabel ?? "FAILED",
        lastErrorCode:
          payload.lastErrorCode ??
          payload.health?.lastErrorCode ??
          "GITHUB_READ_FAILED",
      };
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return backendUnavailableSnapshot();
  }
}

export async function fetchGitHubConnectorDiagnostics(
  signal?: AbortSignal,
): Promise<GitHubConnectorDiagnostics | null> {
  try {
    const response = await fetch(apiUrl("/api/connectors/github/diagnostics"), {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;
    return response.json() as Promise<GitHubConnectorDiagnostics>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}
