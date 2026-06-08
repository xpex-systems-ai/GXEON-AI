import { Router } from "express";
import {
  getGitHubAuthConfig,
  safeGitHubAuthDiagnostics,
} from "../../connectors/github/githubAuthConfig";
import { fetchGitHubInstallationAccessToken } from "../../connectors/github/githubAppInstallationClient";
import {
  getGitHubConnectionState,
  getGitHubInstallationConnectionState,
  saveGitHubInstallationConnectionState,
} from "../../connectors/github/githubConnectorStateStore";
import {
  getGitHubConnectorConfig,
  toGitHubConnectorDiagnostics,
  toSafeGitHubConnectorStatus,
} from "../../connectors/github/githubConnectorConfig";
import {
  GitHubReadonlyClientError,
  readGitHubReadonlySnapshot,
} from "../../connectors/github/githubReadonlyClient";
import {
  createGitHubReadonlyFailedSnapshot,
  createGitHubReadonlyReadySnapshot,
  normalizeGitHubReadonlySnapshot,
} from "../../connectors/github/githubReadonlyNormalizer";
import {
  createGitHubOAuthState,
  validateGitHubOAuthState,
} from "../../connectors/github/githubOAuthState";
import type { GitHubConnectorErrorCode } from "../../connectors/github/githubConnectorTypes";
import { resolveGitHubInstallationForConfiguredRepo } from "../../connectors/github/githubInstallationResolver";
import {
  getGitHubConnectorActivity,
  recordGitHubConnectorActivity,
} from "../../connectors/github/githubConnectorActivityLog";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

function stateSecret(): string | null {
  return process.env["GITHUB_OAUTH_STATE_SECRET"]?.trim() || null;
}

function safeDashboardRedirect(errorCode?: string): string {
  const authConfig = getGitHubAuthConfig();
  const dashboardUrl = authConfig.dashboardUrl ?? "http://localhost:5173";
  const url = new URL(`${dashboardUrl}/ops/connectors/github`);
  if (errorCode) url.searchParams.set("error", errorCode);
  else url.searchParams.set("connected", "github");
  return url.toString();
}

function createInstallationUrl(
  appSlug: string,
  state: string,
  callbackUrl: string,
): string {
  const url = new URL(
    `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`,
  );
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", callbackUrl);
  return url.toString();
}

function createOAuthUrl(
  clientId: string,
  state: string,
  callbackUrl: string,
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  return url.toString();
}

function applyInstallationMetadata(
  snapshot: ReturnType<typeof normalizeGitHubReadonlySnapshot>,
  installation: NonNullable<
    ReturnType<typeof getGitHubInstallationConnectionState>
  >,
  repositoryCount = snapshot.repositoryCount,
) {
  return {
    ...snapshot,
    connectionMode: "github_app_installation" as const,
    installation: {
      installationId: installation.installationId,
      accountLogin: installation.accountLogin,
      repositorySelection: installation.repositorySelection,
      connectedAt: installation.connectedAt,
      stateSource: installation.stateSource,
    },
    repositoryCount,
    health: {
      ...snapshot.health,
      oauthEnabled: true,
    },
  };
}

router.get("/connectors/github/diagnostics", (_req, res) => {
  const auth = safeGitHubAuthDiagnostics();
  const connection = getGitHubConnectionState();
  const connector = toGitHubConnectorDiagnostics();
  recordGitHubConnectorActivity({
    eventType: "diagnostics_checked",
    status: "success",
    metadata: {
      appInstallationReady: auth.appInstallationReady,
      installationTokenReady: auth.installationTokenReady,
      connectionMode: connection.mode,
    },
  });
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({
    ...connector,
    auth,
    connection,
    canAutodiscoverInstallations:
      auth.appInstallationReady && auth.installationTokenReady,
    installationStatePresent: connection.mode === "github_app_installation",
    installationStateSource: connection.stateSource,
    selectedRepoReady: connector.ownerPresent && connector.repoPresent,
  });
});

router.get("/connectors/github/status", (_req, res) => {
  const config = getGitHubConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);
  res.json({
    ...toSafeGitHubConnectorStatus(config),
    connection: getGitHubConnectionState(),
    auth: safeGitHubAuthDiagnostics(),
  });
});

