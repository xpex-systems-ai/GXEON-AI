import { type GitHubConnectorErrorCode, type GitHubReadonlyEvidence, type GitHubReadonlySnapshot, type GitHubReadonlyRawSnapshot } from "./githubConnectorTypes";
import { type GitHubReadonlyEvidence, type GitHubReadonlySnapshot, type GitHubReadonlyRawSnapshot } from "./githubConnectorTypes";

const allowedScopes = ["metadata:read", "contents:read", "pull_requests:read", "issues:read", "commit_statuses:read"];

function fallback(value: string | undefined | null, replacement = "unknown"): string {
  return value?.trim() || replacement;
}

function firstLine(message: string | undefined): string {
  return fallback(message, "Commit message unavailable").split("\n")[0] ?? "Commit message unavailable";
}

function sortEvidence(evidence: GitHubReadonlyEvidence[]): GitHubReadonlyEvidence[] {
  return evidence.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 12);
}

export function normalizeGitHubReadonlySnapshot(raw: GitHubReadonlyRawSnapshot): GitHubReadonlySnapshot {
  const owner = fallback(raw.repository.owner?.login, raw.repository.full_name.split("/")[0]);
  const defaultBranch = fallback(raw.repository.default_branch, "main");
  const repository = {
    id: String(raw.repository.id),
    name: raw.repository.name,
    owner,
    visibility: raw.repository.visibility ?? (raw.repository.private ? "private" : "public"),
    defaultBranch,
    status: "READONLY_CONNECTED" as const,
    authorizedScopes: allowedScopes,
    lastReadAt: raw.readAt,
  };

  const branches = raw.branches.map((branch) => ({
    name: branch.name,
    kind: branch.name === defaultBranch ? "MAIN" as const : "ACTIVE" as const,
    lastCommitSha: fallback(branch.commit?.sha, "unknown"),
    lastCommitAuthor: fallback(branch.commit?.commit?.author?.name),
    lastActivityAt: fallback(branch.commit?.commit?.author?.date, raw.readAt),
    protected: Boolean(branch.protected),
  }));

  const pullRequests = raw.pullRequests.map((pullRequest) => ({
    number: pullRequest.number,
    title: pullRequest.title,
    state: pullRequest.merged_at ? "MERGED" as const : pullRequest.state === "open" ? "OPEN" as const : "CLOSED" as const,
    sourceBranch: fallback(pullRequest.head?.ref),
    targetBranch: fallback(pullRequest.base?.ref, defaultBranch),
    author: fallback(pullRequest.user?.login),
    updatedAt: pullRequest.updated_at,
  }));

  const issues = raw.issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state === "open" ? "OPEN" as const : "CLOSED" as const,
    author: fallback(issue.user?.login),
    updatedAt: issue.updated_at,
  }));

  const commits = raw.commits.map((commit) => ({
    sha: commit.sha,
    message: firstLine(commit.commit?.message),
    author: fallback(commit.author?.login ?? commit.commit?.author?.name),
    branch: defaultBranch,
    committedAt: fallback(commit.commit?.author?.date, raw.readAt),
  }));

  const evidenceTimeline = sortEvidence([
    ...pullRequests.map((pullRequest) => ({
      id: `pr-${pullRequest.number}`,
      type: "PULL_REQUEST" as const,
      title: `PR #${pullRequest.number}: ${pullRequest.title}`,
      description: `${pullRequest.state} from ${pullRequest.sourceBranch} into ${pullRequest.targetBranch}`,
      occurredAt: pullRequest.updatedAt,
      source: "GitHub read-only pull request endpoint",
    })),
    ...issues.map((issue) => ({
      id: `issue-${issue.number}`,
      type: "ISSUE" as const,
      title: `Issue #${issue.number}: ${issue.title}`,
      description: `${issue.state} issue by ${issue.author}`,
      occurredAt: issue.updatedAt,
      source: "GitHub read-only issues endpoint",
    })),
    ...commits.map((commit) => ({
      id: `commit-${commit.sha}`,
      type: "COMMIT" as const,
      title: commit.message,
      description: `${commit.sha.slice(0, 7)} by ${commit.author} on ${commit.branch}`,
      occurredAt: commit.committedAt,
      source: "GitHub read-only commits endpoint",
    })),
  ]);

  return {
    status: "CONNECTED_READONLY",
    statusLabel: "CONNECTED_READONLY",
    configured: true,
    lastErrorCode: "NONE",
    repositoryCount: 1,
    openPrs: pullRequests.filter((pullRequest) => pullRequest.state === "OPEN").length,
    mergedPrs: pullRequests.filter((pullRequest) => pullRequest.state === "MERGED").length,
    openIssues: issues.filter((issue) => issue.state === "OPEN").length,
    recentCommits: commits.length,
    repositories: [repository],
    branches,
    pullRequests,
    issues,
    commits,
    evidenceTimeline,
    health: {
      connectorGateway: "READY",
      githubConnector: "CONNECTED_READONLY",
      nextActivation: "VERCEL_P2",
      systemState: "REAL_READONLY_CONNECTED",
      lastSyncAt: raw.readAt,
      lastErrorCode: "NONE",
      externalApiCalls: false,
      oauthEnabled: false,
      repositoryWriteAccess: false,
      databaseWrites: false,
      tokenStorageFrontend: false,
      secretExposure: false,
    },
  };
}

