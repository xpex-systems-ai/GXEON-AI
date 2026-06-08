export type GitHubConnectorStatus = "READY" | "CONNECTED_READONLY" | "FAILED";

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
  | "GITHUB_APP_PRIVATE_KEY_MISSING"
  | "GITHUB_APP_INSTALLATION_NOT_FOUND"
  | "INSTALLATION_HAS_NO_REPOSITORIES";

export type GitHubConnectorConfig = {
  owner: string;
  repo: string;
  isConfigured: boolean;
  tokenPresent: boolean;
  ownerPresent: boolean;
  repoPresent: boolean;
  ownerConfiguredFromEnv: boolean;
  repoConfiguredFromEnv: boolean;
  missing: GitHubConnectorErrorCode[];
};

export type GitHubConnectorRuntimeDiagnostics = {
  provider: "github";
  routeStatus: "ONLINE";
  tokenPresent: boolean;
  ownerPresent: boolean;
  repoPresent: boolean;
  ownerConfiguredFromEnv: boolean;
  repoConfiguredFromEnv: boolean;
  configured: boolean;
  owner: string | null;
  repo: string | null;
  missing: GitHubConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  timestamp: string;
};

export type GitHubConnectorSafeStatus = {
  provider: "github";
  status: GitHubConnectorStatus;
  configured: boolean;
  owner: string | null;
  repo: string | null;
  missing: GitHubConnectorErrorCode[];
  lastSyncAt: string | null;
  lastErrorCode: GitHubConnectorErrorCode;
  message: string;
};

export type GitHubReadonlyRepository = {
  id: string;
  name: string;
  owner: string;
  visibility: "private" | "internal" | "public";
  defaultBranch: string;
  status:
    | "READY_FOR_READONLY_CONNECTION"
    | "WAITING_FOR_AUTHORIZATION"
    | "READONLY_CONNECTED";
  authorizedScopes: string[];
  lastReadAt: string | null;
};

export type GitHubReadonlyBranch = {
  name: string;
  kind: "MAIN" | "ACTIVE";
  lastCommitSha: string;
  lastCommitAuthor: string;
  lastActivityAt: string;
  protected: boolean;
};

export type GitHubReadonlyPullRequest = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  sourceBranch: string;
  targetBranch: string;
  author: string;
  updatedAt: string;
};

export type GitHubReadonlyIssue = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
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
  type: "COMMIT" | "PULL_REQUEST" | "ISSUE" | "BRANCH" | "HEALTH";
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
    | "GITHUB_READ_FAILED"
    | "MISSING_GITHUB_OAUTH_STATE_SECRET"
    | "GITHUB_AUTH_CONFIG_MISSING"
    | "GITHUB_AUTH_STATE_INVALID"
    | "GITHUB_INSTALLATION_MISSING"
    | "INSTALLATION_TOKEN_NOT_CONFIGURED"
    | "INSTALLATION_TOKEN_FETCH_FAILED"
    | "INSTALLATION_TOKEN_NETWORK_ERROR"
    | "GITHUB_APP_PRIVATE_KEY_MISSING"
    | "GITHUB_APP_INSTALLATION_NOT_FOUND"
    | "INSTALLATION_HAS_NO_REPOSITORIES";
  lastSyncAt: string | null;
  lastErrorCode: GitHubConnectorErrorCode;
  externalApiCalls: false;
  oauthEnabled: boolean;
  repositoryWriteAccess: false;
  databaseWrites: false;
  tokenStorageFrontend: false;
  secretExposure: false;
};

export type GitHubReadonlySnapshot = {
  status: GitHubConnectorStatus;
  statusLabel: string;
  configured: boolean;
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

export type GitHubRawRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  visibility?: "public" | "private" | "internal";
  default_branch: string;
  owner?: { login?: string };
};

export type GitHubRawBranch = {
  name: string;
  protected: boolean;
  commit?: {
    sha?: string;
    commit?: { author?: { name?: string; date?: string } };
  };
};

export type GitHubRawPullRequest = {
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
  head?: { ref?: string };
  base?: { ref?: string };
  user?: { login?: string };
  updated_at: string;
};

export type GitHubRawIssue = {
  number: number;
  title: string;
  state: "open" | "closed";
  pull_request?: unknown;
  user?: { login?: string };
  updated_at: string;
};

export type GitHubRawCommit = {
  sha: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
  author?: { login?: string } | null;
};

export type GitHubReadonlyRawSnapshot = {
  repository: GitHubRawRepository;
  branches: GitHubRawBranch[];
  pullRequests: GitHubRawPullRequest[];
  issues: GitHubRawIssue[];
  commits: GitHubRawCommit[];
  readAt: string;
};
