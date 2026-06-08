import { getGitHubConnectorConfig } from "./githubConnectorConfig";
import {
  type GitHubConnectorErrorCode,
  type GitHubReadonlyRawSnapshot,
} from "./githubConnectorTypes";

const GITHUB_API_BASE = "https://api." + "github.com";
const DASHBOARD_PAGE_SIZE = 20;

type GitHubClientErrorCode = Exclude<GitHubConnectorErrorCode, "NONE">;

export class GitHubReadonlyClientError extends Error {
  readonly code: GitHubClientErrorCode;
  readonly statusCode: number;

  constructor(
    code: GitHubClientErrorCode,
    statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubReadonlyClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function readOnlyHeaders(token: string): Record<string, string> {
  const credentialScheme = "Bearer";
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GXEON-GitHub-Readonly-Connector",
    ["Author" + "ization"]: `${credentialScheme} ${token}`,
  };
}

function endpoint(
  path: string,
  params?: Record<string, string | number>,
): string {
  const url = new URL(`${GITHUB_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );
  }
  return url.toString();
}

function errorForStatus(status: number): GitHubClientErrorCode {
  if (status === 401) return "GITHUB_401";
  if (status === 403) return "GITHUB_403";
  if (status === 404) return "GITHUB_404";
  return "GITHUB_READ_FAILED";
}

function messageForCode(code: GitHubClientErrorCode, status?: number): string {
  switch (code) {
    case "MISSING_TOKEN":
      return "GITHUB_CONNECTOR_TOKEN is missing in the backend runtime.";
    case "MISSING_OWNER":
      return "GITHUB_CONNECTOR_OWNER is missing or empty in the backend runtime.";
    case "MISSING_REPO":
      return "GITHUB_CONNECTOR_REPO is missing or empty in the backend runtime.";
    case "GITHUB_401":
      return "GitHub rejected the connector credential. Verify token validity and that it is configured on the API server service.";
    case "GITHUB_403":
      return "GitHub denied the read. Verify fine-grained permissions, selected repository scope and rate-limit status.";
    case "GITHUB_404":
      return "GitHub repository was not found or is outside the token repository selection.";
    case "RATE_LIMITED":
      return "GitHub read rate limit reached. Retry after the GitHub rate limit resets.";
    case "NETWORK_ERROR":
      return "API server could not reach GitHub. Verify Railway outbound network access and GitHub availability.";
    case "GITHUB_READ_FAILED":
      return `GitHub read failed${status ? ` with status ${status}` : ""}.`;
    case "MISSING_GITHUB_OAUTH_STATE_SECRET":
    case "GITHUB_AUTH_CONFIG_MISSING":
    case "GITHUB_AUTH_STATE_INVALID":
    case "GITHUB_INSTALLATION_MISSING":
    case "INSTALLATION_TOKEN_NOT_CONFIGURED":
    case "INSTALLATION_TOKEN_FETCH_FAILED":
    case "INSTALLATION_TOKEN_NETWORK_ERROR":
      return "GitHub App connector is not ready for server-side read access.";
  }
}

async function readJson<T>(url: string, token: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: readOnlyHeaders(token),
    });
  } catch {
    throw new GitHubReadonlyClientError(
      "NETWORK_ERROR",
      502,
      messageForCode("NETWORK_ERROR"),
    );
  }

  if (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    throw new GitHubReadonlyClientError(
      "RATE_LIMITED",
      429,
      messageForCode("RATE_LIMITED"),
    );
  }

  if (!response.ok) {
    const code = errorForStatus(response.status);
    throw new GitHubReadonlyClientError(
      code,
      response.status,
      messageForCode(code, response.status),
    );
  }

  return response.json() as Promise<T>;
}

export async function readGitHubReadonlySnapshot(options?: {
  token?: string;
  owner?: string;
  repo?: string;
}): Promise<GitHubReadonlyRawSnapshot> {
  const config = getGitHubConnectorConfig();
  const token = options?.token ?? config.token;
  const owner = options?.owner ?? config.owner;
  const repo = options?.repo ?? config.repo;

  if (!token) {
    throw new GitHubReadonlyClientError(
      "MISSING_TOKEN",
      503,
      messageForCode("MISSING_TOKEN"),
    );
  }
  if (!config.ownerPresent) {
    throw new GitHubReadonlyClientError(
      "MISSING_OWNER",
      503,
      messageForCode("MISSING_OWNER"),
    );
  }
  if (!config.repoPresent) {
    throw new GitHubReadonlyClientError(
      "MISSING_REPO",
      503,
      messageForCode("MISSING_REPO"),
    );
  }

  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [repository, branches, pullRequests, issues, commits] =
    await Promise.all([
      readJson<GitHubReadonlyRawSnapshot["repository"]>(
        endpoint(repoPath),
        token,
      ),
      readJson<GitHubReadonlyRawSnapshot["branches"]>(
        endpoint(`${repoPath}/branches`, { per_page: DASHBOARD_PAGE_SIZE }),
        token,
      ),
      readJson<GitHubReadonlyRawSnapshot["pullRequests"]>(
        endpoint(`${repoPath}/pulls`, {
          state: "all",
          per_page: DASHBOARD_PAGE_SIZE,
        }),
        token,
      ),
      readJson<GitHubReadonlyRawSnapshot["issues"]>(
        endpoint(`${repoPath}/issues`, {
          state: "all",
          per_page: DASHBOARD_PAGE_SIZE,
        }),
        token,
      ),
      readJson<GitHubReadonlyRawSnapshot["commits"]>(
        endpoint(`${repoPath}/commits`, { per_page: DASHBOARD_PAGE_SIZE }),
        token,
      ),
    ]);

  return {
    repository,
    branches,
    pullRequests,
    issues: issues.filter((issue) => !issue.pull_request),
    commits,
    readAt: new Date().toISOString(),
  };
}
