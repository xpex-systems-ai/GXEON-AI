import { Router } from "express";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";
import { financialMutation } from "../middlewares/financialAuth";

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
const { getProductionRuntimeStatus } = require(
  pathFromRoot("productionRuntime.cjs"),
);
const { getDeploymentIntegrityStatus } = require(
  pathFromRoot("deploymentIntegrity.cjs"),
);
const { getRuntimeSnapshotStatus } = require(
  pathFromRoot("runtimeSnapshot.cjs"),
);
const {
  getRailwayRuntimeStatus,
  getRailwayCoreStatus,
  getFinancialCoreStatus,
} = require(pathFromRoot("railwayProduction.cjs"));
const { getRadarStatus } = require(pathFromRoot("radarContinuity.cjs"));
const { getProviderRuntimeStatus } = require(
  pathFromRoot("providerRuntime.cjs"),
);
const { getRuntimeMemoryStatus } = require(pathFromRoot("runtimeMemory.cjs"));
const { getSupabaseRuntimeStatus } = require(
  pathFromRoot("supabaseRuntime.cjs"),
);
const { getSignalIntelligence } = require(pathFromRoot("signalEnrichment.cjs"));
const { getConversionDNA, getMonetizationDNA } = require(
  pathFromRoot("conversionDNA.cjs"),
);
const { getOperatorAlerts } = require(pathFromRoot("operatorAlerts.cjs"));
const { createPixPayment, getPaymentsRuntimeAsync } = require(
  pathFromRoot("paymentRuntime.cjs"),
);
const { processWebhook, processPendingPixFollowups } = require(
  pathFromRoot("mercadoWebhookRuntime.cjs"),
);
const { getRevenueTelemetry } = require(pathFromRoot("revenueTelemetry.cjs"));
const { runMonetizationAudit } = require(pathFromRoot("monetizationAudit.cjs"));
const { executeAutonomousPixRun } = require(
  pathFromRoot("paymentOrchestrator.cjs"),
);
const { getSanitizedProviderSummary, sanitizeRuntimeEvent } = require(
  pathFromRoot("runtimeLogSanitizer.cjs"),
);
const {
  ensureWallet,
  upsertWallet,
  transferCredits,
  getCreditRuntime,
} = require(pathFromRoot("creditRuntime.cjs"));
const { settleCommission, getCommissionRuntime } = require(
  pathFromRoot("commissionEngine.cjs"),
);
const {
  enqueueTask,
  runSchedulerCycle,
  autoTopupViaPix,
  getAutonomousRevenueRuntime,
  generateSellableTasksFromRadar,
} = require(pathFromRoot("autonomousRevenueScheduler.cjs"));
const { generateSignal, consumePremiumSignal, getXRadarMetrics } = require(
  pathFromRoot("xRadarEngine.cjs"),
);
const { runXRadarScanCycle, runXRadarRevenueCycle } = require(
  pathFromRoot("xRadarScheduler.cjs"),
);
const { subscribeAgent, getSubscriptionCatalog } = require(
  pathFromRoot("subscriptionRuntime.cjs"),
);
const { getRevenueDashboardMetrics } = require(
  pathFromRoot("revenueDashboardRuntime.cjs"),
);
const {
  createRevenueCheckout,
  getCheckoutStatus,
  processCartRecovery,
  getRevenueAnalytics,
  getRevenueCatalog,
  sellSubscription,
  sellCreditPack,
  createRadarMonetizationCheckout,
  activatePaidEntitlement,
} = require(pathFromRoot("revenueEngineRuntime.cjs"));

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
  res.json({
    provider_logs: getSanitizedProviderSummary(),
    generated_at: new Date().toISOString(),
  });
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

router.get("/v1/runtime/payments", async (_req, res) => {
  try {
    res.json(await getPaymentsRuntimeAsync());
  } catch (error) {
    res.status(503).json({ error: String(error) });
  }
});

