import { getGitHubConnectorConfig } from "../connectors/github/githubConnectorConfig";
import {
  GITHUB_OPPORTUNITY_MAX_CANDIDATES,
  githubOpportunityRuntimeBoundaries,
  type GitHubOpportunityCandidate,
  type GitHubOpportunityPreview,
  type GitHubOpportunitySearchQuery,
  type ScoredGitHubOpportunityCandidate,
} from "./githubOpportunityTypes";
import { inferGitHubOpportunityCategory, scoreGitHubOpportunity } from "./githubOpportunityScoring";

const GITHUB_API_BASE = "https://api." + "github.com";
const DEFAULT_UNAUTHENTICATED_LIMIT = 5;
const USER_AGENT = "GXEON-RadarX-GitHub-Opportunity-Preview";

export type GitHubOpportunityClientErrorCode = "GITHUB_401" | "GITHUB_403" | "GITHUB_422" | "GITHUB_429" | "RATE_LIMITED" | "GITHUB_5XX" | "NETWORK_ERROR" | "GITHUB_SEARCH_FAILED" | "INVALID_QUERY";

export class GitHubOpportunityClientError extends Error {
  readonly code: GitHubOpportunityClientErrorCode;
  readonly statusCode: number;

  constructor(code: GitHubOpportunityClientErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = "GitHubOpportunityClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

type GitHubSearchIssueItem = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  url: string;
  repository_url: string;
  state?: string;
  labels?: Array<string | { name?: string | null }>;
  created_at?: string | null;
  updated_at?: string | null;
  body?: string | null;
  pull_request?: unknown;
};

type GitHubSearchIssuesResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchIssueItem[];
};

type GitHubRepositoryResponse = {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  open_issues_count?: number;
  pushed_at?: string | null;
  updated_at?: string | null;
  language?: string | null;
};

function backendToken(): string | null {
  return process.env["GITHUB_TOKEN"]?.trim() || process.env["GITHUB_READONLY_TOKEN"]?.trim() || getGitHubConnectorConfig().token || null;
}

function normalizeLimit(value: unknown, authenticated: boolean): number {
  const requested = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : authenticated ? GITHUB_OPPORTUNITY_MAX_CANDIDATES : DEFAULT_UNAUTHENTICATED_LIMIT;
  const ceiling = authenticated ? GITHUB_OPPORTUNITY_MAX_CANDIDATES : DEFAULT_UNAUTHENTICATED_LIMIT;
  return Math.max(1, Math.min(ceiling, requested, GITHUB_OPPORTUNITY_MAX_CANDIDATES));
}

function cleanText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function safeUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "github.com" || url.hostname === "api.github.com") ? url.toString() : "";
  } catch {
    return "";
  }
}

function endpoint(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${GITHUB_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}

function headers(token: string | null): Record<string, string> {
  const base: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };
  if (token) base["Author" + "ization"] = `Bearer ${token}`;
  return base;
}

function errorForResponse(response: Response): GitHubOpportunityClientError {
  if (response.status === 401) return new GitHubOpportunityClientError("GITHUB_401", 401, "GitHub rejected the backend read credential.");
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return new GitHubOpportunityClientError("RATE_LIMITED", 429, "GitHub public search rate limit reached. Retry after reset or configure a backend read token.");
  if (response.status === 403) return new GitHubOpportunityClientError("GITHUB_403", 403, "GitHub denied the read-only search request.");
  if (response.status === 422) return new GitHubOpportunityClientError("GITHUB_422", 422, "GitHub search query was invalid or too broad for preview.");
  if (response.status === 429) return new GitHubOpportunityClientError("GITHUB_429", 429, "GitHub throttled the preview search request.");
  if (response.status >= 500) return new GitHubOpportunityClientError("GITHUB_5XX", 502, "GitHub search is temporarily unavailable.");
  return new GitHubOpportunityClientError("GITHUB_SEARCH_FAILED", response.status, `GitHub read-only search failed with status ${response.status}.`);
}

async function readJson<T>(url: string, token: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers: headers(token) });
  } catch {
    throw new GitHubOpportunityClientError("NETWORK_ERROR", 502, "API server could not reach GitHub REST API.");
  }
  if (!response.ok) throw errorForResponse(response);
  return response.json() as Promise<T>;
}

