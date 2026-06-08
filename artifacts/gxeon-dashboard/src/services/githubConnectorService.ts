import { githubReadonlySnapshot, type GitHubReadonlySnapshot } from "@/data/github-readonly-connector";

export type GitHubConnectorServiceState = {
  loading: boolean;
  error: string | null;
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
      };
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

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
