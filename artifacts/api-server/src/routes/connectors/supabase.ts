import { Router } from "express";
import {
  getSupabaseConnectorConfig,
  toSupabaseConnectorDiagnostics,
} from "../../connectors/supabase/supabaseConnectorConfig";
import {
  getSupabaseConnectorActivity,
  recordSupabaseConnectorActivity,
} from "../../connectors/supabase/supabaseConnectorActivityLog";
import {
  probeSupabaseRestRead,
  readSupabaseReadonlySnapshot,
  SupabaseReadonlyClientError,
} from "../../connectors/supabase/supabaseReadonlyClient";
import {
  createSupabaseReadonlyFailedSnapshot,
  createSupabaseReadonlyReadySnapshot,
  normalizeSupabaseReadonlySnapshot,
} from "../../connectors/supabase/supabaseReadonlyNormalizer";
import type {
  SupabaseConnectorErrorCode,
  SupabaseConnectorSectionError,
} from "../../connectors/supabase/supabaseConnectorTypes";

const router = Router();
const cacheHeader = "private, max-age=30, stale-while-revalidate=30";
const diagnosticsCacheHeader = "no-store";

function isSectionError(error: unknown): error is SupabaseConnectorSectionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

router.get("/connectors/supabase/diagnostics", async (_req, res) => {
  const config = getSupabaseConnectorConfig();
  const probe = config.configured ? await probeSupabaseRestRead() : null;
  const diagnostics = toSupabaseConnectorDiagnostics(
    probe
      ? {
          attempted: true,
          ok: probe.ok,
          stage: "rest",
          status: probe.status,
          code: probe.code,
          safeMessage: probe.safeMessage,
          hint: probe.hint,
        }
      : {
          attempted: false,
          ok: false,
          stage: null,
          status: null,
          code: config.missing[0] ?? null,
          safeMessage: config.configured
            ? null
            : "Supabase backend URL and anon key are not configured.",
          hint: config.configured
            ? null
            : "Add SUPABASE_URL and SUPABASE_ANON_KEY in Railway api-server variables.",
        },
  );
  recordSupabaseConnectorActivity({
    eventType: "diagnostics_checked",
    status: probe?.ok || !config.configured ? "success" : "failed",
    code: probe?.code,
    metadata: {
      configured: diagnostics.configured,
      urlPresent: diagnostics.urlPresent,
      anonKeyPresent: diagnostics.anonKeyPresent,
      serviceRolePresent: diagnostics.serviceRolePresent,
      projectRefPresent: diagnostics.projectRefPresent,
      dbUrlPresent: diagnostics.dbUrlPresent,
      probeOk: probe?.ok ?? false,
      probeStatus: probe?.status ?? null,
    },
  });
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json(diagnostics);
});

router.get("/connectors/supabase/activity", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({ provider: "supabase", events: getSupabaseConnectorActivity() });
});

router.get("/connectors/supabase/snapshot", async (_req, res) => {
  const config = getSupabaseConnectorConfig();
  res.setHeader("Cache-Control", cacheHeader);
  recordSupabaseConnectorActivity({
    eventType: "snapshot_requested",
    status: "info",
    metadata: {
      configured: config.configured,
      urlPresent: config.urlPresent,
      anonKeyPresent: config.anonKeyPresent,
      serviceRolePresent: config.serviceRolePresent,
      projectRefPresent: config.projectRefPresent,
      dbUrlPresent: config.dbUrlPresent,
    },
  });

  if (!config.configured) {
    res.json(createSupabaseReadonlyReadySnapshot("MISSING_SUPABASE_CONFIG"));
    return;
  }

  try {
    const rawSnapshot = await readSupabaseReadonlySnapshot();
    recordSupabaseConnectorActivity({
      eventType: "project_read",
      status: "success",
      metadata: { projectRefPresent: rawSnapshot.projectRefPresent },
    });
    recordSupabaseConnectorActivity({
      eventType: "rest_probe_read",
      status: rawSnapshot.probes.rest.ok ? "success" : "failed",
      code: rawSnapshot.probes.rest.code,
      metadata: { reachable: rawSnapshot.probes.rest.ok },
    });
    recordSupabaseConnectorActivity({
      eventType: "storage_metadata_read",
      status: rawSnapshot.probes.storage.ok ? "success" : "failed",
      code: rawSnapshot.probes.storage.code,
      metadata: { bucketCount: rawSnapshot.counts.bucketCount },
    });
    recordSupabaseConnectorActivity({
      eventType: "database_metadata_read",
      status: rawSnapshot.probes.databaseMetadata.ok ? "success" : "info",
      code: rawSnapshot.probes.databaseMetadata.code,
      metadata: {
        dbUrlPresent: config.dbUrlPresent,
        schemaCount: rawSnapshot.counts.schemaCount,
        tableCount: rawSnapshot.counts.tableCount,
      },
    });
    recordSupabaseConnectorActivity({
      eventType: "rls_metadata_read",
      status: rawSnapshot.probes.rlsMetadata.ok ? "success" : "info",
      code: rawSnapshot.probes.rlsMetadata.code,
      metadata: {
        rlsEnabledTables: rawSnapshot.counts.rlsEnabledTables,
        rlsMissingTables: rawSnapshot.counts.rlsMissingTables,
      },
    });
    const snapshot = normalizeSupabaseReadonlySnapshot(rawSnapshot);
    recordSupabaseConnectorActivity({
      eventType: snapshot.status === "CONNECTED_READONLY" ? "snapshot_success" : "snapshot_failed",
      status: snapshot.status === "CONNECTED_READONLY" ? "success" : "info",
      code: snapshot.status === "CONNECTED_READONLY" ? null : snapshot.lastErrorCode,
      metadata: {
        status: snapshot.status,
        healthScore: snapshot.health.healthScore,
        restReachable: snapshot.restReachable,
        storageReachable: snapshot.storageReachable,
        dbMetadataReachable: snapshot.dbMetadataReachable,
      },
    });
    res.json(snapshot);
  } catch (error) {
    const code: SupabaseConnectorErrorCode =
      error instanceof SupabaseReadonlyClientError
        ? error.code
        : isSectionError(error)
          ? error.code
          : "SUPABASE_READ_FAILED";
    const reason =
      error instanceof Error || isSectionError(error)
        ? error.message
        : "Supabase read-only snapshot failed.";
    recordSupabaseConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code,
      metadata: { configured: true },
    });
    res
      .status(code === "MISSING_SUPABASE_CONFIG" ? 200 : 502)
      .json(createSupabaseReadonlyFailedSnapshot(reason, code));
  }
});

export default router;
