import type {
  VercelConnectorErrorCode,
  VercelReadonlyDeployment,
  VercelReadonlyEvidence,
  VercelReadonlyProject,
  VercelReadonlyRawSnapshot,
  VercelReadonlySnapshot,
} from "./vercelConnectorTypes";

function isoFromMillis(value: number | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeState(value: string | undefined): string {
  return value?.trim().toUpperCase() || "UNKNOWN";
}

function productionUrl(project: {
  targets?: { production?: { alias?: string[]; url?: string } };
}): string | null {
  const alias = project.targets?.production?.alias?.[0];
  const url = project.targets?.production?.url;
  return alias ? `https://${alias}` : url ? `https://${url}` : null;
}

function calculateHealthScore(args: {
  totalProjects: number;
  productionReady: number;
  failedLast24h: number;
  domainsConfigured: number;
  isPartial: boolean;
}): number {
  if (args.totalProjects === 0) return 0;
  const productionScore = (args.productionReady / args.totalProjects) * 55;
  const domainScore = Math.min(args.domainsConfigured / args.totalProjects, 1) * 25;
  const failurePenalty = Math.min(args.failedLast24h * 10, 40);
  const partialPenalty = args.isPartial ? 15 : 0;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(productionScore + domainScore + 20 - failurePenalty - partialPenalty),
    ),
  );
}

function sortEvidence(evidence: VercelReadonlyEvidence[]): VercelReadonlyEvidence[] {
  return evidence
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 16);
}

function firstSectionError(
  errors: VercelReadonlyRawSnapshot["sectionErrors"],
): VercelConnectorErrorCode {
  return (
    errors.projectsError?.code ??
    errors.deploymentsError?.code ??
    errors.domainsError?.code ??
    errors.aliasesError?.code ??
    "NONE"
  );
}

export function normalizeVercelReadonlySnapshot(
  raw: VercelReadonlyRawSnapshot,
): VercelReadonlySnapshot {
  const latestDeployments: VercelReadonlyDeployment[] = Object.entries(
    raw.deploymentsByProject,
  )
    .flatMap(([projectId, deployments]) =>
      deployments.map((deployment) => ({
        id: deployment.uid ?? deployment.id ?? deployment.url ?? "unknown",
        projectId,
        name: deployment.name ?? "unknown",
        url: deployment.url ? `https://${deployment.url}` : null,
        state: normalizeState(deployment.state ?? deployment.readyState),
        target: deployment.target ?? null,
        createdAt: isoFromMillis(deployment.createdAt),
      })),
    )
    .sort((a, b) => Date.parse(b.createdAt ?? "0") - Date.parse(a.createdAt ?? "0"))
    .slice(0, 20);

  const latestDeploymentByProject = new Map<string, VercelReadonlyDeployment>();
  for (const deployment of latestDeployments) {
    if (!latestDeploymentByProject.has(deployment.projectId)) {
      latestDeploymentByProject.set(deployment.projectId, deployment);
    }
  }

  const projects: VercelReadonlyProject[] = raw.projects.map((project) => {
    const id = project.id ?? project.name ?? "unknown";
    return {
      id,
      name: project.name ?? "unknown",
      framework: project.framework ?? null,
      productionUrl: productionUrl(project),
      latestDeploymentState: latestDeploymentByProject.get(id)?.state ?? "UNKNOWN",
      lastReadAt: raw.readAt,
    };
  });

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const failedLast24h = latestDeployments.filter((deployment) => {
    const createdAt = deployment.createdAt ? Date.parse(deployment.createdAt) : 0;
    return (
      createdAt >= oneDayAgo &&
      ["ERROR", "CANCELED", "FAILED"].includes(deployment.state)
    );
  }).length;
  const productionReady = latestDeployments.filter(
    (deployment) => deployment.target === "production" && deployment.state === "READY",
  ).length;
  const domainsConfigured = Object.values(raw.domainsByProject).flat().length;
  const previewCount = latestDeployments.filter(
    (deployment) => deployment.target === "preview",
  ).length;
  const isPartial = Boolean(
    raw.sectionErrors.deploymentsError ||
      raw.sectionErrors.domainsError ||
      raw.sectionErrors.aliasesError,
  );
  const healthScore = calculateHealthScore({
    totalProjects: projects.length,
    productionReady,
    failedLast24h,
    domainsConfigured,
    isPartial,
  });
  const lastErrorCode = firstSectionError(raw.sectionErrors);

  const evidenceTimeline = sortEvidence([
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      type: "PROJECT" as const,
      title: project.name,
      description: `Project read with latest deployment ${project.latestDeploymentState}`,
      occurredAt: project.lastReadAt,
      source: "Vercel read-only projects endpoint",
    })),
    ...latestDeployments.map((deployment) => ({
      id: `deployment-${deployment.id}`,
      type: "DEPLOYMENT" as const,
      title: `${deployment.name} ${deployment.state}`,
      description: `${deployment.target ?? "unknown"} deployment read without mutation`,
      occurredAt: deployment.createdAt ?? raw.readAt,
      source: "Vercel read-only deployments endpoint",
    })),
    ...Object.entries(raw.sectionErrors)
      .filter(([, error]) => Boolean(error))
      .map(([section, error]) => ({
        id: `section-error-${section}`,
        type: "HEALTH" as const,
        title: `${section} partial read warning`,
        description: error?.hint ?? error?.message ?? "Vercel section read failed.",
        occurredAt: raw.readAt,
        source: "Vercel read-only partial snapshot boundary",
      })),
  ]);

  return {
    provider: "vercel",
    status: isPartial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
    statusLabel: isPartial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
    configured: true,
    lastErrorCode,
    projectsError: raw.sectionErrors.projectsError,
    deploymentsError: raw.sectionErrors.deploymentsError,
    domainsError: raw.sectionErrors.domainsError,
    aliasesError: raw.sectionErrors.aliasesError,
    totalProjects: projects.length,
    productionReady,
    failedLast24h,
    domainsConfigured,
    previewCount,
    projects,
    latestDeployments,
    evidenceTimeline,
    health: {
      connectorGateway: "READY",
      vercelConnector: isPartial ? "PARTIAL_READONLY" : "CONNECTED_READONLY",
      healthScore,
      lastSyncAt: raw.readAt,
      lastErrorCode,
      frontendTokenStorage: false,
      providerWrites: false,
      secretExposure: false,
    },
  };
}

