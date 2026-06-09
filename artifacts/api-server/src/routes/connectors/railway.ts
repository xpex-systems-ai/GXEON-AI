import { Router } from "express";
import {
  getRailwayConnectorConfig,
  toRailwayConnectorDiagnostics,
} from "../../connectors/railway/railwayConnectorConfig";
import {
  getRailwayConnectorActivity,
  recordRailwayConnectorActivity,
} from "../../connectors/railway/railwayConnectorActivityLog";
import {
  probeRailwayProjectsRead,
  readRailwayReadonlySnapshot,
  RailwayReadonlyClientError,
} from "../../connectors/railway/railwayReadonlyClient";
import {
  createRailwayReadonlyFailedSnapshot,
  createRailwayReadonlyReadySnapshot,
  normalizeRailwayReadonlySnapshot,
} from "../../connectors/railway/railwayReadonlyNormalizer";
import type {
  RailwayConnectorErrorCode,
  RailwayConnectorSectionError,
} from "../../connectors/railway/railwayConnectorTypes";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

function isSectionError(error: unknown): error is RailwayConnectorSectionError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

function safeDiagnosticHint(code: RailwayConnectorErrorCode | null): string | null {
  if (code === "MISSING_RAILWAY_TOKEN") return "Add RAILWAY_TOKEN in Railway api-server variables.";
  if (code === "RAILWAY_404") return "Verify RAILWAY_PROJECT_ID and RAILWAY_ENVIRONMENT_ID.";
  if (code === "RAILWAY_403") return "Railway token cannot read the configured project or team.";
  if (code === "RAILWAY_401") return "Railway token is invalid or expired.";
  if (code === "RAILWAY_GRAPHQL_ERROR") return "Railway GraphQL read failed; verify token scope and configured IDs.";
  return null;
}

router.get("/connectors/railway/diagnostics", async (_req, res) => {
  const config = getRailwayConnectorConfig();
  const probe = config.configured ? await probeRailwayProjectsRead() : null;
  const diagnostics = toRailwayConnectorDiagnostics(
    probe
      ? {
          attempted: true,
          ok: probe.ok,
          status: probe.status,
          code: probe.code,
          projectCount: probe.projectCount,
          hint: probe.hint ?? safeDiagnosticHint(probe.code),
        }
      : {
          attempted: false,
          ok: false,
          status: null,
          code: config.missing[0] ?? null,
          projectCount: null,
          hint: config.configured ? null : "Add RAILWAY_TOKEN in Railway api-server variables.",
        },
  );
  recordRailwayConnectorActivity({
    eventType: "diagnostics_checked",
    status: probe?.ok || !config.configured ? "success" : "failed",
    code: probe?.code,
    metadata: {
      configured: diagnostics.configured,
      teamIdPresent: diagnostics.teamIdPresent,
      projectIdPresent: diagnostics.projectIdPresent,
      environmentIdPresent: diagnostics.environmentIdPresent,
      probeOk: probe?.ok ?? false,
      probeStatus: probe?.status ?? null,
    },
  });
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json(diagnostics);
});

router.get("/connectors/railway/activity", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({ provider: "railway", events: getRailwayConnectorActivity() });
});

router.get("/connectors/railway/snapshot", async (_req, res) => {
  const config = getRailwayConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);
  recordRailwayConnectorActivity({
    eventType: "snapshot_requested",
    status: "info",
    metadata: {
      configured: config.configured,
      teamIdPresent: config.teamIdPresent,
      projectIdPresent: config.projectIdPresent,
      environmentIdPresent: config.environmentIdPresent,
    },
  });

  if (!config.configured) {
    res.json(createRailwayReadonlyReadySnapshot("MISSING_RAILWAY_TOKEN"));
    return;
  }

  try {
    const rawSnapshot = await readRailwayReadonlySnapshot();
    recordRailwayConnectorActivity({
      eventType: "projects_read",
      status: rawSnapshot.sectionErrors.projectsError ? "failed" : "success",
      code: rawSnapshot.sectionErrors.projectsError?.code,
      metadata: { count: rawSnapshot.projects.length },
    });
    recordRailwayConnectorActivity({
      eventType: "services_read",
      status: rawSnapshot.sectionErrors.servicesError ? "failed" : "success",
      code: rawSnapshot.sectionErrors.servicesError?.code,
      metadata: { count: rawSnapshot.services.length },
    });
    recordRailwayConnectorActivity({
      eventType: "deployments_read",
      status: rawSnapshot.sectionErrors.deploymentsError ? "failed" : "success",
      code: rawSnapshot.sectionErrors.deploymentsError?.code,
      metadata: { count: Object.values(rawSnapshot.deploymentsByService).flat().length },
    });
    recordRailwayConnectorActivity({
      eventType: "env_presence_read",
      status: "success",
      metadata: { serviceCount: rawSnapshot.services.length },
    });
    recordRailwayConnectorActivity({
      eventType: "logs_metadata_read",
      status: "info",
      metadata: { rawLogsReturned: false },
    });
    const snapshot = normalizeRailwayReadonlySnapshot(rawSnapshot);
    recordRailwayConnectorActivity({
      eventType: snapshot.status === "PARTIAL_READONLY" ? "snapshot_failed" : "snapshot_success",
      status: snapshot.status === "PARTIAL_READONLY" ? "info" : "success",
      code: snapshot.status === "PARTIAL_READONLY" ? snapshot.lastErrorCode : null,
      metadata: {
        projectCount: snapshot.projectCount,
        serviceCount: snapshot.serviceCount,
        deploymentCount: snapshot.deploymentCount,
      },
    });
    res.json(snapshot);
  } catch (error) {
    const code: RailwayConnectorErrorCode =
      error instanceof RailwayReadonlyClientError
        ? error.code
        : isSectionError(error)
          ? error.code
          : "RAILWAY_READ_FAILED";
    const reason =
      error instanceof Error || isSectionError(error)
        ? error.message
        : "Railway read-only snapshot failed.";
    recordRailwayConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code,
      metadata: { configured: true },
    });
    res
      .status(code === "MISSING_RAILWAY_TOKEN" ? 200 : 502)
      .json(createRailwayReadonlyFailedSnapshot(reason, code));
  }
});

export default router;