function resolveConnectionMode():
  | "github_app_installation"
  | "backend_token"
  | "not_connected" {
  const connection = getGitHubConnectionState();
  if (connection.mode === "github_app_installation") return connection.mode;
  return getGitHubConnectorConfig().tokenPresent
    ? "backend_token"
    : "not_connected";
}

function missingFinalReadinessCodes(): string[] {
  const authMissing = safeGitHubAuthDiagnostics().missing;
  const config = getGitHubConnectorConfig();
  const connectionMode = resolveConnectionMode();
  if (connectionMode === "github_app_installation") return [];
  if (connectionMode === "backend_token") return [];
  return [...new Set([...authMissing, ...config.missing])];
}

router.get("/connectors/github/final-readiness", (_req, res) => {
  const authConfig = getGitHubAuthConfig();
  const auth = safeGitHubAuthDiagnostics(authConfig);
  const connectorDiagnostics = toGitHubConnectorDiagnostics();
  const connection = getGitHubConnectionState();
  const connectionMode = resolveConnectionMode();
  const canAutodiscoverInstallations =
    auth.appInstallationReady && auth.installationTokenReady;
  const missing = canAutodiscoverInstallations
    ? []
    : missingFinalReadinessCodes();
  const installationStatePresent =
    connection.mode === "github_app_installation";

  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({
    provider: "github",
    status:
      missing.length === 0
        ? installationStatePresent || connectionMode !== "not_connected"
          ? "READY"
          : "READY_TO_DISCOVER_INSTALLATION"
        : "CONFIG_MISSING",
    apiRuntime: { online: true, routeStatus: "ONLINE" },
    connectionMode,
    missing,
    callbackUrl: authConfig.callbackUrl,
    dashboardUrlPresent: Boolean(authConfig.dashboardUrl),
    apiPublicUrlPresent: Boolean(authConfig.apiPublicUrl),
    auth,
    connector: connectorDiagnostics,
    connection,
    canAutodiscoverInstallations,
    installationStatePresent,
    installationStateSource: connection.stateSource,
    selectedRepoReady:
      connectorDiagnostics.ownerPresent && connectorDiagnostics.repoPresent,
    nextStep: installationStatePresent
      ? "Run snapshot to refresh read-only repository data."
      : canAutodiscoverInstallations
        ? "Click Connect GitHub or run snapshot to autodiscover the GitHub App installation."
        : "Complete GitHub App backend configuration, then click Connect GitHub.",
    timestamp: new Date().toISOString(),
  });
});

router.get("/connectors/github/connect-url", (_req, res) => {
  const authConfig = getGitHubAuthConfig();
  const secret = stateSecret();
  res.setHeader("Cache-Control", diagnosticsCacheHeader);

  if (!secret || !authConfig.callbackUrl || !authConfig.dashboardUrl) {
    res.status(503).json({
      provider: "github",
      status: "CONFIG_MISSING",
      readiness: {
        appInstallationReady: authConfig.appInstallationReady,
        installationTokenReady: authConfig.installationTokenReady,
        callbackUrl: authConfig.callbackUrl,
        dashboardUrlPresent: Boolean(authConfig.dashboardUrl),
        apiPublicUrlPresent: Boolean(authConfig.apiPublicUrl),
      },
      missing:
        authConfig.missing.length > 0
          ? authConfig.missing
          : ["MISSING_GITHUB_OAUTH_STATE_SECRET"],
    });
    return;
  }

  const { state, issuedAt } = createGitHubOAuthState({ secret });

  if (authConfig.appSlug) {
    recordGitHubConnectorActivity({
      eventType: "connect_url_generated",
      status: "success",
      metadata: { mode: "github_app_installation" },
    });
    res.json({
      url: createInstallationUrl(
        authConfig.appSlug,
        state,
        authConfig.callbackUrl,
      ),
      provider: "github",
      mode: "github_app_installation",
      stateIssuedAt: issuedAt,
    });
    return;
  }

  if (authConfig.clientId && authConfig.oauthReady) {
    recordGitHubConnectorActivity({
      eventType: "connect_url_generated",
      status: "success",
      metadata: { mode: "oauth_app_authorization" },
    });
    res.json({
      url: createOAuthUrl(authConfig.clientId, state, authConfig.callbackUrl),
      provider: "github",
      mode: "oauth_app_authorization",
      stateIssuedAt: issuedAt,
    });
    return;
  }

  res.status(503).json({
    provider: "github",
    status: "CONFIG_MISSING",
    readiness: {
      appInstallationReady: authConfig.appInstallationReady,
      installationTokenReady: authConfig.installationTokenReady,
      callbackUrl: authConfig.callbackUrl,
      dashboardUrlPresent: Boolean(authConfig.dashboardUrl),
      apiPublicUrlPresent: Boolean(authConfig.apiPublicUrl),
    },
    missing: authConfig.missing,
  });
});

