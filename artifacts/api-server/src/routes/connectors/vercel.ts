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
  probeVercelProjectsRead,
  readVercelReadonlySnapshot,
  VercelReadonlyClientError,
} from "../../connectors/vercel/vercelReadonlyClient";
import {
  createVercelReadonlyFailedSnapshot,
  createVercelReadonlyReadySnapshot,
  normalizeVercelReadonlySnapshot,
} from "../../connectors/vercel/vercelReadonlyNormalizer";
import type {
  VercelConnectorErrorCode,
  VercelConnectorSectionError,
} from "../../connectors/vercel/vercelConnectorTypes";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

function isSectionError(error: unknown): error is VercelConnectorSectionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function safeDiagnosticHint(
  code: VercelConnectorErrorCode | null,
  teamIdPresent: boolean,
): string | null {
  if (code === "VERCEL_404" && !teamIdPresent) {
    return "Vercel API route/team/project mismatch. Token may belong to a team; add VERCEL_TEAM_ID in Railway.";
  }
  if (code === "VERCEL_403") return "Insufficient Vercel token scope.";
  if (code === "VERCEL_401") return "Invalid or expired Vercel token.";
  return null;
}

router.get("/connectors/vercel/diagnostics", async (_req, res) => {
  const config = getVercelConnectorConfig();
  const probe = config.configured ? await probeVercelProjectsRead() : null;
  const diagnostics = toVercelConnectorDiagnostics(
    probe
      ? {
          attempted: true,
          ok: probe.ok,
          status: probe.status,
          code: probe.code,
          projectCount: probe.projectCount,
          hint:
            probe.hint ?? safeDiagnosticHint(probe.code, config.teamIdPresent),
        }
      : {
          attempted: false,
          ok: false,
          status: null,
          code: config.missing[0] ?? null,
          projectCount: null,
          hint: config.configured ? null : "Add VERCEL_TOKEN in Railway api-server variables.",
        },
  );
  recordVercelConnectorActivity({
    eventType: "diagnostics_checked",
    status: probe?.ok || !config.configured ? "success" : "failed",
    code: probe?.code,
    metadata: {
      configured: diagnostics.configured,
      teamIdPresent: diagnostics.teamIdPresent,
      probeOk: probe?.ok ?? false,
      probeStatus: probe?.status ?? null,
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
    metadata: {
      configured: config.configured,
      teamIdPresent: config.teamIdPresent,
    },
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
      status: rawSnapshot.sectionErrors.deploymentsError ? "failed" : "success",
      code: rawSnapshot.sectionErrors.deploymentsError?.code,
      metadata: {
        count: Object.values(rawSnapshot.deploymentsByProject).flat().length,
      },
    });
    recordVercelConnectorActivity({
      eventType: "domains_read",
      status: rawSnapshot.sectionErrors.domainsError ? "failed" : "success",
      code: rawSnapshot.sectionErrors.domainsError?.code,
      metadata: { count: Object.values(rawSnapshot.domainsByProject).flat().length },
    });
    const snapshot = normalizeVercelReadonlySnapshot(rawSnapshot);
    recordVercelConnectorActivity({
      eventType:
        snapshot.status === "PARTIAL_READONLY" ? "snapshot_failed" : "snapshot_success",
      status: snapshot.status === "PARTIAL_READONLY" ? "info" : "success",
      code: snapshot.status === "PARTIAL_READONLY" ? snapshot.lastErrorCode : null,
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
        : isSectionError(error)
          ? error.code
          : "VERCEL_READ_FAILED";
    const reason =
      error instanceof Error || isSectionError(error)
        ? error.message
        : "Vercel projects read failed.";
    recordVercelConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code,
      metadata: { configured: true },
    });
    res
      .status(code === "MISSING_VERCEL_TOKEN" ? 200 : 502)
      .json(createVercelReadonlyFailedSnapshot(reason, code));
  }
});

export default router;
