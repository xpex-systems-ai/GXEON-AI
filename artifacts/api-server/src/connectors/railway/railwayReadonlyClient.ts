import { getRailwayConnectorConfig } from "./railwayConnectorConfig";
import type {
  RailwayConnectorErrorCode,
  RailwayConnectorSectionError,
  RailwayGraphQlReadStage,
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
const MAX_SAFE_ERROR_MESSAGE_LENGTH = 500;

const PROJECT_MINIMAL_FIELDS = `
  id
  name
  description
  createdAt
  updatedAt
  environments { edges { node { id name } } }
`;

const SERVICE_MINIMAL_FIELDS = `
  id
  name
  icon
  createdAt
  updatedAt
`;

type RailwayClientConfig = ReturnType<typeof getRailwayConnectorConfig>;

type RailwayGraphQlPayload<T> = {
  data?: T;
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
};

type RailwayPostResult<T> = {
  data: T;
  status: number;
};

export class RailwayReadonlyClientError extends Error {
  code: RailwayConnectorErrorCode;
  status: number | null;
  stage: RailwayGraphQlReadStage;

  constructor(
    code: RailwayConnectorErrorCode,
    message: string,
    status: number | null = null,
    stage: RailwayGraphQlReadStage = "projects",
  ) {
    super(message);
    this.name = "RailwayReadonlyClientError";
    this.code = code;
    this.status = status;
    this.stage = stage;
  }
}

function codeForStatus(status: number): RailwayConnectorErrorCode {
  if (status === 400) return "RAILWAY_GRAPHQL_ERROR";
  if (status === 401) return "RAILWAY_401";
  if (status === 403) return "RAILWAY_403";
  if (status === 404) return "RAILWAY_404";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "RAILWAY_5XX";
  return "RAILWAY_READ_FAILED";
}

function hintForCode(code: RailwayConnectorErrorCode, status: number | null = null): string | null {
  if (status === 400) return "Railway GraphQL query/schema mismatch; update the staged read query for the reported stage.";
  if (code === "MISSING_RAILWAY_TOKEN") return "Add RAILWAY_TOKEN in Railway api-server variables.";
  if (code === "RAILWAY_401") return "Railway token is invalid or expired. Rotate the backend-only token.";
  if (code === "RAILWAY_403") return "Railway token lacks access to this workspace, team, project or environment.";
  if (code === "RAILWAY_404") return "Configured RAILWAY_PROJECT_ID or RAILWAY_ENVIRONMENT_ID was not found for this token.";
  if (code === "RAILWAY_GRAPHQL_ERROR") return "Railway GraphQL returned a read error; verify token scope, configured IDs, and query/schema compatibility.";
  return null;
}

function sanitizeGraphQlMessage(message: string | null | undefined): string | null {
  const trimmed = message?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const redacted = trimmed
    .replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi, "Bearer [REDACTED]")
    .replace(/(RAILWAY_TOKEN\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(Authorization\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/([A-Za-z0-9_]*TOKEN[A-Za-z0-9_]*\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/([A-Za-z0-9_]*SECRET[A-Za-z0-9_]*\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
  return redacted.slice(0, MAX_SAFE_ERROR_MESSAGE_LENGTH);
}

function errorMessageFromPayload(payload: RailwayGraphQlPayload<unknown>): string | null {
  return sanitizeGraphQlMessage(
    payload.errors?.map((error) => error.message).filter(Boolean).join("; "),
  );
}

async function readJsonPayload<T>(response: Response): Promise<RailwayGraphQlPayload<T> | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as RailwayGraphQlPayload<T>;
  } catch {
    return { errors: [{ message: sanitizeGraphQlMessage(text) ?? "Railway returned a non-JSON error body." }] };
  }
}

function toSectionError(error: unknown, fallbackMessage: string): RailwayConnectorSectionError {
  if (error instanceof RailwayReadonlyClientError) {
    return {
      code: error.code,
      message: error.message,
      hint: hintForCode(error.code, error.status),
      status: error.status,
      stage: error.stage,
    };
  }
  return { code: "RAILWAY_READ_FAILED", message: fallbackMessage, hint: null };
}

async function railwayPost<T>(
  config: RailwayClientConfig,
  stage: RailwayGraphQlReadStage,
  query: string,
  variables: Record<string, string | number | boolean | null | undefined> = {},
): Promise<RailwayPostResult<T>> {
  if (!config.token) {
    throw new RailwayReadonlyClientError(
      "MISSING_RAILWAY_TOKEN",
      "Railway backend token is not configured.",
      null,
      stage,
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
      `Railway ${stage} read-only network request failed.`,
      null,
      stage,
    );
  }

  const payload = await readJsonPayload<T>(response);
  const safeMessage = payload ? errorMessageFromPayload(payload) : null;

  if (!response.ok) {
    const code = codeForStatus(response.status);
    throw new RailwayReadonlyClientError(
      code,
      safeMessage ?? `Railway ${stage} read-only request failed with status ${response.status}.`,
      response.status,
      stage,
    );
  }

  if (payload?.errors?.length) {
    throw new RailwayReadonlyClientError(
      "RAILWAY_GRAPHQL_ERROR",
      safeMessage ?? `Railway ${stage} GraphQL read returned errors.`,
      response.status,
      stage,
    );
  }

  if (!payload?.data) {
    throw new RailwayReadonlyClientError(
      "RAILWAY_READ_FAILED",
      `Railway ${stage} GraphQL read returned no data.`,
      response.status,
      stage,
    );
  }

  return { data: payload.data, status: response.status };
}

function unwrapEdges<T>(connection: { edges?: Array<{ node?: T | null }> } | null | undefined): T[] {
  return (connection?.edges ?? []).map((edge) => edge.node).filter(Boolean) as T[];
}

function serviceKey(service: RailwayRawService): string | null {
  return service.id ?? service.name ?? null;
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

function mergeServiceMetadata(services: RailwayRawService[], nextServices: RailwayRawService[]): RailwayRawService[] {
  const byKey = new Map<string, RailwayRawService>();
  services.forEach((service) => {
    const key = serviceKey(service);
    if (key) byKey.set(key, service);
  });
  nextServices.forEach((nextService) => {
    const key = serviceKey(nextService);
    if (!key) return;
    byKey.set(key, { ...byKey.get(key), ...nextService });
  });
  return services.map((service) => {
    const key = serviceKey(service);
    return key ? byKey.get(key) ?? service : service;
  });
}

export async function probeRailwayProjectsRead(): Promise<{
  ok: boolean;
  stage: RailwayGraphQlReadStage | null;
  status: number | null;
  code: RailwayConnectorErrorCode | null;
  safeMessage: string | null;
  projectCount: number | null;
  hint: string | null;
}> {
  const config = getRailwayConnectorConfig();
  try {
    await railwayPost<{ me?: { id?: string | null } }>(
      config,
      "viewer",
      `query RailwayViewerProbe { me { id } }`,
    );
    const { data, status } = await railwayPost<{ projects: { edges?: Array<{ node?: { id?: string } }> } }>(
      config,
      "projects",
      `query RailwayProjectsProbe($first: Int!) { projects(first: $first) { edges { node { id } } } }`,
      { first: 1 },
    );
    return {
      ok: true,
      stage: "projects",
      status,
      code: null,
      safeMessage: null,
      projectCount: data.projects?.edges?.length ?? 0,
      hint: null,
    };
  } catch (error) {
    if (error instanceof RailwayReadonlyClientError) {
      return {
        ok: false,
        stage: error.stage,
        status: error.status,
        code: error.code,
        safeMessage: error.message,
        projectCount: null,
        hint: hintForCode(error.code, error.status),
      };
    }
    return {
      ok: false,
      stage: null,
      status: null,
      code: "RAILWAY_READ_FAILED",
      safeMessage: "Railway diagnostics probe failed.",
      projectCount: null,
      hint: null,
    };
  }
}

export async function readRailwayReadonlySnapshot(): Promise<RailwayReadonlyRawSnapshot> {
  const config = getRailwayConnectorConfig();
  const readAt = new Date().toISOString();
  let viewerName: string | null = null;
  let projects: RailwayRawProject[] = [];
  let selectedProject: RailwayRawProject | null = null;
  let services: RailwayRawService[] = [];
  const sectionErrors: RailwayReadonlyRawSnapshot["sectionErrors"] = {
    viewerError: null,
    projectsError: null,
    servicesError: null,
    deploymentsError: null,
    domainsError: null,
    envPresenceError: null,
  };

  try {
    const { data: viewerData } = await railwayPost<{ me?: { id?: string | null; name?: string | null } }>(
      config,
      "viewer",
      `query RailwayViewerRead { me { id name } }`,
    );
    viewerName = viewerData.me?.name ?? (viewerData.me?.id ? "authorized" : null);
  } catch (error) {
    throw toSectionError(error, "Railway viewer read failed.");
  }

  try {
    const { data } = await railwayPost<{ projects: { edges?: Array<{ node?: RailwayRawProject }> } }>(
      config,
      "projects",
      `query RailwayProjectsRead($first: Int!) { projects(first: $first) { edges { node { id name createdAt updatedAt } } } }`,
      { first: PROJECT_LIMIT },
    );
    projects = unwrapEdges<RailwayRawProject>(data.projects).slice(0, PROJECT_LIMIT);
    selectedProject = projects[0] ?? null;
  } catch (error) {
    throw toSectionError(error, "Railway projects read failed.");
  }

  if (config.projectId) {
    try {
      const { data } = await railwayPost<{ project: RailwayRawProject | null }>(
        config,
        "project",
        `query RailwaySelectedProjectRead($projectId: ID!) { project(id: $projectId) { ${PROJECT_MINIMAL_FIELDS} } }`,
        { projectId: config.projectId },
      );
      selectedProject = data.project;
      projects = data.project ? [data.project] : [];
      if (!data.project) {
        sectionErrors.projectsError = {
          code: "RAILWAY_404",
          message: "Configured Railway project was not found.",
          hint: hintForCode("RAILWAY_404"),
          status: 404,
          stage: "project",
        };
      }
    } catch (error) {
      throw toSectionError(error, "Railway selected project read failed.");
    }
  }

  if (selectedProject?.id) {
    try {
      const { data } = await railwayPost<{ project: { services?: { edges?: Array<{ node?: RailwayRawService }> } } | null }>(
        config,
        "services",
        `query RailwayServicesRead($projectId: ID!, $first: Int!) { project(id: $projectId) { services(first: $first) { edges { node { ${SERVICE_MINIMAL_FIELDS} } } } } }`,
        { projectId: selectedProject.id, first: SERVICE_LIMIT },
      );
      services = unwrapEdges<RailwayRawService>(data.project?.services).slice(0, SERVICE_LIMIT);
    } catch (error) {
      sectionErrors.servicesError = toSectionError(error, "Railway services read failed.");
    }
  }

  if (selectedProject?.id && !sectionErrors.servicesError && services.length > 0) {
    try {
      const { data } = await railwayPost<{ project: { services?: { edges?: Array<{ node?: RailwayRawService }> } } | null }>(
        config,
        "deployments",
        `query RailwayDeploymentsRead($projectId: ID!, $first: Int!, $deploymentFirst: Int!) { project(id: $projectId) { services(first: $first) { edges { node { id deployments(first: $deploymentFirst) { edges { node { id status createdAt updatedAt serviceId } } } } } } } }`,
        { projectId: selectedProject.id, first: SERVICE_LIMIT, deploymentFirst: DEPLOYMENT_LIMIT },
      );
      services = mergeServiceMetadata(
        services,
        unwrapEdges<RailwayRawService>(data.project?.services).slice(0, SERVICE_LIMIT),
      );
    } catch (error) {
      sectionErrors.deploymentsError = toSectionError(error, "Railway deployments read failed.");
    }

    try {
      const { data } = await railwayPost<{ project: { services?: { edges?: Array<{ node?: RailwayRawService }> } } | null }>(
        config,
        "domains",
        `query RailwayDomainsRead($projectId: ID!, $first: Int!) { project(id: $projectId) { services(first: $first) { edges { node { id domains { serviceDomains { id domain targetPort } customDomains { id domain targetPort } } } } } } }`,
        { projectId: selectedProject.id, first: SERVICE_LIMIT },
      );
      services = mergeServiceMetadata(
        services,
        unwrapEdges<RailwayRawService>(data.project?.services).slice(0, SERVICE_LIMIT),
      );
    } catch (error) {
      sectionErrors.domainsError = toSectionError(error, "Railway domains read failed.");
    }
  }

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