router.get("/connectors/github/activity", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({ provider: "github", events: getGitHubConnectorActivity() });
});

router.get("/connectors/github/callback", (req, res) => {
  const secret = stateSecret();
  if (!secret) {
    res.redirect(
      303,
      safeDashboardRedirect("MISSING_GITHUB_OAUTH_STATE_SECRET"),
    );
    return;
  }

  const validation = validateGitHubOAuthState({
    state: typeof req.query.state === "string" ? req.query.state : null,
    secret,
  });

  if (!validation.valid) {
    res.redirect(303, safeDashboardRedirect(validation.errorCode));
    return;
  }

  const installationId =
    typeof req.query.installation_id === "string"
      ? req.query.installation_id
      : null;
  const setupAction =
    typeof req.query.setup_action === "string" ? req.query.setup_action : null;
  const code = typeof req.query.code === "string" ? req.query.code : null;

  recordGitHubConnectorActivity({
    eventType: "callback_received",
    status: installationId ? "success" : "failed",
    code: installationId ? null : "GITHUB_INSTALLATION_MISSING",
    metadata: {
      setupAction,
      hasInstallationId: Boolean(installationId),
      hasCode: Boolean(code),
    },
  });

  if (!installationId) {
    res.redirect(
      303,
      safeDashboardRedirect(
        code
          ? "OAUTH_CALLBACK_REQUIRES_GITHUB_APP_INSTALLATION"
          : "GITHUB_INSTALLATION_MISSING",
      ),
    );
    return;
  }

  const savedInstallation = saveGitHubInstallationConnectionState({
    installationId,
    accountLogin: null,
    repositorySelection: "unknown",
    setupAction,
  });

  recordGitHubConnectorActivity({
    eventType: "installation_saved",
    status: "success",
    metadata: {
      installationId: savedInstallation.installationId,
      repositorySelection: savedInstallation.repositorySelection,
      stateSource: savedInstallation.stateSource,
    },
  });

  res.redirect(303, safeDashboardRedirect());
});

