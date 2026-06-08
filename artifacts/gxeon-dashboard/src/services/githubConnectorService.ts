import {
  githubReadonlySnapshot,
  type GitHubConnectorDiagnostics,
  type GitHubConnectorErrorCode,
  type GitHubReadonlySnapshot,
} from "@/data/github-readonly-connector";

export type GitHubConnectorApiBaseMode = "same-origin" | "configured-backend-url";
import { githubReadonlySnapshot, type GitHubReadonlySnapshot } from "@/data/github-readonly-connector";

export type GitHubConnectorServiceState = {
  loading: boolean;
  error: string | null;
  backendReachability: "ONLINE" | "UNREACHABLE";
  apiBaseMode: GitHubConnectorApiBaseMode;
  lastErrorCode: GitHubConnectorErrorCode;
  data: GitHubReadonlySnapshot;
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

export const githubConnectorApiBaseMode: GitHubConnectorApiBaseMode = configuredApiBaseUrl ? "configured-backend-url" : "same-origin";

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

export async function fetchGitHubConnectorSnapshot(signal?: AbortSignal): Promise<GitHubReadonlySnapshot> {
  try {
    const response = await fetch(apiUrl("/api/connectors/github/snapshot"), {
  data: GitHubReadonlySnapshot;
};

export async function fetchGitHubConnectorSnapshot(signal?: AbortSignal): Promise<GitHubReadonlySnapshot> {
  try {
    const response = await fetch("/api/connectors/github/snapshot", {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json() as GitHubReadonlySnapshot;
    if (!response.ok) {
      return {
        ...githubReadonlySnapshot,
        ...payload,
        status: payload.status ?? "FAILED",
        statusLabel: payload.statusLabel ?? "FAILED",
        lastErrorCode: payload.lastErrorCode ?? payload.health?.lastErrorCode ?? "GITHUB_READ_FAILED",
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

export async function fetchGitHubConnectorDiagnostics(signal?: AbortSignal): Promise<GitHubConnectorDiagnostics | null> {
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
    return {
      ...githubReadonlySnapshot,
      status: "READY",
      statusLabel: "READY_BACKEND_UNAVAILABLE",
      health: {
        ...githubReadonlySnapshot.health,
        githubConnector: "READY_FOR_CONNECTION",
        lastSyncAt: null,
      },
    };
  }
}
