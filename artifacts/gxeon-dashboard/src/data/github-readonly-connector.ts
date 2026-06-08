export type GitHubConnectorStatus =
  | "READY"
  | "CONNECTING"
  | "CONNECTED_READONLY"
  | "FAILED"
  | "DISCONNECTED";

export type GitHubConnectorErrorCode =
  | "NONE"
  | "MISSING_TOKEN"
  | "MISSING_OWNER"
  | "MISSING_REPO"
  | "GITHUB_401"
  | "GITHUB_403"
  | "GITHUB_404"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "GITHUB_READ_FAILED"
  | "MISSING_GITHUB_OAUTH_STATE_SECRET"
  | "GITHUB_AUTH_CONFIG_MISSING"
  | "GITHUB_AUTH_STATE_INVALID"
  | "GITHUB_INSTALLATION_MISSING"
  | "INSTALLATION_TOKEN_NOT_CONFIGURED"
  | "INSTALLATION_TOKEN_FETCH_FAILED"
  | "INSTALLATION_TOKEN_NETWORK_ERROR"
  | "BACKEND_UNAVAILABLE";

export type GitHubConnectorDiagnostics = {
  provider: "github";
  routeStatus: "ONLINE";
  tokenPresent: boolean;
  ownerPresent: boolean;
  repoPresent: boolean;
  configured: boolean;
  auth?: {
    mode: "github_app_installation" | "oauth_app_authorization";
    appInstallationReady: boolean;
    installationTokenReady: boolean;
    oauthReady: boolean;
    missing: string[];
  };
  connection?: GitHubConnectionState;
  owner: string | null;
  repo: string | null;
  missing: GitHubConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  timestamp: string;
};

export type GitHubRepositoryStatus =
  | "READY_FOR_READONLY_CONNECTION"
  | "WAITING_FOR_AUTHORIZATION"
  | "READONLY_CONNECTED";

export type GitHubBranchKind = "MAIN" | "ACTIVE";

export type GitHubPullRequestState = "OPEN" | "CLOSED" | "MERGED";

export type GitHubIssueState = "OPEN" | "CLOSED";

export type GitHubEvidenceType =
  | "COMMIT"
  | "PULL_REQUEST"
  | "ISSUE"
  | "BRANCH"
  | "HEALTH";

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
  githubConnector: "READY_FOR_CONNECTION" | "CONNECTED_READONLY" | "FAILED";
  nextActivation: "VERCEL_P2";
  systemState:
    | "FIRST_REAL_CONNECTOR_PREPARED"
    | "REAL_READONLY_CONNECTED"
    | "GITHUB_READ_FAILED";
  lastSyncAt: string | null;
  lastErrorCode: GitHubConnectorErrorCode;
  externalApiCalls: false;
  oauthEnabled: boolean;
  repositoryWriteAccess: false;
  databaseWrites: false;
  tokenStorageFrontend: false;
  secretExposure: false;
};

export type GitHubConnectionState =
  | {
      mode: "github_app_installation";
      installationId: string;
      accountLogin: string | null;
      repositorySelection: "all" | "selected" | "unknown";
      connectedAt: string;
      setupAction: string | null;
    }
  | { mode: "not_connected"; connectedAt: null };

export type GitHubReadonlySnapshot = {
  status: GitHubConnectorStatus;
  statusLabel: string;
  configured?: boolean;
  connectionMode?:
    | "github_app_installation"
    | "backend_token"
    | "not_connected";
  installation?: {
    installationId: string;
    accountLogin: string | null;
    repositorySelection: "all" | "selected" | "unknown";
    connectedAt: string;
  } | null;
  lastErrorCode: GitHubConnectorErrorCode;
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
  "issue_creation_forbidden",
  "pull_request_creation_forbidden",
  "pull_request_merge_forbidden",
  "branch_deletion_forbidden",
  "commit_push_forbidden",
  "repository_writes_forbidden",
  "settings_changes_forbidden",
  "store_tokens_frontend",
] as const;

export const githubReadonlyStatusFlow: GitHubConnectorStatus[] = [
  "READY",
  "CONNECTING",
  "CONNECTED_READONLY",
  "FAILED",
];

export const githubReadonlySnapshot: GitHubReadonlySnapshot = {
  status: "READY",
  statusLabel: "READY_FOR_READONLY_CONNECTION",
  configured: false,
  lastErrorCode: "MISSING_TOKEN",
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
      description:
        "UI, status model, discovery placeholders and safety boundary are ready for GitHub App installation without browser tokens, writes or credential forms.",
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
    lastErrorCode: "MISSING_TOKEN",
    externalApiCalls: false,
    oauthEnabled: false,
    repositoryWriteAccess: false,
    databaseWrites: false,
    tokenStorageFrontend: false,
    secretExposure: false,
  },
};

export const githubReadonlyEmptyStateCopy = {
  repositories:
    "Nenhum repositório autorizado ainda. A descoberta real será habilitada somente via backend read-only aprovado.",
  branches:
    "Nenhuma branch lida ainda. Cards de main branch e branches ativas aguardam conexão read-only.",
  pullRequests:
    "Nenhum pull request carregado. O monitor aceitará apenas estados open, closed e merged.",
  issues:
    "Nenhuma issue carregada. O monitor aceitará apenas estados abertas e fechadas.",
  commits:
    "Nenhum commit recente carregado. O painel exibirá SHA curto, autor, branch e data após sync seguro.",
};
