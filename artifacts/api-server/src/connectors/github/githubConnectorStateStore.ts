export type GitHubConnectorConnectionMode =
  | "github_app_installation"
  | "backend_token"
  | "not_connected";

export type GitHubInstallationConnectionState = {
  mode: "github_app_installation";
  installationId: string;
  accountLogin: string | null;
  repositorySelection: "all" | "selected" | "unknown";
  connectedAt: string;
  setupAction: string | null;
};

export type SafeGitHubConnectionState =
  | GitHubInstallationConnectionState
  | { mode: "not_connected"; connectedAt: null };

let installationState: GitHubInstallationConnectionState | null = null;

// P3 intentionally keeps only safe GitHub App installation metadata in memory.
// Production should move this state to an encrypted Supabase table or durable
// Railway volume before multi-instance scaling. Installation access tokens are
// never stored here; they are minted on demand from installationId.
export function saveGitHubInstallationConnectionState(
  state: Omit<GitHubInstallationConnectionState, "mode" | "connectedAt"> & {
    connectedAt?: string;
  },
): GitHubInstallationConnectionState {
  installationState = {
    mode: "github_app_installation",
    installationId: state.installationId,
    accountLogin: state.accountLogin,
    repositorySelection: state.repositorySelection,
    setupAction: state.setupAction,
    connectedAt: state.connectedAt ?? new Date().toISOString(),
  };
  return installationState;
}

export function getGitHubInstallationConnectionState(): GitHubInstallationConnectionState | null {
  return installationState;
}

export function getGitHubConnectionState(): SafeGitHubConnectionState {
  return installationState ?? { mode: "not_connected", connectedAt: null };
}
