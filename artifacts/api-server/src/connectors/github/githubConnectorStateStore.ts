export type GitHubConnectorConnectionMode =
  | "github_app_installation"
  | "backend_token"
  | "not_connected";

export type GitHubInstallationStateSource = "memory" | "env" | "none";

export type GitHubInstallationConnectionState = {
  mode: "github_app_installation";
  installationId: string;
  accountLogin: string | null;
  repositorySelection: "all" | "selected" | "unknown";
  connectedAt: string;
  setupAction: string | null;
  stateSource: Exclude<GitHubInstallationStateSource, "none">;
};

export type SafeGitHubConnectionState =
  | GitHubInstallationConnectionState
  | { mode: "not_connected"; connectedAt: null; stateSource: "none" };

let installationState: GitHubInstallationConnectionState | null = null;

function trimmed(env: NodeJS.ProcessEnv, key: string): string | null {
  return env[key]?.trim() || null;
}

function normalizeRepositorySelection(
  value: string | null,
): "all" | "selected" | "unknown" {
  if (value === "all" || value === "selected") return value;
  return "unknown";
}

function envInstallationState(
  env: NodeJS.ProcessEnv = process.env,
): GitHubInstallationConnectionState | null {
  const installationId = trimmed(env, "GITHUB_APP_INSTALLATION_ID");
  if (!installationId) return null;

  return {
    mode: "github_app_installation",
    installationId,
    accountLogin: trimmed(env, "GITHUB_APP_ACCOUNT_LOGIN"),
    repositorySelection: normalizeRepositorySelection(
      trimmed(env, "GITHUB_APP_REPOSITORY_SELECTION"),
    ),
    connectedAt: "env-persisted",
    setupAction: null,
    stateSource: "env",
  };
}

// Runtime keeps only safe GitHub App installation metadata in memory, with an
// optional env metadata fallback for Railway redeploys. Installation access
// tokens are never stored here; they are minted on demand from installationId.
export function saveGitHubInstallationConnectionState(
  state: Omit<
    GitHubInstallationConnectionState,
    "mode" | "connectedAt" | "stateSource"
  > & {
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
    stateSource: "memory",
  };
  return installationState;
}

export function getGitHubInstallationConnectionState(): GitHubInstallationConnectionState | null {
  return installationState ?? envInstallationState();
}

export function getGitHubConnectionState(): SafeGitHubConnectionState {
  return (
    getGitHubInstallationConnectionState() ?? {
      mode: "not_connected",
      connectedAt: null,
      stateSource: "none",
    }
  );
}
