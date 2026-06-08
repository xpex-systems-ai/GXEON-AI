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
) {
  const installation = getGitHubInstallationConnectionState();
  if (!installation) return snapshot;

  return {
    ...snapshot,
    connectionMode: "github_app_installation" as const,
    installation: {
      installationId: installation.installationId,
      accountLogin: installation.accountLogin,
      repositorySelection: installation.repositorySelection,
      connectedAt: installation.connectedAt,
    },
    health: {
      ...snapshot.health,
      oauthEnabled: true,
    },
  };
}

router.get("/connectors/github/diagnostics", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({
    ...toGitHubConnectorDiagnostics(),
    auth: safeGitHubAuthDiagnostics(),
    connection: getGitHubConnectionState(),
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

router.get("/connectors/github/connect-url", (_req, res) => {
  const authConfig = getGitHubAuthConfig();
  const secret = stateSecret();
  res.setHeader("Cache-Control", diagnosticsCacheHeader);

  if (!secret || !authConfig.callbackUrl || !authConfig.dashboardUrl) {
    res.status(503).json({
      provider: "github",
      status: "CONFIG_MISSING",
      missing:
        authConfig.missing.length > 0
          ? authConfig.missing
          : ["MISSING_GITHUB_OAUTH_STATE_SECRET"],
    });
    return;
  }

  const { state, issuedAt } = createGitHubOAuthState({ secret });

  if (authConfig.appSlug) {
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
    missing: authConfig.missing,
  });
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

  saveGitHubInstallationConnectionState({
    installationId,
    accountLogin: null,
    repositorySelection: "unknown",
    setupAction,
  });

  res.redirect(303, safeDashboardRedirect());
});

router.get("/connectors/github/snapshot", async (_req, res) => {
  const config = getGitHubConnectorConfig();
  const installation = getGitHubInstallationConnectionState();
  res.setHeader("Cache-Control", cacheHeader);

  if (installation) {
    const tokenResult = await fetchGitHubInstallationAccessToken(
      installation.installationId,
    );

    if (!tokenResult.ok) {
      res.status(503).json({
        ...createGitHubReadonlyFailedSnapshot(
          config.owner,
          config.repo,
          "GitHub App installation token is not available on the backend runtime.",
          tokenResult.errorCode as GitHubConnectorErrorCode,
        ),
        connectionMode: "github_app_installation",
        installation: {
          installationId: installation.installationId,
          accountLogin: installation.accountLogin,
          repositorySelection: installation.repositorySelection,
          connectedAt: installation.connectedAt,
        },
      });
      return;
    }

    try {
      const rawSnapshot = await readGitHubReadonlySnapshot({
        token: tokenResult.token,
        owner: config.owner,
        repo: config.repo,
      });
      res.json(
        applyInstallationMetadata(normalizeGitHubReadonlySnapshot(rawSnapshot)),
      );
    } catch (error) {
      const reason =
        error instanceof GitHubReadonlyClientError
          ? error.message
          : "GitHub App installation read failed with an unexpected backend error.";
      const errorCode =
        error instanceof GitHubReadonlyClientError
          ? error.code
          : "GITHUB_READ_FAILED";
      res
        .status(
          error instanceof GitHubReadonlyClientError ? error.statusCode : 502,
        )
        .json({
          ...createGitHubReadonlyFailedSnapshot(
            config.owner,
            config.repo,
            reason,
            errorCode,
          ),
          connectionMode: "github_app_installation",
          installation: {
            installationId: installation.installationId,
            accountLogin: installation.accountLogin,
            repositorySelection: installation.repositorySelection,
            connectedAt: installation.connectedAt,
          },
        });
    }
    return;
  }

  if (!config.isConfigured) {
    res.json({
      ...createGitHubReadonlyReadySnapshot(
        config.owner,
        config.repo,
        config.missing[0] ?? "MISSING_TOKEN",
      ),
      connectionMode: "not_connected",
      installation: null,
    });
    return;
  }

  try {
    const rawSnapshot = await readGitHubReadonlySnapshot();
    res.json({
      ...normalizeGitHubReadonlySnapshot(rawSnapshot),
      connectionMode: "backend_token",
      installation: null,
    });
  } catch (error) {
    const reason =
      error instanceof GitHubReadonlyClientError
        ? error.message
        : "GitHub read failed with an unexpected backend error.";
    const errorCode =
      error instanceof GitHubReadonlyClientError
        ? error.code
        : "GITHUB_READ_FAILED";

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
