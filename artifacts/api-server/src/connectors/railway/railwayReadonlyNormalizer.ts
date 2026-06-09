import type {
  RailwayConnectorErrorCode,
  RailwayConnectorSectionError,
  RailwayRawDeployment,
  RailwayReadonlyDeployment,
  RailwayReadonlyEvidence,
  RailwayReadonlyProject,
  RailwayReadonlyRawSnapshot,
  RailwayReadonlyService,
  RailwayReadonlySnapshot,
} from "./railwayConnectorTypes";

function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter(Boolean) as T[];
}

function firstError(raw: RailwayReadonlyRawSnapshot): RailwayConnectorSectionError | null {
  return (
    raw.sectionErrors.projectsError ??
    raw.sectionErrors.servicesError ??
    raw.sectionErrors.deploymentsError ??
    raw.sectionErrors.domainsError ??
    raw.sectionErrors.envPresenceError ??
    raw.sectionErrors.viewerError
  );
}


function hintForError(error: RailwayConnectorSectionError | null): string | null {
  if (error?.status === 400) return "Railway GraphQL query/schema mismatch.";
  return error?.hint ?? null;
}

function isFailureStatus(status: string): boolean {
  return /fail|crash|error|remov/i.test(status);
}

function isRunningStatus(status: string): boolean {
  return /success|active|running|deployed|complete/i.test(status);
}

function deploymentTime(deployment: RailwayRawDeployment): number {
  return Date.parse(deployment.updatedAt ?? deployment.createdAt ?? "") || 0;
}

function latestDeployment(deployments: RailwayRawDeployment[]): RailwayRawDeployment | null {
  return [...deployments].sort((a, b) => deploymentTime(b) - deploymentTime(a))[0] ?? null;
}

function deploymentStatus(deployment: RailwayRawDeployment | null): string {
  return deployment?.status?.toUpperCase() || "UNKNOWN";
}

function serviceStatus(deployment: RailwayRawDeployment | null): string {
  const status = deploymentStatus(deployment);
  if (isFailureStatus(status)) return "FAILED";
  if (isRunningStatus(status)) return "RUNNING";
  return status;
}

function normalizeProject(project: RailwayReadonlyRawSnapshot["selectedProject"]): RailwayReadonlyProject | null {
  if (!project?.id && !project?.name) return null;
  return {
    id: project.id ?? project.name ?? "railway-project",
    name: project.name ?? project.id ?? "Railway project",
    updatedAt: project.updatedAt ?? project.createdAt ?? null,
  };
}

function calculateHealthScore(input: {
  projectCount: number;
  serviceCount: number;
  failedDeployments: number;
  runningServices: number;
  partial: boolean;
}): number {
  let score = 100;
  if (input.projectCount === 0) score -= 35;
  if (input.serviceCount === 0) score -= 20;
  if (input.serviceCount > 0) {
    const nonRunning = input.serviceCount - input.runningServices;
    score -= Math.min(35, nonRunning * 8);
  }
  score -= Math.min(35, input.failedDeployments * 10);
  if (input.partial) score -= 15;
  return Math.max(0, Math.min(100, score));
}

