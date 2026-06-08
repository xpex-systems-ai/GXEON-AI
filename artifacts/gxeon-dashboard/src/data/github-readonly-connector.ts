export type GitHubConnectorStatus = "CONNECTING" | "CONNECTED_READONLY" | "FAILED" | "DISCONNECTED";

export type GitHubRepositoryStatus = "READY_FOR_READONLY_CONNECTION" | "WAITING_FOR_AUTHORIZATION" | "READONLY_CONNECTED";

export type GitHubBranchKind = "MAIN" | "ACTIVE";

export type GitHubPullRequestState = "OPEN" | "CLOSED" | "MERGED";

export type GitHubIssueState = "OPEN" | "CLOSED";

export type GitHubEvidenceType = "COMMIT" | "PULL_REQUEST" | "ISSUE" | "BRANCH" | "HEALTH";

export type GitHubReadonlyRepository = {
  id: string;
  name: string;
  owner: string;
  visibility: "private" | "internal" | "public";
  defaultBranch: string;
  status: GitHubRepositoryStatus;
  authorizedScopes: string[];
  lastReadAt: string | null;
};

export type GitHubReadonlyBranch = {
  name: string;
  kind: GitHubBranchKind;
  lastCommitSha: string;
  lastCommitAuthor: string;
  lastActivityAt: string;
  protected: boolean;
};

export type GitHubReadonlyPullRequest = {
  number: number;
  title: string;
  state: GitHubPullRequestState;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  updatedAt: string;
};

export type GitHubReadonlyIssue = {
  number: number;
  title: string;
  state: GitHubIssueState;
  author: string;
  updatedAt: string;
};

export type GitHubReadonlyCommit = {
  sha: string;
  message: string;
  author: string;
  branch: string;
  committedAt: string;
};

export type GitHubReadonlyEvidence = {
  id: string;
  type: GitHubEvidenceType;
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type GitHubReadonlyHealth = {
  connectorGateway: "READY";
  githubConnector: "READY_FOR_CONNECTION";
  nextActivation: "VERCEL_P2";
  systemState: "FIRST_REAL_CONNECTOR_PREPARED";
  lastSyncAt: string | null;
  externalApiCalls: false;
  oauthEnabled: false;
  repositoryWriteAccess: false;
  databaseWrites: false;
  tokenStorageFrontend: false;
  secretExposure: false;
};

export type GitHubReadonlySnapshot = {
  status: GitHubConnectorStatus;
  statusLabel: string;
  repositoryCount: number;
  openPrs: number;
  mergedPrs: number;
  openIssues: number;
  recentCommits: number;
  repositories: GitHubReadonlyRepository[];
  branches: GitHubReadonlyBranch[];
  pullRequests: GitHubReadonlyPullRequest[];
  issues: GitHubReadonlyIssue[];
  commits: GitHubReadonlyCommit[];
  evidenceTimeline: GitHubReadonlyEvidence[];
  health: GitHubReadonlyHealth;
};

export const githubReadonlyAllowedActions = [
  "read_repository_metadata",
  "read_branches",
  "read_pull_requests",
  "read_issues",
  "read_commits",
  "read_repository_status",
] as const;

export const githubReadonlyForbiddenActions = [
  "create_issue",
  "create_pr",
  "merge_pr",
  "delete_branch",
  "push_commit",
  "write_repository",
  "modify_settings",
  "store_tokens_frontend",
] as const;

export const githubReadonlyStatusFlow: GitHubConnectorStatus[] = ["DISCONNECTED", "CONNECTING", "CONNECTED_READONLY", "FAILED"];

export const githubReadonlySnapshot: GitHubReadonlySnapshot = {
  status: "DISCONNECTED",
  statusLabel: "READY_FOR_READONLY_CONNECTION",
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
      id: "gh-p1-prepared",
      type: "HEALTH",
      title: "GitHub P1 read-only gateway prepared",
      description: "UI, status model, discovery placeholders and safety boundary are ready without OAuth, tokens, writes or API calls.",
      occurredAt: "2026-06-08T00:00:00.000Z",
      source: "GXEON_CONNECTOR_ACTIVATION_P1_GITHUB_READONLY",
    },
  ],
  health: {
    connectorGateway: "READY",
    githubConnector: "READY_FOR_CONNECTION",
    nextActivation: "VERCEL_P2",
    systemState: "FIRST_REAL_CONNECTOR_PREPARED",
    lastSyncAt: null,
    externalApiCalls: false,
    oauthEnabled: false,
    repositoryWriteAccess: false,
    databaseWrites: false,
    tokenStorageFrontend: false,
    secretExposure: false,
  },
};

export const githubReadonlyEmptyStateCopy = {
  repositories: "Nenhum repositório autorizado ainda. A descoberta real será habilitada somente via backend read-only aprovado.",
  branches: "Nenhuma branch lida ainda. Cards de main branch e branches ativas aguardam conexão read-only.",
  pullRequests: "Nenhum pull request carregado. O monitor aceitará apenas estados open, closed e merged.",
  issues: "Nenhuma issue carregada. O monitor aceitará apenas estados abertas e fechadas.",
  commits: "Nenhum commit recente carregado. O painel exibirá SHA curto, autor, branch e data após sync seguro.",
};