function repositoryFullName(repositoryUrl: string): string | null {
  const safe = safeUrl(repositoryUrl);
  if (!safe) return null;
  const marker = "/repos/";
  const index = safe.indexOf(marker);
  if (index < 0) return null;
  return safe.slice(index + marker.length).split(/[?#]/)[0] || null;
}

async function readRepository(repositoryUrl: string, token: string | null): Promise<GitHubRepositoryResponse> {
  const fullName = repositoryFullName(repositoryUrl);
  if (!fullName) return {};
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) return {};
  return readJson<GitHubRepositoryResponse>(endpoint(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`), token);
}

function fallbackRepository(repositoryUrl: string): GitHubRepositoryResponse {
  const fullName = repositoryFullName(repositoryUrl);
  return {
    full_name: fullName ?? "unknown/unknown",
    html_url: fullName ? `https://github.com/${fullName}` : undefined,
    description: null,
    stargazers_count: 0,
    open_issues_count: 0,
    pushed_at: null,
    updated_at: null,
    language: null,
  };
}

async function readRepositoryBestEffort(repositoryUrl: string, token: string | null): Promise<{ repository: GitHubRepositoryResponse; metadataFailed: boolean }> {
  try {
    return { repository: await readRepository(repositoryUrl, token), metadataFailed: false };
  } catch (error) {
    if (error instanceof GitHubOpportunityClientError) {
      return { repository: fallbackRepository(repositoryUrl), metadataFailed: true };
    }
    throw error;
  }
}

function labelsFor(item: GitHubSearchIssueItem): string[] {
  return (item.labels ?? []).map((label) => cleanText(typeof label === "string" ? label : label.name, 80)).filter(Boolean).slice(0, 12);
}

function candidateFromIssue(item: GitHubSearchIssueItem, repository: GitHubRepositoryResponse, requestedCategory?: string): GitHubOpportunityCandidate | null {
  if (item.pull_request) return null;
  const title = cleanText(item.title, 220);
  const url = safeUrl(item.html_url);
  const apiUrl = safeUrl(item.url);
  const repositoryUrl = safeUrl(repository.html_url) || safeUrl(item.repository_url).replace("api.github.com/repos", "github.com");
  const fullName = cleanText(repository.full_name ?? repositoryFullName(item.repository_url) ?? "unknown/unknown", 160);
  if (!title || !url || !apiUrl || !fullName) return null;
  const labels = labelsFor(item);
  const bodyExcerpt = cleanText(item.body, 700) || null;

  return {
    id: `github-issue-${item.id}`,
    source: "github_public_issue",
    category: inferGitHubOpportunityCategory({ title, body: bodyExcerpt, labels, repository: fullName, requestedCategory }),
    title,
    url,
    apiUrl,
    state: item.state === "open" || item.state === "closed" ? item.state : "unknown",
    labels,
    createdAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
    bodyExcerpt,
    repository: {
      fullName,
      url: repositoryUrl,
      description: cleanText(repository.description, 300) || null,
      stargazersCount: Math.max(0, repository.stargazers_count ?? 0),
      openIssuesCount: Math.max(0, repository.open_issues_count ?? 0),
      pushedAt: repository.pushed_at ?? null,
      updatedAt: repository.updated_at ?? null,
      language: cleanText(repository.language, 80) || null,
    },
    runtime: githubOpportunityRuntimeBoundaries,
  };
}

export function getGitHubOpportunityStatus() {
  return {
    status: "GITHUB_OPPORTUNITY_PREVIEW_READY" as const,
    ...githubOpportunityRuntimeBoundaries,
    externalContact: false as const,
    maxCandidates: GITHUB_OPPORTUNITY_MAX_CANDIDATES,
    safeSources: ["GitHub public issues", "GitHub public labels", "GitHub public repository metadata"],
    authenticated: Boolean(backendToken()),
  };
}

export async function searchGitHubOpportunityPreview(input: GitHubOpportunitySearchQuery): Promise<GitHubOpportunityPreview> {
  const query = cleanText(input.query, 220);
  if (!query || query.length < 3) throw new GitHubOpportunityClientError("INVALID_QUERY", 400, "A non-empty GitHub public search query is required.");

  const token = backendToken();
  const limit = normalizeLimit(input.limit, Boolean(token));
  const normalizedQuery = `${query} type:issue state:open archived:false`;
  const search = await readJson<GitHubSearchIssuesResponse>(endpoint("/search/issues", { q: normalizedQuery, sort: "updated", order: "desc", per_page: limit }), token);
  const candidates: ScoredGitHubOpportunityCandidate[] = [];
  let skippedPullRequests = 0;
  let skippedInvalidCandidates = 0;
  let repositoryMetadataFailures = 0;

  for (const item of search.items.slice(0, limit)) {
    if (item.pull_request) {
      skippedPullRequests += 1;
      continue;
    }
    const { repository, metadataFailed } = await readRepositoryBestEffort(item.repository_url, token);
    if (metadataFailed) repositoryMetadataFailures += 1;
    const candidate = candidateFromIssue(item, repository, input.category);
    if (candidate) candidates.push({ ...candidate, opportunityScore: scoreGitHubOpportunity(candidate) });
    else skippedInvalidCandidates += 1;
  const q = `${query} type:issue state:open archived:false`;
  const search = await readJson<GitHubSearchIssuesResponse>(endpoint("/search/issues", { q, sort: "updated", order: "desc", per_page: limit }), token);
  const candidates: ScoredGitHubOpportunityCandidate[] = [];

  for (const item of search.items.slice(0, limit)) {
    const repository = await readRepository(item.repository_url, token);
    const candidate = candidateFromIssue(item, repository, input.category);
    if (candidate) candidates.push({ ...candidate, opportunityScore: scoreGitHubOpportunity(candidate) });
    if (candidates.length >= GITHUB_OPPORTUNITY_MAX_CANDIDATES) break;
  }

  return {
    status: "GITHUB_OPPORTUNITY_PREVIEW_READY",
    ...githubOpportunityRuntimeBoundaries,
    query,
    normalizedQuery,
    category: input.category && input.category.trim() ? inferGitHubOpportunityCategory({ requestedCategory: input.category }) : null,
    maxCandidates: GITHUB_OPPORTUNITY_MAX_CANDIDATES,
    effectiveLimit: limit,
    authenticated: Boolean(token),
    diagnostics: {
      provider: "github_rest_api",
      searchEndpoint: "/search/issues",
      repositoryMetadataMode: "best_effort_public_rest_api",
      skippedPullRequests,
      skippedInvalidCandidates,
      repositoryMetadataFailures,
    },
    category: input.category && input.category.trim() ? inferGitHubOpportunityCategory({ requestedCategory: input.category }) : null,
    maxCandidates: GITHUB_OPPORTUNITY_MAX_CANDIDATES,
    candidates,
  };
}