router.get("/connectors/github/snapshot", async (_req, res) => {
  const config = getGitHubConnectorConfig();
  const auth = safeGitHubAuthDiagnostics();
  const appReady = auth.appInstallationReady && auth.installationTokenReady;
  res.setHeader("Cache-Control", cacheHeader);

  if (appReady) {
    const resolved = await resolveGitHubInstallationForConfiguredRepo();

    if (resolved.ok) {
      const { installation, targetRepository, repositoryCount } =
        resolved.value;
      const installationMetadata = {
        installationId: installation.installationId,
        accountLogin: installation.accountLogin,
        repositorySelection: installation.repositorySelection,
        connectedAt: installation.connectedAt,
        stateSource: installation.stateSource,
      };
      const tokenResult = await fetchGitHubInstallationAccessToken(
        installation.installationId,
      );

      if (!tokenResult.ok) {
        recordGitHubConnectorActivity({
          eventType: "snapshot_failed",
          status: "failed",
          code: tokenResult.errorCode,
          metadata: {
            connectionMode: "github_app_installation",
            installationId: installation.installationId,
            owner: targetRepository.owner,
            repo: targetRepository.repo,
          },
        });
        res.status(503).json({
          ...createGitHubReadonlyFailedSnapshot(
            targetRepository.owner,
            targetRepository.repo,
            "GitHub App installation token is not available on the backend runtime.",
            tokenResult.errorCode as GitHubConnectorErrorCode,
          ),
          connectionMode: "github_app_installation",
          installation: installationMetadata,
        });
        return;
      }

      recordGitHubConnectorActivity({
        eventType: "installation_token_minted",
        status: "success",
        metadata: { installationId: installation.installationId },
      });

      try {
        const rawSnapshot = await readGitHubReadonlySnapshot({
          token: tokenResult.token,
          owner: targetRepository.owner,
          repo: targetRepository.repo,
        });
        const snapshot = applyInstallationMetadata(
          normalizeGitHubReadonlySnapshot(rawSnapshot),
          installation,
          repositoryCount,
        );
        recordGitHubConnectorActivity({
          eventType: "repository_snapshot_read",
          status: "success",
          metadata: {
            connectionMode: "github_app_installation",
            installationId: installation.installationId,
            stateSource: installation.stateSource,
            owner: targetRepository.owner,
            repo: targetRepository.repo,
            repositoryCount,
            branches: snapshot.branches.length,
            pullRequests: snapshot.pullRequests.length,
            issues: snapshot.issues.length,
            commits: snapshot.commits.length,
          },
        });
        res.json(snapshot);
      } catch (error) {
        const reason =
          error instanceof GitHubReadonlyClientError
            ? error.message
            : "GitHub App installation read failed with an unexpected backend error.";
        const errorCode =
          error instanceof GitHubReadonlyClientError
            ? error.code
            : "GITHUB_READ_FAILED";
        recordGitHubConnectorActivity({
          eventType: "snapshot_failed",
          status: "failed",
          code: errorCode,
          metadata: {
            connectionMode: "github_app_installation",
            installationId: installation.installationId,
            owner: targetRepository.owner,
            repo: targetRepository.repo,
          },
        });
        res
          .status(
            error instanceof GitHubReadonlyClientError ? error.statusCode : 502,
          )
          .json({
            ...createGitHubReadonlyFailedSnapshot(
              targetRepository.owner,
              targetRepository.repo,
              reason,
              errorCode,
            ),
            connectionMode: "github_app_installation",
            installation: installationMetadata,
          });
      }
      return;
    }

    if (!resolved.shouldFallbackToLegacyToken) {
      recordGitHubConnectorActivity({
        eventType: "snapshot_failed",
        status: "failed",
        code: resolved.errorCode,
        metadata: { connectionMode: "github_app_installation" },
      });
      res.status(404).json({
        ...createGitHubReadonlyFailedSnapshot(
          config.owner,
          config.repo,
          "GitHub App installation discovery could not find the configured repository.",
          resolved.errorCode,
        ),
        connectionMode: "github_app_installation",
        installation: null,
      });
      return;
    }
  }

  if (!config.isConfigured) {
    const readyCode = appReady
      ? "GITHUB_APP_NO_INSTALLATIONS"
      : (config.missing[0] ?? "MISSING_TOKEN");
    res.json({
      ...createGitHubReadonlyReadySnapshot(
        config.owner,
        config.repo,
        readyCode,
      ),
      connectionMode: "not_connected",
      installation: null,
    });
    return;
  }

  try {
    const rawSnapshot = await readGitHubReadonlySnapshot();
    const snapshot = {
      ...normalizeGitHubReadonlySnapshot(rawSnapshot),
      connectionMode: "backend_token" as const,
      installation: null,
    };
    recordGitHubConnectorActivity({
      eventType: "repository_snapshot_read",
      status: "success",
      metadata: {
        connectionMode: "backend_token",
        owner: config.owner,
        repo: config.repo,
        branches: snapshot.branches.length,
        pullRequests: snapshot.pullRequests.length,
        issues: snapshot.issues.length,
        commits: snapshot.commits.length,
      },
    });
    res.json(snapshot);
  } catch (error) {
    const reason =
      error instanceof GitHubReadonlyClientError
        ? error.message
        : "GitHub read failed with an unexpected backend error.";
    const errorCode =
      error instanceof GitHubReadonlyClientError
        ? error.code
        : "GITHUB_READ_FAILED";

    recordGitHubConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code: errorCode,
      metadata: {
        connectionMode: "backend_token",
        owner: config.owner,
        repo: config.repo,
      },
    });

    res
      .status(
        error instanceof GitHubReadonlyClientError ? error.statusCode : 502,
      )
      .json(
        createGitHubReadonlyFailedSnapshot(
          config.owner,
          config.repo,
          reason,
          errorCode,
        ),
      );
  }
});

export default router;
