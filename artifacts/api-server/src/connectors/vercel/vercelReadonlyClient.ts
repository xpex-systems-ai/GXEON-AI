import { getVercelConnectorConfig } from "./vercelConnectorConfig";
import type {
  VercelConnectorErrorCode,
  VercelConnectorSectionError,
  VercelRawAlias,
  VercelRawDeployment,
  VercelRawDomain,
  VercelRawProject,
  VercelReadonlyRawSnapshot,
} from "./vercelConnectorTypes";

const PROJECT_LIMIT = 25;
const DEPLOYMENT_LIMIT = 20;
const DEPLOYMENT_LIMIT = 8;
const DOMAIN_LIMIT = 20;
const ALIAS_LIMIT = 50;

type VercelClientConfig = ReturnType<typeof getVercelConnectorConfig>;

export class VercelReadonlyClientError extends Error {
  code: VercelConnectorErrorCode;
  status: number | null;

  constructor(
    code: VercelConnectorErrorCode,
    message: string,
    status: number | null = null,
  ) {
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

function safeHint(
  code: VercelConnectorErrorCode,
  config: Pick<VercelClientConfig, "teamIdPresent" | "teamId">,
): string | null {
  if (code === "VERCEL_404" && !config.teamId) {
    return "Vercel API route/team/project mismatch. If the project belongs to a Vercel team, add VERCEL_TEAM_ID in Railway.";
  }
  if (code === "VERCEL_403") {
    return "Vercel token is valid but has insufficient scope for this read-only endpoint.";
  }
  if (code === "VERCEL_401") {
    return "Vercel token is invalid or expired. Rotate VERCEL_TOKEN in Railway.";
  }
  return null;
}

function toSectionError(
  error: unknown,
  fallbackMessage: string,
  config: Pick<VercelClientConfig, "teamIdPresent" | "teamId">,
): VercelConnectorSectionError {
  if (error instanceof VercelReadonlyClientError) {
    return {
      code: error.code,
      message: error.message,
      hint: safeHint(error.code, config),
    };
  }
  return {
    code: "VERCEL_READ_FAILED",
    message: fallbackMessage,
    hint: null,
  };
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
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
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

function projectKey(project: VercelRawProject): string | null {
  return project.id ?? project.name ?? null;
}

function mergeDeployments(
  generalDeployments: VercelRawDeployment[],
  productionDeployments: VercelRawDeployment[],
): VercelRawDeployment[] {
  const seen = new Set<string>();
  return [...productionDeployments, ...generalDeployments].filter((deployment) => {
    const key = deployment.uid ?? deployment.id ?? deployment.url ?? Math.random().toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function probeVercelProjectsRead(): Promise<{
  ok: boolean;
  status: number | null;
  code: VercelConnectorErrorCode | null;
  projectCount: number | null;
  hint: string | null;
}> {
  const config = getVercelConnectorConfig();
  try {
    const payload = await vercelGet<{ projects?: VercelRawProject[] }>(
      config,
      "/v9/projects",
      { limit: 1 },
    );
    return {
      ok: true,
      status: 200,
      code: null,
      projectCount: payload.projects?.length ?? 0,
      hint: null,
    };
  } catch (error) {
    if (error instanceof VercelReadonlyClientError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        projectCount: null,
        hint: safeHint(error.code, config),
      };
    }
    return {
      ok: false,
      status: null,
      code: "VERCEL_READ_FAILED",
      projectCount: null,
      hint: null,
    };
  }
}

export async function readVercelReadonlySnapshot(): Promise<VercelReadonlyRawSnapshot> {
  const config = getVercelConnectorConfig();
  let projects: VercelRawProject[];
  try {
    const projectsPayload = await vercelGet<{ projects?: VercelRawProject[] }>(
      config,
      "/v9/projects",
      { limit: PROJECT_LIMIT },
    );
    projects = (projectsPayload.projects ?? []).slice(0, PROJECT_LIMIT);
  } catch (error) {
    throw toSectionError(error, "Vercel projects read failed.", config);
  }

  const deploymentsByProject: Record<string, VercelRawDeployment[]> = {};
  const productionDeploymentsByProject: Record<string, VercelRawDeployment[]> = {};
  const domainsByProject: Record<string, VercelRawDomain[]> = {};
  const aliasesByProject: Record<string, VercelRawAlias[]> = {};
  const sectionErrors: VercelReadonlyRawSnapshot["sectionErrors"] = {
    projectsError: null,
    deploymentsError: null,
    domainsError: null,
    aliasesError: null,
  };

  await Promise.all(
    projects.map(async (project) => {
      const id = projectKey(project);
      if (!id) return;
      try {
        const [deploymentsPayload, productionPayload] = await Promise.all([
          vercelGet<{ deployments?: VercelRawDeployment[] }>(
            config,
            "/v6/deployments",
            { projectId: id, limit: DEPLOYMENT_LIMIT },
          ),
          vercelGet<{ deployments?: VercelRawDeployment[] }>(
            config,
            "/v6/deployments",
            { projectId: id, target: "production", limit: 1 },
          ),
        ]);
        const deployments = (deploymentsPayload.deployments ?? []).slice(
          0,
          DEPLOYMENT_LIMIT,
        );
        const productionDeployments = (productionPayload.deployments ?? []).slice(
          0,
          1,
        );
        deploymentsByProject[id] = mergeDeployments(
          deployments,
          productionDeployments,
        ).slice(0, DEPLOYMENT_LIMIT);
        productionDeploymentsByProject[id] = productionDeployments;
      } catch (error) {
        deploymentsByProject[id] = [];
        productionDeploymentsByProject[id] = [];
        sectionErrors.deploymentsError ??= toSectionError(
          error,
          "Vercel deployments read failed for at least one project.",
          config,
        );
      }
    }),
  );

  await Promise.all(
    projects.map(async (project) => {
      const id = projectKey(project);
      if (!id) return;
      try {
        const domainsPayload = await vercelGet<{ domains?: VercelRawDomain[] }>(
          config,
          `/v9/projects/${encodeURIComponent(id)}/domains`,
          { limit: DOMAIN_LIMIT },
        );
        domainsByProject[id] = (domainsPayload.domains ?? []).slice(
          0,
          DOMAIN_LIMIT,
        );
      } catch (error) {
        domainsByProject[id] = [];
        sectionErrors.domainsError ??= toSectionError(
          error,
          "Vercel domains read failed for at least one project.",
          config,
        );
      }
    }),
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
      const id = projectKey(project);
      if (!id) return;
      try {
        const aliasesPayload = await vercelGet<{ aliases?: VercelRawAlias[] }>(
          config,
          "/v4/aliases",
          { projectId: id, limit: ALIAS_LIMIT },
        );
        aliasesByProject[id] = (aliasesPayload.aliases ?? []).slice(
          0,
          ALIAS_LIMIT,
        );
      } catch (error) {
        aliasesByProject[id] = [];
        sectionErrors.aliasesError ??= toSectionError(
          error,
          "Vercel aliases read failed for at least one project.",
          config,
        );
      }
    }),
  );

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
    productionDeploymentsByProject,
    domainsByProject,
    aliasesByProject,
    sectionErrors,
    domainsByProject,
    aliases: (aliasesPayload.aliases ?? []).slice(0, ALIAS_LIMIT),
  };
}
