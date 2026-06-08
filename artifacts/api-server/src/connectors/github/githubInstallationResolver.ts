import {
  fetchGitHubAppInstallations,
  fetchGitHubInstallationAccessToken,
  fetchGitHubInstallationRepositories,
  type GitHubInstallationRepository,
} from "./githubAppInstallationClient";
import { getGitHubConnectorConfig } from "./githubConnectorConfig";
import { recordGitHubConnectorActivity } from "./githubConnectorActivityLog";
import {
  getGitHubInstallationConnectionState,
  saveGitHubInstallationConnectionState,
  type GitHubInstallationConnectionState,
} from "./githubConnectorStateStore";

export type GitHubResolvedInstallationSource =
  | "memory"
  | "env"
  | "autodiscovered";

export type GitHubResolvedInstallation = {
  installation: GitHubInstallationConnectionState;
  targetRepository: GitHubInstallationRepository;
  repositoryCount: number;
  source: GitHubResolvedInstallationSource;
};

export type GitHubInstallationResolverResult =
  | { ok: true; value: GitHubResolvedInstallation }
  | {
      ok: false;
      errorCode:
        | "INSTALLATION_TOKEN_NOT_CONFIGURED"
        | "INSTALLATION_TOKEN_FETCH_FAILED"
        | "INSTALLATION_TOKEN_NETWORK_ERROR"
        | "GITHUB_APP_PRIVATE_KEY_MISSING"
        | "GITHUB_APP_INSTALLATION_NOT_FOUND"
        | "GITHUB_APP_INSTALLATIONS_FETCH_FAILED"
        | "GITHUB_APP_INSTALLATIONS_NETWORK_ERROR"
        | "GITHUB_APP_NO_INSTALLATIONS"
        | "GITHUB_APP_INSTALLATION_REPO_NOT_FOUND"
        | "GITHUB_APP_INSTALLATION_DISCOVERY_FAILED"
        | "INSTALLATION_HAS_NO_REPOSITORIES"
        | "GITHUB_READ_FAILED";
      shouldFallbackToLegacyToken: boolean;
    };

function sameRepo(
  repository: GitHubInstallationRepository,
  owner: string,
  repo: string,
): boolean {
  return (
    repository.owner.toLowerCase() === owner.toLowerCase() &&
    repository.repo.toLowerCase() === repo.toLowerCase()
  );
}

async function repositoriesForInstallation(installationId: string) {
  const tokenResult = await fetchGitHubInstallationAccessToken(installationId);
  if (!tokenResult.ok) return tokenResult;

  recordGitHubConnectorActivity({
    eventType: "installation_token_minted",
    status: "success",
    metadata: { installationId },
  });

  return fetchGitHubInstallationRepositories(tokenResult.token);
}

function targetFromRepositories(repositories: GitHubInstallationRepository[]) {
  const config = getGitHubConnectorConfig();
  if (config.ownerConfiguredFromEnv && config.repoConfiguredFromEnv) {
    return repositories.find((repository) =>
      sameRepo(repository, config.owner, config.repo),
    );
  }
  return repositories[0];
}

export async function resolveGitHubInstallationForConfiguredRepo(): Promise<GitHubInstallationResolverResult> {
  const existing = getGitHubInstallationConnectionState();
  if (existing) {
    const repositoriesResult = await repositoriesForInstallation(
      existing.installationId,
    );
    if (!repositoriesResult.ok) {
      return {
        ok: false,
        errorCode: repositoriesResult.errorCode,
        shouldFallbackToLegacyToken: false,
      };
    }

    const targetRepository = targetFromRepositories(
      repositoriesResult.repositories,
    );
    if (!targetRepository) {
      return {
        ok: false,
        errorCode: repositoriesResult.repositories.length
          ? "GITHUB_APP_INSTALLATION_REPO_NOT_FOUND"
          : "INSTALLATION_HAS_NO_REPOSITORIES",
        shouldFallbackToLegacyToken: false,
      };
    }

    return {
      ok: true,
      value: {
        installation: existing,
        targetRepository,
        repositoryCount: repositoriesResult.repositories.length,
        source: existing.stateSource,
      },
    };
  }

  const installationsResult = await fetchGitHubAppInstallations();
  if (!installationsResult.ok) {
    return {
      ok: false,
      errorCode: installationsResult.errorCode,
      shouldFallbackToLegacyToken:
        installationsResult.errorCode === "GITHUB_APP_NO_INSTALLATIONS",
    };
  }

  for (const discovered of installationsResult.installations) {
    const repositoriesResult = await repositoriesForInstallation(
      discovered.installationId,
    );
    if (!repositoriesResult.ok) continue;

    const targetRepository = targetFromRepositories(
      repositoriesResult.repositories,
    );
    if (!targetRepository) continue;

    const installation = saveGitHubInstallationConnectionState({
      installationId: discovered.installationId,
      accountLogin: discovered.accountLogin,
      repositorySelection: discovered.repositorySelection,
      setupAction: null,
      stateSource: "autodiscovered",
    });

    recordGitHubConnectorActivity({
      eventType: "installation_autodiscovered",
      status: "success",
      metadata: {
        installationId: installation.installationId,
        accountLogin: installation.accountLogin,
        repositorySelection: installation.repositorySelection,
        targetType: discovered.targetType,
        owner: targetRepository.owner,
        repo: targetRepository.repo,
        repositoryCount: repositoriesResult.repositories.length,
      },
    });

    return {
      ok: true,
      value: {
        installation,
        targetRepository,
        repositoryCount: repositoriesResult.repositories.length,
        source: "autodiscovered",
      },
    };
  }

  return {
    ok: false,
    errorCode: "GITHUB_APP_INSTALLATION_REPO_NOT_FOUND",
    shouldFallbackToLegacyToken: false,
  };
}
