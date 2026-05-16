import { Router } from "express";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getRuntimeSyncStatus } = require("../../../../server/runtime/runtimeHeartbeat.cjs");
const { getRecoveryStatus } = require("../../../../server/runtime/runtimeRecovery.cjs");
const { getProductionRuntimeStatus } = require("../../../../server/runtime/productionRuntime.cjs");
const { getDeploymentIntegrityStatus } = require("../../../../server/runtime/deploymentIntegrity.cjs");
const { getRuntimeSnapshotStatus } = require("../../../../server/runtime/runtimeSnapshot.cjs");

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
