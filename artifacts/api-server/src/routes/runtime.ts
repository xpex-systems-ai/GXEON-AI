import { Router } from "express";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const resolveRuntimeRoot = () => {
  const candidates = [
    path.resolve(process.cwd(), "server/runtime"),
    path.resolve(process.cwd(), "../server/runtime"),
    path.resolve(process.cwd(), "../../server/runtime"),
  ];

  const match = candidates.find((dir) => existsSync(dir));
  return match ?? candidates[0];
};

const runtimeRoot = resolveRuntimeRoot();
const pathFromRoot = (file: string) => path.join(runtimeRoot, file);
const { getRuntimeSyncStatus } = require(pathFromRoot("runtimeHeartbeat.cjs"));
const { getRecoveryStatus } = require(pathFromRoot("runtimeRecovery.cjs"));
const { getProductionRuntimeStatus } = require(pathFromRoot("productionRuntime.cjs"));
const { getDeploymentIntegrityStatus } = require(pathFromRoot("deploymentIntegrity.cjs"));
const { getRuntimeSnapshotStatus } = require(pathFromRoot("runtimeSnapshot.cjs"));
const { getRailwayRuntimeStatus, getRailwayCoreStatus, getFinancialCoreStatus } = require(pathFromRoot("railwayProduction.cjs"));
const { getRadarStatus } = require(pathFromRoot("radarContinuity.cjs"));
const { getProviderRuntimeStatus } = require(pathFromRoot("providerRuntime.cjs"));
const { getRuntimeMemoryStatus } = require(pathFromRoot("runtimeMemory.cjs"));
const { getSupabaseRuntimeStatus } = require(pathFromRoot("supabaseRuntime.cjs"));
const { getSignalIntelligence } = require(pathFromRoot("signalEnrichment.cjs"));
const { getConversionDNA, getMonetizationDNA } = require(pathFromRoot("conversionDNA.cjs"));
const { getOperatorAlerts } = require(pathFromRoot("operatorAlerts.cjs"));
const { createPixPayment, getPaymentsRuntime } = require(pathFromRoot("paymentRuntime.cjs"));
const { processWebhook } = require(pathFromRoot("mercadoWebhookRuntime.cjs"));
const { getRevenueTelemetry } = require(pathFromRoot("revenueTelemetry.cjs"));
const { runMonetizationAudit } = require(pathFromRoot("monetizationAudit.cjs"));
const { executeAutonomousPixRun } = require(pathFromRoot("paymentOrchestrator.cjs"));
const { getSanitizedProviderSummary, sanitizeRuntimeEvent } = require(pathFromRoot("runtimeLogSanitizer.cjs"));
const { ensureWallet, upsertWallet, transferCredits, getCreditRuntime } = require(pathFromRoot("creditRuntime.cjs"));
const { settleCommission, getCommissionRuntime } = require(pathFromRoot("commissionEngine.cjs"));
const { enqueueTask, runSchedulerCycle, autoTopupViaPix, getAutonomousRevenueRuntime, generateSellableTasksFromRadar } = require(pathFromRoot("autonomousRevenueScheduler.cjs"));
const { generateSignal, consumePremiumSignal, getXRadarMetrics } = require(pathFromRoot("xRadarEngine.cjs"));
const { runXRadarScanCycle } = require(pathFromRoot("xRadarScheduler.cjs"));
const { subscribeAgent, getSubscriptionCatalog } = require(pathFromRoot("subscriptionRuntime.cjs"));

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


router.get("/v1/runtime/railway-core", (_req, res) => {
  res.json(getRailwayCoreStatus());
});

router.get("/v1/runtime/signals", (_req, res) => {
  res.json(getSignalIntelligence());
});

router.get("/v1/runtime/conversion-dna", (_req, res) => {
  res.json(getConversionDNA());
});

router.get("/v1/runtime/alerts", (_req, res) => {
  res.json(getOperatorAlerts());
});


