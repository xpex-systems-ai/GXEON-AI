import { getGitHubConnectorConfig } from "./githubConnectorConfig";
import { type GitHubReadonlyRawSnapshot } from "./githubConnectorTypes";

const GITHUB_API_BASE = "https://api.github.com";
const DASHBOARD_PAGE_SIZE = 20;

type GitHubClientErrorCode = "NOT_CONFIGURED" | "RATE_LIMITED" | "GITHUB_READ_FAILED";

export class GitHubReadonlyClientError extends Error {
  readonly code: GitHubClientErrorCode;
  readonly statusCode: number;

  constructor(code: GitHubClientErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = "GitHubReadonlyClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function readOnlyHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GXEON-GitHub-Readonly-Connector",
    Authorization: `Bearer ${token}`,
  };
}

function endpoint(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${GITHUB_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  }
  return url.toString();
}

async function readJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { method: "GET", headers: readOnlyHeaders(token) });

  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    throw new GitHubReadonlyClientError("RATE_LIMITED", 429, "GitHub read rate limit reached.");
  }

  if (!response.ok) {
    throw new GitHubReadonlyClientError("GITHUB_READ_FAILED", response.status, `GitHub read failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function readGitHubReadonlySnapshot(): Promise<GitHubReadonlyRawSnapshot> {
  const config = getGitHubConnectorConfig();

  if (!config.isConfigured || !config.token) {
    throw new GitHubReadonlyClientError("NOT_CONFIGURED", 503, "GitHub connector token is not configured in backend runtime.");
  }

  const repoPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  const [repository, branches, pullRequests, issues, commits] = await Promise.all([
    readJson<GitHubReadonlyRawSnapshot["repository"]>(endpoint(repoPath), config.token),
    readJson<GitHubReadonlyRawSnapshot["branches"]>(endpoint(`${repoPath}/branches`, { per_page: DASHBOARD_PAGE_SIZE }), config.token),
    readJson<GitHubReadonlyRawSnapshot["pullRequests"]>(endpoint(`${repoPath}/pulls`, { state: "all", per_page: DASHBOARD_PAGE_SIZE }), config.token),
    readJson<GitHubReadonlyRawSnapshot["issues"]>(endpoint(`${repoPath}/issues`, { state: "all", per_page: DASHBOARD_PAGE_SIZE }), config.token),
    readJson<GitHubReadonlyRawSnapshot["commits"]>(endpoint(`${repoPath}/commits`, { per_page: DASHBOARD_PAGE_SIZE }), config.token),
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
