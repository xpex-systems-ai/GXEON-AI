import { Router } from "express";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pathFromRoot = (file: string) => path.join(process.cwd(), "server/runtime", file);
const { getRuntimeSyncStatus } = require(pathFromRoot("runtimeHeartbeat.cjs"));
const { getRecoveryStatus } = require(pathFromRoot("runtimeRecovery.cjs"));
const { getProductionRuntimeStatus } = require(pathFromRoot("productionRuntime.cjs"));
const { getDeploymentIntegrityStatus } = require(pathFromRoot("deploymentIntegrity.cjs"));
const { getRuntimeSnapshotStatus } = require(pathFromRoot("runtimeSnapshot.cjs"));
const { getRailwayRuntimeStatus } = require(pathFromRoot("railwayProduction.cjs"));
const { getRadarStatus } = require(pathFromRoot("radarContinuity.cjs"));
const { getProviderRuntimeStatus } = require(pathFromRoot("providerRuntime.cjs"));
const { getRuntimeMemoryStatus } = require(pathFromRoot("runtimeMemory.cjs"));
const { getSupabaseRuntimeStatus } = require(pathFromRoot("supabaseRuntime.cjs"));
const { getSanitizedProviderSummary, sanitizeRuntimeEvent } = require(pathFromRoot("runtimeLogSanitizer.cjs"));

const router = Router();

router.get("/v1/runtime/sync", (_req, res) => {
  res.json(getRuntimeSyncStatus());
});

router.get("/v1/runtime/recovery", (_req, res) => {
  res.json(getRecoveryStatus());
});


router.get("/v1/runtime/production", (_req, res) => {
  res.json(getProductionRuntimeStatus());
});

router.get("/v1/runtime/deployment", (_req, res) => {
  res.json(getDeploymentIntegrityStatus());
});

router.get("/v1/runtime/snapshots", (_req, res) => {
  res.json(getRuntimeSnapshotStatus());
});


router.get("/v1/runtime/railway", (_req, res) => {
  res.json(getRailwayRuntimeStatus());
});

router.get("/v1/runtime/radar", (_req, res) => {
  res.json(getRadarStatus());
});

router.get("/v1/runtime/providers", (_req, res) => {
  res.json(getProviderRuntimeStatus());
});

router.get("/v1/runtime/memory", (_req, res) => {
  res.json(getRuntimeMemoryStatus());
});

router.get("/v1/runtime/supabase", (_req, res) => {
  res.json(getSupabaseRuntimeStatus());
});

router.get("/v1/runtime/provider-logs", (_req, res) => {
  res.json({ provider_logs: getSanitizedProviderSummary(), generated_at: new Date().toISOString() });
});


router.post("/v1/runtime/log-sanitize", (req, res) => {
  const payload = req.body ?? {};
  res.json({ sanitized: sanitizeRuntimeEvent(payload) });
});

router.get("/v1/runtime/readiness", (_req, res) => {
  const sync = getRuntimeSyncStatus();
  res.json({
    status: "LIVE",
    runtime: sync.runtime,
    github_sync: sync.github_sync,
    dashboard: sync.dashboard,
    services: {
      api: "ONLINE",
      dashboard: "ACTIVE",
      governance: "ACTIVE",
      conversion: "ACTIVE",
      mobile: "ACTIVE",
    },
    timestamp: new Date().toISOString(),
  });
});

router.get("/v1/dashboard/runtime", (_req, res) => {
  const sync = getRuntimeSyncStatus();
  res.json({
    runtime: sync.runtime,
    branch: sync.branch,
    commit: sync.last_commit,
    sync_health: sync.synchronized ? "GREEN" : "RED",
    deployment_freshness_seconds: sync.deployment_freshness_seconds,
    dashboard: "ACTIVE",
    timestamp: new Date().toISOString(),
  });
});

export default router;