export function createVercelReadonlyReadySnapshot(
  errorCode: VercelConnectorErrorCode = "MISSING_VERCEL_TOKEN",
): VercelReadonlySnapshot {
  const now = new Date().toISOString();
  return {
    provider: "vercel",
    status: "READY",
    statusLabel: "READY_FOR_BACKEND_TOKEN",
    configured: false,
    lastErrorCode: errorCode,
    projectsError: null,
    deploymentsError: null,
    domainsError: null,
    aliasesError: null,
    totalProjects: 0,
    productionReady: 0,
    failedLast24h: 0,
    domainsConfigured: 0,
    previewCount: 0,
    projects: [],
    latestDeployments: [],
    evidenceTimeline: [
      {
        id: "vercel-p0-backend-ready",
        type: "HEALTH",
        title: "Vercel P0 read-only backend route ready",
        description: "Waiting for VERCEL_TOKEN in Railway api-server variables.",
        occurredAt: now,
        source: "GXEON_VERCEL_CONNECTOR_P0_READONLY",
      },
    ],
    health: {
      connectorGateway: "READY",
      vercelConnector: "READY_FOR_CONNECTION",
      healthScore: 0,
      lastSyncAt: null,
      lastErrorCode: errorCode,
      frontendTokenStorage: false,
      providerWrites: false,
      secretExposure: false,
    },
  };
}

export function createVercelReadonlyFailedSnapshot(
  reason: string,
  errorCode: VercelConnectorErrorCode = "VERCEL_READ_FAILED",
): VercelReadonlySnapshot {
  const snapshot = createVercelReadonlyReadySnapshot(errorCode);
  return {
    ...snapshot,
    status: "FAILED",
    statusLabel: "FAILED_READONLY_SNAPSHOT",
    configured: true,
    projectsError: {
      code: errorCode,
      message: reason,
      hint:
        errorCode === "VERCEL_404"
          ? "Vercel API route/team/project mismatch. If the project belongs to a Vercel team, add VERCEL_TEAM_ID in Railway."
          : null,
    },
    evidenceTimeline: [
      {
        id: "vercel-p0-read-failed",
        type: "HEALTH",
        title: "Vercel read-only projects read failed",
        description: reason,
        occurredAt: new Date().toISOString(),
        source: "Vercel read-only fail-closed boundary",
      },
    ],
    health: {
      ...snapshot.health,
      vercelConnector: "FAILED",
      lastErrorCode: errorCode,
    },
  };
}
