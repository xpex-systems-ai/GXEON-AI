import { getVercelConnectorConfig } from "./vercelConnectorConfig";
import type {
  VercelConnectorErrorCode,
  VercelRawAlias,
  VercelRawDeployment,
  VercelRawDomain,
  VercelRawProject,
  VercelReadonlyRawSnapshot,
} from "./vercelConnectorTypes";

const PROJECT_LIMIT = 25;
const DEPLOYMENT_LIMIT = 8;
const DOMAIN_LIMIT = 20;
const ALIAS_LIMIT = 50;

type VercelClientConfig = ReturnType<typeof getVercelConnectorConfig>;

export class VercelReadonlyClientError extends Error {
  code: VercelConnectorErrorCode;
  status: number | null;

  constructor(code: VercelConnectorErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "VercelReadonlyClientError";
    this.code = code;
    this.status = status;
  }
}

function codeForStatus(status: number): VercelConnectorErrorCode {
  if (status === 401) return "VERCEL_401";
  if (status === 403) return "VERCEL_403";
  if (status === 404) return "VERCEL_404";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "VERCEL_5XX";
  return "VERCEL_READ_FAILED";
}

function appendTeamId(url: URL, teamId: string | null) {
  if (teamId) url.searchParams.set("teamId", teamId);
}

async function vercelGet<T>(
  config: VercelClientConfig,
  path: string,
  params: Record<string, string | number | null | undefined> = {},
): Promise<T> {
  if (!config.token) {
    throw new VercelReadonlyClientError(
      "MISSING_VERCEL_TOKEN",
      "Vercel backend token is not configured.",
    );
  }

  const url = new URL(path, `${config.apiBaseUrl}/`);
  appendTeamId(url, config.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
      },
    });
  } catch {
    throw new VercelReadonlyClientError(
      "NETWORK_ERROR",
      "Vercel read-only network request failed.",
    );
  }

  if (!response.ok) {
    throw new VercelReadonlyClientError(
      codeForStatus(response.status),
      `Vercel read-only request failed with status ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export async function readVercelReadonlySnapshot(): Promise<VercelReadonlyRawSnapshot> {
  const config = getVercelConnectorConfig();
  const projectsPayload = await vercelGet<{ projects?: VercelRawProject[] }>(
    config,
    "/v9/projects",
    { limit: PROJECT_LIMIT },
  );
  const projects = (projectsPayload.projects ?? []).slice(0, PROJECT_LIMIT);
  const deploymentsByProject: Record<string, VercelRawDeployment[]> = {};
  const domainsByProject: Record<string, VercelRawDomain[]> = {};

  await Promise.all(
    projects.map(async (project) => {
      const projectId = project.id;
      if (!projectId) return;
      const deploymentsPayload = await vercelGet<{ deployments?: VercelRawDeployment[] }>(
        config,
        `/v9/projects/${encodeURIComponent(projectId)}/deployments`,
        { limit: DEPLOYMENT_LIMIT },
      );
      deploymentsByProject[projectId] = (deploymentsPayload.deployments ?? []).slice(
        0,
        DEPLOYMENT_LIMIT,
      );
    }),
  );

  const deploymentIds = Object.values(deploymentsByProject)
    .flat()
    .map((deployment) => deployment.uid ?? deployment.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, PROJECT_LIMIT);
  await Promise.all(
    deploymentIds.map((deploymentId) =>
      vercelGet<VercelRawDeployment>(
        config,
        `/v9/deployments/${encodeURIComponent(deploymentId)}`,
      ).catch(() => null),
    ),
  );

  await Promise.all(
    projects.map(async (project) => {
      const projectId = project.id;
      if (!projectId) return;
      const domainsPayload = await vercelGet<{ domains?: VercelRawDomain[] }>(
        config,
        `/v9/projects/${encodeURIComponent(projectId)}/domains`,
        { limit: DOMAIN_LIMIT },
      );
      domainsByProject[projectId] = (domainsPayload.domains ?? []).slice(
        0,
        DOMAIN_LIMIT,
      );
    }),
  );

  const aliasesPayload = await vercelGet<{ aliases?: VercelRawAlias[] }>(
    config,
    "/v9/aliases",
    { limit: ALIAS_LIMIT },
  );

  return {
    readAt: new Date().toISOString(),
    projects,
    deploymentsByProject,
    domainsByProject,
    aliases: (aliasesPayload.aliases ?? []).slice(0, ALIAS_LIMIT),
  };
}