export function normalizeRailwayReadonlySnapshot(
  raw: RailwayReadonlyRawSnapshot,
): RailwayReadonlySnapshot {
  const projects = raw.projects.filter((project) => project.id || project.name);
  const deployments = Object.entries(raw.deploymentsByService).flatMap(([serviceId, values]) =>
    values.map((deployment): RailwayReadonlyDeployment => ({
      id: deployment.id ?? `${serviceId}-${deployment.createdAt ?? "deployment"}`,
      serviceId,
      status: deployment.status?.toUpperCase() || "UNKNOWN",
      createdAt: deployment.createdAt ?? null,
      updatedAt: deployment.updatedAt ?? null,
    })),
  );
  const failedDeployments = deployments.filter((deployment) => isFailureStatus(deployment.status)).length;
  const services = raw.services
    .filter((service) => service.id || service.name)
    .map((service): RailwayReadonlyService => {
      const serviceId = service.id ?? service.name ?? "railway-service";
      const serviceDeployments = raw.deploymentsByService[serviceId] ?? [];
      const latest = latestDeployment(serviceDeployments);
      const domains = raw.domainsByService[serviceId] ?? [];
      const publicDomain = domains.find((domain) => domain.domain)?.domain ?? null;
      return {
        id: serviceId,
        name: service.name ?? serviceId,
        status: serviceStatus(latest),
        latestDeploymentStatus: deploymentStatus(latest),
        domainCount: domains.length,
        publicUrl: publicDomain ? `https://${publicDomain}` : null,
        updatedAt: service.updatedAt ?? service.createdAt ?? latest?.updatedAt ?? null,
      };
    });
  const runningServices = services.filter((service) => service.status === "RUNNING").length;
  const domainCount = Object.values(raw.domainsByService).flat().length;
  const partial = Object.values(raw.sectionErrors).some(Boolean);
  const error = firstError(raw);
  const lastErrorCode: RailwayConnectorErrorCode = error?.code ?? "NONE";
  const healthScore = calculateHealthScore({
    projectCount: projects.length,
    serviceCount: services.length,
    failedDeployments,
    runningServices,
    partial,
  });
  const evidenceTimeline: RailwayReadonlyEvidence[] = compact([
    normalizeProject(raw.selectedProject)
      ? {
          id: `project-${normalizeProject(raw.selectedProject)?.id}`,
          type: "PROJECT" as const,
          title: normalizeProject(raw.selectedProject)?.name ?? "Railway project",
          description: raw.selectedProjectConfigured
            ? "Configured Railway project read through backend-only connector."
            : "Railway project discovered through backend-only connector.",
          occurredAt: raw.readAt,
          source: "Railway GraphQL read-only project query",
        }
      : null,
    ...services.slice(0, 10).map((service) => ({
      id: `service-${service.id}`,
      type: "SERVICE" as const,
      title: service.name,
      description: `Service ${service.status} with latest deployment ${service.latestDeploymentStatus}`,
      occurredAt: service.updatedAt ?? raw.readAt,
      source: "Railway GraphQL read-only service query",
    })),
    ...deployments.slice(0, 10).map((deployment) => ({
      id: `deployment-${deployment.id}`,
      type: "DEPLOYMENT" as const,
      title: `Deployment ${deployment.status}`,
      description: "Deployment metadata read without build output or commands.",
      occurredAt: deployment.updatedAt ?? deployment.createdAt ?? raw.readAt,
      source: "Railway GraphQL read-only deployment query",
    })),
    ...Object.entries(raw.sectionErrors)
      .filter(([, value]) => Boolean(value))
      .map(([section, sectionError]) => ({
        id: `section-error-${section}`,
        type: "HEALTH" as const,
        title: `${section} partial read warning`,
        description: hintForError(sectionError ?? null) ?? sectionError?.message ?? "Railway section read failed.",
        occurredAt: raw.readAt,
        source: "Railway fail-closed read boundary",
      })),
  ]);

  return {
    provider: "railway",
    status: partial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
    statusLabel: partial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
    configured: true,
    lastErrorCode,
    viewerError: raw.sectionErrors.viewerError,
    projectsError: raw.sectionErrors.projectsError,
    servicesError: raw.sectionErrors.servicesError,
    deploymentsError: raw.sectionErrors.deploymentsError,
    domainsError: raw.sectionErrors.domainsError,
    envPresenceError: raw.sectionErrors.envPresenceError,
    projectCount: projects.length,
    serviceCount: services.length,
    deploymentCount: deployments.length,
    failedDeployments,
    runningServices,
    domainCount,
    selectedProject: normalizeProject(raw.selectedProject),
    services,
    deployments,
    evidenceTimeline,
    health: {
      connectorGateway: "READY",
      railwayConnector: partial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
      healthScore,
      lastSyncAt: raw.readAt,
      lastErrorCode,
      frontendTokenStorage: false,
      providerWrites: false,
      secretExposure: false,
      commandExecution: false,
    },
  };
}

export function createRailwayReadonlyReadySnapshot(
  errorCode: RailwayConnectorErrorCode = "MISSING_RAILWAY_TOKEN",
): RailwayReadonlySnapshot {
  const now = new Date().toISOString();
  return {
    provider: "railway",
    status: "READY",
    statusLabel: "READY_FOR_BACKEND_READONLY_CONNECTION",
    configured: false,
    lastErrorCode: errorCode,
    viewerError: null,
    projectsError: null,
    servicesError: null,
    deploymentsError: null,
    domainsError: null,
    envPresenceError: null,
    projectCount: 0,
    serviceCount: 0,
    deploymentCount: 0,
    failedDeployments: 0,
    runningServices: 0,
    domainCount: 0,
    selectedProject: null,
    services: [],
    deployments: [],
    evidenceTimeline: [
      {
        id: "railway-p0-backend-ready",
        type: "HEALTH",
        title: "Railway P0 read-only backend route ready",
        description: "Waiting for RAILWAY_TOKEN in Railway api-server variables.",
        occurredAt: now,
        source: "GXEON_RAILWAY_CONNECTOR_P0_READONLY",
      },
    ],
    health: {
      connectorGateway: "READY",
      railwayConnector: "READY_FOR_CONNECTION",
      healthScore: 0,
      lastSyncAt: null,
      lastErrorCode: errorCode,
      frontendTokenStorage: false,
      providerWrites: false,
      secretExposure: false,
      commandExecution: false,
    },
  };
}

export function createRailwayReadonlyFailedSnapshot(
  reason: string,
  errorCode: RailwayConnectorErrorCode = "RAILWAY_READ_FAILED",
): RailwayReadonlySnapshot {
  const snapshot = createRailwayReadonlyReadySnapshot(errorCode);
  return {
    ...snapshot,
    status: "FAILED",
    statusLabel: "FAILED_READONLY_SNAPSHOT",
    configured: true,
    projectsError: {
      code: errorCode,
      message: reason,
      hint:
        errorCode === "RAILWAY_404"
          ? "Configured Railway project or environment was not found for this backend token."
          : errorCode === "RAILWAY_GRAPHQL_ERROR"
            ? "Railway GraphQL query/schema mismatch."
            : null,
    },
    evidenceTimeline: [
      {
        id: "railway-p0-read-failed",
        type: "HEALTH",
        title: "Railway read-only snapshot failed",
        description: reason,
        occurredAt: new Date().toISOString(),
        source: "Railway fail-closed connector boundary",
      },
    ],
    health: {
      ...snapshot.health,
      railwayConnector: "FAILED",
      lastErrorCode: errorCode,
    },
  };
}
