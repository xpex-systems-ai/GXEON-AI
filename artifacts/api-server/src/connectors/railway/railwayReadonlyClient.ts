import { getRailwayConnectorConfig } from "./railwayConnectorConfig";
import type {
  RailwayConnectorErrorCode,
  RailwayConnectorSectionError,
  RailwayRawDeployment,
  RailwayRawDomain,
  RailwayRawProject,
  RailwayRawService,
  RailwayReadonlyRawSnapshot,
} from "./railwayConnectorTypes";

const PROJECT_LIMIT = 25;
const SERVICE_LIMIT = 50;
const DEPLOYMENT_LIMIT = 20;
const DOMAIN_LIMIT = 20;

const PROJECT_FIELDS = `
  id
  name
  description
  createdAt
  updatedAt
  services(first: ${SERVICE_LIMIT}) {
    edges {
      node {
        id
        name
        icon
        createdAt
        updatedAt
        deployments(first: ${DEPLOYMENT_LIMIT}) {
          edges {
            node { id status createdAt updatedAt serviceId }
          }
        }
        domains {
          serviceDomains { id domain targetPort }
          customDomains { id domain targetPort }
        }
      }
    }
  }
  environments { edges { node { id name } } }
`;

type RailwayClientConfig = ReturnType<typeof getRailwayConnectorConfig>;

type RailwayGraphQlPayload<T> = {
  data?: T;
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
};

export class RailwayReadonlyClientError extends Error {
  code: RailwayConnectorErrorCode;
  status: number | null;

  constructor(
    code: RailwayConnectorErrorCode,
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "RailwayReadonlyClientError";
    this.code = code;
    this.status = status;
  }
}

function codeForStatus(status: number): RailwayConnectorErrorCode {
  if (status === 401) return "RAILWAY_401";
  if (status === 403) return "RAILWAY_403";
  if (status === 404) return "RAILWAY_404";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "RAILWAY_5XX";
  return "RAILWAY_READ_FAILED";
}

function hintForCode(code: RailwayConnectorErrorCode): string | null {
  if (code === "MISSING_RAILWAY_TOKEN") return "Add RAILWAY_TOKEN in Railway api-server variables.";
  if (code === "RAILWAY_401") return "Railway token is invalid or expired. Rotate the backend-only token.";
  if (code === "RAILWAY_403") return "Railway token lacks access to this workspace, team, project or environment.";
  if (code === "RAILWAY_404") return "Configured RAILWAY_PROJECT_ID or RAILWAY_ENVIRONMENT_ID was not found for this token.";
  if (code === "RAILWAY_GRAPHQL_ERROR") return "Railway GraphQL returned a read error; verify token scope and configured IDs.";
  return null;
}

function toSectionError(error: unknown, fallbackMessage: string): RailwayConnectorSectionError {
  if (error instanceof RailwayReadonlyClientError) {
    return { code: error.code, message: error.message, hint: hintForCode(error.code) };
  }
  return { code: "RAILWAY_READ_FAILED", message: fallbackMessage, hint: null };
}

