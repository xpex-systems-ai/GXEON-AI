import { Router } from "express";
import {
  getVercelConnectorConfig,
  toVercelConnectorDiagnostics,
} from "../../connectors/vercel/vercelConnectorConfig";
import {
  getVercelConnectorActivity,
  recordVercelConnectorActivity,
} from "../../connectors/vercel/vercelConnectorActivityLog";
import {
  readVercelReadonlySnapshot,
  VercelReadonlyClientError,
} from "../../connectors/vercel/vercelReadonlyClient";
import {
  createVercelReadonlyFailedSnapshot,
  createVercelReadonlyReadySnapshot,
  normalizeVercelReadonlySnapshot,
} from "../../connectors/vercel/vercelReadonlyNormalizer";
import type { VercelConnectorErrorCode } from "../../connectors/vercel/vercelConnectorTypes";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

router.get("/connectors/vercel/diagnostics", (_req, res) => {
  const diagnostics = toVercelConnectorDiagnostics();
  recordVercelConnectorActivity({
    eventType: "diagnostics_checked",
    status: "success",
    metadata: {
      configured: diagnostics.configured,
      teamIdPresent: diagnostics.teamIdPresent,
    },
  });
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json(diagnostics);
});

router.get("/connectors/vercel/activity", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({ provider: "vercel", events: getVercelConnectorActivity() });
});

router.get("/connectors/vercel/snapshot", async (_req, res) => {
  const config = getVercelConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);
  recordVercelConnectorActivity({
    eventType: "snapshot_requested",
    status: "info",
    metadata: { configured: config.configured, teamIdPresent: config.teamIdPresent },
  });

  if (!config.configured) {
    res.json(createVercelReadonlyReadySnapshot("MISSING_VERCEL_TOKEN"));
    return;
  }

  try {
    const rawSnapshot = await readVercelReadonlySnapshot();
    recordVercelConnectorActivity({
      eventType: "projects_read",
      status: "success",
      metadata: { count: rawSnapshot.projects.length },
    });
    recordVercelConnectorActivity({
      eventType: "deployments_read",
      status: "success",
      metadata: { count: Object.values(rawSnapshot.deploymentsByProject).flat().length },
    });
    recordVercelConnectorActivity({
      eventType: "domains_read",
      status: "success",
      metadata: { count: Object.values(rawSnapshot.domainsByProject).flat().length },
    });
    const snapshot = normalizeVercelReadonlySnapshot(rawSnapshot);
    recordVercelConnectorActivity({
      eventType: "snapshot_success",
      status: "success",
      metadata: {
        totalProjects: snapshot.totalProjects,
        productionReady: snapshot.productionReady,
        failedLast24h: snapshot.failedLast24h,
      },
    });
    res.json(snapshot);
  } catch (error) {
    const code: VercelConnectorErrorCode =
      error instanceof VercelReadonlyClientError
        ? error.code
        : "VERCEL_READ_FAILED";
    recordVercelConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code,
      metadata: { configured: true },
    });
    res
      .status(code === "MISSING_VERCEL_TOKEN" ? 200 : 502)
      .json(createVercelReadonlyFailedSnapshot(code, code));
  }
});

export default router;