router.post(
  "/v1/runtime/payments/create",
  ...financialMutation("financial:payments:create"),
  async (req, res) => {
    try {
      res.status(201).json(await createPixPayment(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/runtime/payments/auto",
  ...financialMutation("financial:payments:auto"),
  async (req, res) => {
    try {
      res.status(201).json(await executeAutonomousPixRun(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post("/v1/webhooks/mercado-pago", async (req, res) => {
  try {
    const sig = String(
      req.headers["x-signature"] || req.headers["x-mercado-signature"] || "",
    );
    const raw =
      typeof (req as unknown as { rawBody?: string }).rawBody === "string"
        ? (req as unknown as { rawBody: string }).rawBody
        : JSON.stringify(req.body ?? {});
    const result = await processWebhook(req.body ?? {}, {
      signature: sig,
      rawBody: raw,
      requestId: String(req.headers["x-request-id"] || ""),
      dataId: String(
        req.query["data.id"] || req.query.id || req.body?.data?.id || "",
      ),
    });
    res.status(result.accepted ? 200 : 401).json(result);
  } catch (error) {
    res.status(500).json({ accepted: false, error: String(error) });
  }
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

router.post(
  "/v1/runtime/credits/wallet",
  ...financialMutation("financial:credits:wallet"),
  (req, res) => {
    try {
      res.status(201).json(upsertWallet(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/runtime/credits/transfer",
  ...financialMutation("financial:credits:transfer"),
  (req, res) => {
    try {
      const outcome = transferCredits(req.body ?? {});
      res.status(outcome.ok ? 201 : 402).json(outcome);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.get("/v1/runtime/commissions", (_req, res) => {
  res.json(getCommissionRuntime());
});

router.post(
  "/v1/runtime/commissions/settle",
  ...financialMutation("financial:commissions:settle"),
  (req, res) => {
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
  },
);

router.get("/v1/runtime/autonomous-revenue", (_req, res) => {
  res.json(getAutonomousRevenueRuntime());
});

router.post(
  "/v1/runtime/tasks/enqueue",
  ...financialMutation("financial:revenue:tasks"),
  (req, res) => {
    res.status(201).json(enqueueTask(req.body ?? {}));
  },
);

router.post(
  "/v1/runtime/tasks/run-cycle",
  ...financialMutation("financial:revenue:scheduler"),
  async (req, res) => {
    try {
      res.status(201).json(await runSchedulerCycle(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/runtime/credits/auto-topup",
  ...financialMutation("financial:credits:auto-topup"),
  async (req, res) => {
    try {
      res.status(201).json(await autoTopupViaPix(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/runtime/tasks/generate-from-radar",
  ...financialMutation("financial:revenue:radar"),
  (req, res) => {
    res.status(201).json(generateSellableTasksFromRadar(req.body ?? {}));
  },
);

router.get("/v1/x-radar/metrics", (_req, res) => {
  res.json(getXRadarMetrics());
});

router.post(
  "/v1/x-radar/signals/generate",
  ...financialMutation("financial:x-radar:signals"),
  (req, res) => {
    res.status(201).json(generateSignal(req.body ?? {}));
  },
);

router.post(
  "/v1/x-radar/signals/consume",
  ...financialMutation("financial:x-radar:consume"),
  (req, res) => {
    const outcome = consumePremiumSignal(req.body ?? {});
    res.status(outcome.ok ? 201 : 402).json(outcome);
  },
);

router.post(
  "/v1/x-radar/scan-cycle",
  ...financialMutation("financial:x-radar:scan"),
  (req, res) => {
    res.status(201).json(runXRadarScanCycle(req.body ?? {}));
  },
);

router.post(
  "/v1/x-radar/revenue-cycle",
  ...financialMutation("financial:x-radar:revenue"),
  async (req, res) => {
    try {
      res.status(201).json(await runXRadarRevenueCycle(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.get("/v1/monetization/subscriptions/catalog", (_req, res) => {
  res.json(getSubscriptionCatalog());
});

router.post(
  "/v1/monetization/subscriptions/subscribe",
  ...financialMutation("financial:monetization:subscriptions"),
  (req, res) => {
    try {
      res.status(201).json(subscribeAgent(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/runtime/pix/followups/process",
  ...financialMutation("financial:payments:followups"),
  (req, res) => {
    res.status(201).json(processPendingPixFollowups(req.body ?? {}));
  },
);

router.get("/v1/runtime/revenue-dashboard", (_req, res) => {
  res.json(getRevenueDashboardMetrics());
});

router.get("/v1/revenue-engine/catalog", (_req, res) => {
  res.json(getRevenueCatalog());
});

router.get("/v1/revenue-engine/analytics", (_req, res) => {
  res.json(getRevenueAnalytics());
});

router.post(
  "/v1/revenue-engine/checkout",
  ...financialMutation("financial:revenue-engine:checkout"),
  async (req, res) => {
    try {
      res.status(201).json(await createRevenueCheckout(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.get("/v1/revenue-engine/checkout/:id/status", async (req, res) => {
  try {
    res.json(await getCheckoutStatus(req.params.id));
  } catch (error) {
    res.status(404).json({ error: String(error) });
  }
});

router.post(
  "/v1/revenue-engine/recovery/process",
  ...financialMutation("financial:revenue-engine:recovery"),
  (req, res) => {
    try {
      res.status(201).json(processCartRecovery(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/revenue-engine/subscriptions/sale",
  ...financialMutation("financial:revenue-engine:subscriptions"),
  async (req, res) => {
    try {
      res.status(201).json(await sellSubscription(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/revenue-engine/credits/packs/sale",
  ...financialMutation("financial:revenue-engine:credits"),
  async (req, res) => {
    try {
      res.status(201).json(await sellCreditPack(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/revenue-engine/radar/checkout",
  ...financialMutation("financial:revenue-engine:radar"),
  async (req, res) => {
    try {
      res
        .status(201)
        .json(await createRadarMonetizationCheckout(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

router.post(
  "/v1/revenue-engine/entitlements/activate",
  ...financialMutation("financial:revenue-engine:entitlements"),
  (req, res) => {
    try {
      res.status(201).json(activatePaidEntitlement(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  },
);

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