async function railwayPost<T>(
  config: RailwayClientConfig,
  query: string,
  variables: Record<string, string | number | boolean | null | undefined> = {},
): Promise<T> {
  if (!config.token) {
    throw new RailwayReadonlyClientError(
      "MISSING_RAILWAY_TOKEN",
      "Railway backend token is not configured.",
    );
  }

  let response: Response;
  try {
    response = await fetch(config.apiBaseUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new RailwayReadonlyClientError(
      "NETWORK_ERROR",
      "Railway read-only network request failed.",
    );
  }

  if (!response.ok) {
    throw new RailwayReadonlyClientError(
      codeForStatus(response.status),
      `Railway read-only request failed with status ${response.status}.`,
      response.status,
    );
  }

  const payload = (await response.json()) as RailwayGraphQlPayload<T>;
  if (payload.errors?.length) {
    const text = payload.errors.map((error) => error.message).filter(Boolean).join("; ");
    throw new RailwayReadonlyClientError(
      "RAILWAY_GRAPHQL_ERROR",
      text || "Railway GraphQL read returned errors.",
      response.status,
    );
  }

  if (!payload.data) {
    throw new RailwayReadonlyClientError(
      "RAILWAY_READ_FAILED",
      "Railway GraphQL read returned no data.",
      response.status,
    );
  }

  return payload.data;
}

function unwrapEdges<T>(connection: { edges?: Array<{ node?: T | null }> } | null | undefined): T[] {
  return (connection?.edges ?? []).map((edge) => edge.node).filter(Boolean) as T[];
}

function serviceKey(service: RailwayRawService): string | null {
  return service.id ?? service.name ?? null;
}

function collectServices(project: RailwayRawProject | null): RailwayRawService[] {
  return unwrapEdges<RailwayRawService>(project?.services).slice(0, SERVICE_LIMIT);
}

function collectDeployments(service: RailwayRawService): RailwayRawDeployment[] {
  return unwrapEdges<RailwayRawDeployment>(service.deployments).slice(0, DEPLOYMENT_LIMIT);
}

function collectDomains(service: RailwayRawService): RailwayRawDomain[] {
  return [
    ...(service.domains?.serviceDomains ?? []),
    ...(service.domains?.customDomains ?? []),
  ].slice(0, DOMAIN_LIMIT);
}

export async function probeRailwayProjectsRead(): Promise<{
  ok: boolean;
  status: number | null;
  code: RailwayConnectorErrorCode | null;
  projectCount: number | null;
  hint: string | null;
}> {
  const config = getRailwayConnectorConfig();
  try {
    if (config.projectId) {
      await railwayPost<{ project: { id?: string } | null }>(
        config,
        `query RailwayProjectProbe($projectId: ID!) { project(id: $projectId) { id } }`,
        { projectId: config.projectId },
      );
      return { ok: true, status: 200, code: null, projectCount: 1, hint: null };
    }
    const data = await railwayPost<{ projects: { edges?: Array<{ node?: { id?: string } }> } }>(
      config,
      `query RailwayProjectsProbe($first: Int!) { projects(first: $first) { edges { node { id } } } }`,
      { first: 1 },
    );
    return {
      ok: true,
      status: 200,
      code: null,
      projectCount: data.projects?.edges?.length ?? 0,
      hint: null,
    };
  } catch (error) {
    if (error instanceof RailwayReadonlyClientError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        projectCount: null,
        hint: hintForCode(error.code),
      };
    }
    return { ok: false, status: null, code: "RAILWAY_READ_FAILED", projectCount: null, hint: null };
  }
}

export async function readRailwayReadonlySnapshot(): Promise<RailwayReadonlyRawSnapshot> {
  const config = getRailwayConnectorConfig();
  const readAt = new Date().toISOString();
  let viewerName: string | null = null;
  let viewerError: RailwayConnectorSectionError | null = null;
  let projects: RailwayRawProject[] = [];
  let selectedProject: RailwayRawProject | null = null;
  const sectionErrors: RailwayReadonlyRawSnapshot["sectionErrors"] = {
    viewerError: null,
    projectsError: null,
    servicesError: null,
    deploymentsError: null,
    domainsError: null,
    envPresenceError: null,
  };

  try {
    const viewerData = await railwayPost<{ me?: { id?: string | null; name?: string | null } }>(
      config,
      `query RailwayViewerRead { me { id name } }`,
    );
    viewerName = viewerData.me?.name ?? (viewerData.me?.id ? "authorized" : null);
  } catch (error) {
    viewerError = toSectionError(error, "Railway viewer read failed.");
  }
  sectionErrors.viewerError = viewerError;

  try {
    if (config.projectId) {
      const data = await railwayPost<{ project: RailwayRawProject | null }>(
        config,
        `query RailwaySelectedProjectRead($projectId: ID!) { project(id: $projectId) { ${PROJECT_FIELDS} } }`,
        { projectId: config.projectId },
      );
      selectedProject = data.project;
      projects = data.project ? [data.project] : [];
      if (!data.project) {
        sectionErrors.projectsError = {
          code: "RAILWAY_404",
          message: "Configured Railway project was not found.",
          hint: hintForCode("RAILWAY_404"),
        };
      }
    } else {
      const data = await railwayPost<{ projects: { edges?: Array<{ node?: RailwayRawProject }> } }>(
        config,
        `query RailwayProjectsRead($first: Int!) { projects(first: $first) { edges { node { ${PROJECT_FIELDS} } } } }`,
        { first: PROJECT_LIMIT },
      );
      projects = unwrapEdges<RailwayRawProject>(data.projects).slice(0, PROJECT_LIMIT);
      selectedProject = projects[0] ?? null;
    }
  } catch (error) {
    throw toSectionError(error, "Railway projects read failed.");
  }

  const services = collectServices(selectedProject);
  const deploymentsByService: Record<string, RailwayRawDeployment[]> = {};
  const domainsByService: Record<string, RailwayRawDomain[]> = {};
  const variableNamesByService: Record<string, string[]> = {};

  services.forEach((service) => {
    const key = serviceKey(service);
    if (!key) return;
    deploymentsByService[key] = collectDeployments(service);
    domainsByService[key] = collectDomains(service);
    variableNamesByService[key] = [];
  });

  return {
    readAt,
    selectedProjectConfigured: config.projectIdPresent,
    viewerName,
    projects,
    selectedProject,
    services,
    deploymentsByService,
    domainsByService,
    variableNamesByService,
    sectionErrors,
  };
}
