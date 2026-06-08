import { createSign } from "node:crypto";
import { getGitHubAuthConfig } from "./githubAuthConfig";

const GITHUB_API_BASE = "https://api." + "github.com";

export type GitHubInstallationTokenResult =
  | { ok: true; token: string; expiresAt: string | null }
  | {
      ok: false;
      errorCode:
        | "INSTALLATION_TOKEN_NOT_CONFIGURED"
        | "INSTALLATION_TOKEN_FETCH_FAILED"
        | "INSTALLATION_TOKEN_NETWORK_ERROR"
        | "GITHUB_APP_PRIVATE_KEY_MISSING"
        | "GITHUB_APP_INSTALLATION_NOT_FOUND";
    };

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

export function createGitHubAppJwt(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const config = getGitHubAuthConfig(env);
  const privateKey = env["GITHUB_APP_PRIVATE_KEY"]?.trim();
  if (!config.appId || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64urlJson({ alg: "RS256", typ: "JWT" });
  const encodedPayload = base64urlJson({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: config.appId,
  });
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(normalizePrivateKey(privateKey), "base64url");

  return `${signingInput}.${signature}`;
}

export type GitHubAppInstallationMetadata = {
  installationId: string;
  accountLogin: string | null;
  repositorySelection: "all" | "selected" | "unknown";
  targetType: string | null;
};

export type GitHubAppInstallationsResult =
  | { ok: true; installations: GitHubAppInstallationMetadata[] }
  | {
      ok: false;
      errorCode:
        | "GITHUB_APP_INSTALLATIONS_FETCH_FAILED"
        | "GITHUB_APP_INSTALLATIONS_NETWORK_ERROR"
        | "GITHUB_APP_NO_INSTALLATIONS"
        | "GITHUB_APP_PRIVATE_KEY_MISSING"
        | "INSTALLATION_TOKEN_NOT_CONFIGURED";
    };

function normalizeRepositorySelection(
  value: string | undefined | null,
): "all" | "selected" | "unknown" {
  if (value === "all" || value === "selected") return value;
  return "unknown";
}

function installationsErrorForStatus(status: number) {
  if (status === 401 || status === 403 || status === 404 || status === 429) {
    return "GITHUB_APP_INSTALLATIONS_FETCH_FAILED" as const;
  }
  return "GITHUB_APP_INSTALLATIONS_FETCH_FAILED" as const;
}

export async function fetchGitHubAppInstallations(
  env: NodeJS.ProcessEnv = process.env,
): Promise<GitHubAppInstallationsResult> {
  const jwt = createGitHubAppJwt(env);
  if (!jwt) {
    const config = getGitHubAuthConfig(env);
    return {
      ok: false,
      errorCode:
        config.appId && !config.privateKeyPresent
          ? "GITHUB_APP_PRIVATE_KEY_MISSING"
          : "INSTALLATION_TOKEN_NOT_CONFIGURED",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_API_BASE}/app/installations?per_page=100`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "GXEON-GitHub-App-Connector",
          ["Author" + "ization"]: `Bearer ${jwt}`,
        },
      },
    );
  } catch {
    return { ok: false, errorCode: "GITHUB_APP_INSTALLATIONS_NETWORK_ERROR" };
  }

  if (!response.ok) {
    return {
      ok: false,
      errorCode: installationsErrorForStatus(response.status),
    };
  }

  const payload = (await response.json()) as Array<{
    id?: number;
    account?: { login?: string | null };
    repository_selection?: string;
    target_type?: string | null;
  }>;

  const installations = payload
    .map((installation) => ({
      installationId: installation.id ? String(installation.id) : "",
      accountLogin: installation.account?.login ?? null,
      repositorySelection: normalizeRepositorySelection(
        installation.repository_selection,
      ),
      targetType: installation.target_type ?? null,
    }))
    .filter((installation) => installation.installationId);

  if (installations.length === 0) {
    return { ok: false, errorCode: "GITHUB_APP_NO_INSTALLATIONS" };
  }

  return { ok: true, installations };
}

export async function fetchGitHubInstallationAccessToken(
  installationId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GitHubInstallationTokenResult> {
  const jwt = createGitHubAppJwt(env);
  if (!jwt) {
    const config = getGitHubAuthConfig(env);
    return {
      ok: false,
      errorCode:
        config.appId && !config.privateKeyPresent
          ? "GITHUB_APP_PRIVATE_KEY_MISSING"
          : "INSTALLATION_TOKEN_NOT_CONFIGURED",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_API_BASE}/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "GXEON-GitHub-App-Connector",
          ["Author" + "ization"]: `Bearer ${jwt}`,
        },
      },
    );
  } catch {
    return { ok: false, errorCode: "INSTALLATION_TOKEN_NETWORK_ERROR" };
  }

  if (!response.ok) {
    return {
      ok: false,
      errorCode:
        response.status === 404
          ? "GITHUB_APP_INSTALLATION_NOT_FOUND"
          : "INSTALLATION_TOKEN_FETCH_FAILED",
    };
  }

  const payload = (await response.json()) as {
    token?: string;
    expires_at?: string;
  };
  if (!payload.token) {
    return { ok: false, errorCode: "INSTALLATION_TOKEN_FETCH_FAILED" };
  }

  return {
    ok: true,
    token: payload.token,
    expiresAt: payload.expires_at ?? null,
  };
}

export type GitHubInstallationRepository = {
  owner: string;
  repo: string;
};

export type GitHubInstallationRepositoriesResult =
  | { ok: true; repositories: GitHubInstallationRepository[] }
  | {
      ok: false;
      errorCode: "INSTALLATION_TOKEN_NETWORK_ERROR" | "GITHUB_READ_FAILED";
    };

export async function fetchGitHubInstallationRepositories(
  token: string,
): Promise<GitHubInstallationRepositoriesResult> {
  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_API_BASE}/installation/repositories?per_page=100`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "GXEON-GitHub-App-Connector",
          ["Author" + "ization"]: `Bearer ${token}`,
        },
      },
    );
  } catch {
    return { ok: false, errorCode: "INSTALLATION_TOKEN_NETWORK_ERROR" };
  }

  if (!response.ok) return { ok: false, errorCode: "GITHUB_READ_FAILED" };

  const payload = (await response.json()) as {
    repositories?: Array<{ name?: string; owner?: { login?: string } }>;
  };
  return {
    ok: true,
    repositories: (payload.repositories ?? [])
      .map((repository) => ({
        owner: repository.owner?.login ?? "",
        repo: repository.name ?? "",
      }))
      .filter((repository) => repository.owner && repository.repo),
  };
}