export function createGitHubReadonlyReadySnapshot(owner: string, repo: string, errorCode: GitHubConnectorErrorCode = "MISSING_TOKEN"): GitHubReadonlySnapshot {
export function createGitHubReadonlyReadySnapshot(owner: string, repo: string): GitHubReadonlySnapshot {
  return {
    status: "READY",
    statusLabel: "READY_FOR_READONLY_CONNECTION",
    configured: false,
    lastErrorCode: errorCode,
    repositoryCount: 0,
    openPrs: 0,
    mergedPrs: 0,
    openIssues: 0,
    recentCommits: 0,
    repositories: [],
    branches: [],
    pullRequests: [],
    issues: [],
    commits: [],
    evidenceTimeline: [
      {
        id: "gh-p2-backend-ready",
        type: "HEALTH",
        title: "GitHub P2 backend read-only connector ready",
        description: `${owner}/${repo} is waiting for backend-only runtime credentials.`,
        occurredAt: new Date().toISOString(),
        source: "GXEON_GITHUB_REAL_CONNECTION_P2_READONLY_BACKEND",
      },
    ],
    health: {
      connectorGateway: "READY",
      githubConnector: "READY_FOR_CONNECTION",
      nextActivation: "VERCEL_P2",
      systemState: "FIRST_REAL_CONNECTOR_PREPARED",
      lastSyncAt: null,
      lastErrorCode: errorCode,
      externalApiCalls: false,
      oauthEnabled: false,
      repositoryWriteAccess: false,
      databaseWrites: false,
      tokenStorageFrontend: false,
      secretExposure: false,
    },
  };
}

export function createGitHubReadonlyFailedSnapshot(owner: string, repo: string, reason: string, errorCode: GitHubConnectorErrorCode = "GITHUB_READ_FAILED"): GitHubReadonlySnapshot {
export function createGitHubReadonlyFailedSnapshot(owner: string, repo: string, reason: string): GitHubReadonlySnapshot {
  return {
    ...createGitHubReadonlyReadySnapshot(owner, repo),
    status: "FAILED",
    statusLabel: "FAILED",
    configured: true,
    lastErrorCode: errorCode,
    evidenceTimeline: [
      {
        id: "gh-p2-read-failed",
        type: "HEALTH",
        title: "GitHub read-only connector failed closed",
        description: reason,
        occurredAt: new Date().toISOString(),
        source: "GXEON_GITHUB_REAL_CONNECTION_P2_READONLY_BACKEND",
      },
    ],
    health: {
      ...createGitHubReadonlyReadySnapshot(owner, repo).health,
      githubConnector: "FAILED",
      systemState: "GITHUB_READ_FAILED",
      lastErrorCode: errorCode,
    },
  };
}