router.get("/v1/runtime/payments", (_req, res) => {
  res.json(getPaymentsRuntime());
});

router.post("/v1/runtime/payments/create", (req, res) => {
  res.status(201).json(createPixPayment(req.body ?? {}));
});

router.post("/v1/runtime/payments/auto", (req, res) => {
  res.status(201).json(executeAutonomousPixRun(req.body ?? {}));
});

router.post("/v1/webhooks/mercado-pago", (req, res) => {
  const sig = String(req.headers["x-signature"] || req.headers["x-mercado-signature"] || "");
  const raw = JSON.stringify(req.body ?? {});
  const result = processWebhook(req.body ?? {}, sig, raw);
  res.status(result.accepted ? 200 : 401).json(result);
});

router.get("/v1/runtime/monetization", (_req, res) => {
  res.json(getMonetizationDNA());
});

router.get("/v1/runtime/revenue", (_req, res) => {
  res.json(getRevenueTelemetry());
});

router.get("/v1/runtime/financial-core", (_req, res) => {
  res.json(getFinancialCoreStatus());
});

router.get("/v1/runtime/monetization-audit", (_req, res) => {
  res.json(runMonetizationAudit());
});

router.get("/v1/runtime/credits", (_req, res) => {
  res.json(getCreditRuntime());
});

router.post("/v1/runtime/credits/wallet", (req, res) => {
  try {
    res.status(201).json(upsertWallet(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.post("/v1/runtime/credits/transfer", (req, res) => {
  try {
    const outcome = transferCredits(req.body ?? {});
    res.status(outcome.ok ? 201 : 402).json(outcome);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.get("/v1/runtime/commissions", (_req, res) => {
  res.json(getCommissionRuntime());
});

router.post("/v1/runtime/commissions/settle", (req, res) => {
  try {
    const payload = req.body ?? {};
    ensureWallet(payload.producer_agent_id || "agent_producer");
    ensureWallet(payload.consumer_agent_id || "agent_consumer");
    const settlement = settleCommission(payload);
    const transfer = transferCredits({
      from_agent_id: payload.consumer_agent_id || "agent_consumer",
      to_agent_id: payload.producer_agent_id || "agent_producer",
      amount: settlement.producer_net,
      reason: "TASK_SETTLEMENT_NET",
    });
    res.status(201).json({ settlement, transfer });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.get("/v1/runtime/autonomous-revenue", (_req, res) => {
  res.json(getAutonomousRevenueRuntime());
});

router.post("/v1/runtime/tasks/enqueue", (req, res) => {
  res.status(201).json(enqueueTask(req.body ?? {}));
});

router.post("/v1/runtime/tasks/run-cycle", (req, res) => {
  res.status(201).json(runSchedulerCycle(req.body ?? {}));
});

router.post("/v1/runtime/credits/auto-topup", (req, res) => {
  res.status(201).json(autoTopupViaPix(req.body ?? {}));
});

router.post("/v1/runtime/tasks/generate-from-radar", (req, res) => {
  res.status(201).json(generateSellableTasksFromRadar(req.body ?? {}));
});

router.get("/v1/x-radar/metrics", (_req, res) => {
  res.json(getXRadarMetrics());
});

router.post("/v1/x-radar/signals/generate", (req, res) => {
  res.status(201).json(generateSignal(req.body ?? {}));
});

router.post("/v1/x-radar/signals/consume", (req, res) => {
  const outcome = consumePremiumSignal(req.body ?? {});
  res.status(outcome.ok ? 201 : 402).json(outcome);
});

router.post("/v1/x-radar/scan-cycle", (req, res) => {
  res.status(201).json(runXRadarScanCycle(req.body ?? {}));
});

router.get("/v1/monetization/subscriptions/catalog", (_req, res) => {
  res.json(getSubscriptionCatalog());
});

router.post("/v1/monetization/subscriptions/subscribe", (req, res) => {
  try {
    res.status(201).json(subscribeAgent(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
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
