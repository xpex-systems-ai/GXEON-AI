import { Router, type IRouter, type Response } from "express";
import { getGrokBuilderPreparationStatus, getHomeCenterAgentPermissions, getHomeCenterAgentReadinessStatus, getHomeCenterAgentRegistry } from "../agents/homeCenterAgentRegistry";

const router: IRouter = Router();

router.use("/agents/home-center", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function safeError(res: Response, error: unknown, fallback = "HOME_CENTER_AGENTS_REQUEST_FAILED") {
  const message = error instanceof Error ? error.message : fallback;
  res.status(500).json({ success: false, error: message, message });
}

router.get("/agents/home-center/status", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentReadinessStatus() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_STATUS_FAILED");
  }
});

router.get("/agents/home-center/registry", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentRegistry() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_REGISTRY_FAILED");
  }
});

router.get("/agents/home-center/permissions", (_req, res) => {
  try {
    res.json({ success: true, data: getHomeCenterAgentPermissions() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_PERMISSIONS_FAILED");
  }
});

router.get("/agents/home-center/grok-readiness", (_req, res) => {
  try {
    res.json({ success: true, data: getGrokBuilderPreparationStatus() });
  } catch (error) {
    safeError(res, error, "HOME_CENTER_AGENTS_GROK_READINESS_FAILED");
  }
});

// === Quantum-Inspired Advisory Layer (Classical, Advisory-Only) ===
// Added cleanly on top of existing Home Center P0 routes.
// All responses are PREVIEW_ONLY. No execution, install, or external actions.

import { prioritizeOpportunity } from "../agents/quantumOpportunityPrioritizer";
import { computeRiskEnergy } from "../agents/riskEnergyModel";
import { simulateAgentRoutes } from "../agents/agentRouteSimulator";
import type { OpportunityLikeInput, TaskLikeInput } from "../agents/quantumInspiredAgentTypes";

router.get("/agents/home-center/quantum/status", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "QUANTUM_INSPIRED_ADVISORY_READY",
      mode: "CLASSICAL_PREVIEW_ONLY",
      realQuantumHardware: false,
      autonomousExecution: false,
      externalContact: false,
      githubWrites: false,
      paymentAction: false,
      description: "Classical decision intelligence for prioritization and route simulation. Advisory only.",
    },
  });
});

router.post("/agents/home-center/quantum/prioritize-opportunity", (req, res) => {
  try {
    const body = req.body || {};
    const input: OpportunityLikeInput = {
      id: body.id || "preview",
      score: Number(body.score || 50),
      riskFlags: body.riskFlags || [],
      category: body.category || "general",
      recommendedNextStep: body.recommendedNextStep,
      offerTemplateId: body.offerTemplateId,
    };
    const pa = prioritizeOpportunity(input);
    const re = computeRiskEnergy({ riskFlags: input.riskFlags });
    res.json({
      success: true,
      data: {
        decisionPreview: {
          id: `qai_${Date.now()}`,
          inputType: "OPPORTUNITY",
          inputId: input.id,
          mode: "CLASSICAL_PREVIEW_ONLY",
          realQuantumHardware: false,
          autonomousExecution: false,
          externalContact: false,
          githubWrites: false,
          paymentAction: false,
          priorityAmplitude: pa,
          riskEnergy: re,
          recommendedRoutes: [],
          scenarioOptions: 1,
          createdAt: new Date().toISOString(),
        },
      },
    });
  } catch (e) {
    safeError(res, e, "QUANTUM_PRIORITIZE_FAILED");
  }
});

router.post("/agents/home-center/quantum/simulate-task-route", (req, res) => {
  try {
    const body = req.body || {};
    const input: TaskLikeInput = {
      id: body.taskId,
      title: body.title || "Untitled task preview",
      requiredConnectors: body.requiredConnectors,
      forbiddenActions: body.forbiddenActions,
    };
    const { recommendedRoutes, blockedByDefault } = simulateAgentRoutes(input);
    const re = computeRiskEnergy({ forbiddenActions: blockedByDefault });

    res.json({
      success: true,
      data: {
        decisionPreview: {
          id: `qai_route_${Date.now()}`,
          inputType: "TASK",
          inputId: input.id || "preview",
          mode: "CLASSICAL_PREVIEW_ONLY",
          realQuantumHardware: false,
          autonomousExecution: false,
          externalContact: false,
          githubWrites: false,
          paymentAction: false,
          priorityAmplitude: { priority: 0.5, signals: [{ amplitude: 0.5, explanation: "Route simulation advisory." }], riskEnergy: re.riskEnergy, recommendedAction: "Review recommended agents. All require operator approval.", reasoning: ["Classical matching against Home Center capabilities."] },
          riskEnergy: re,
          recommendedRoutes,
          scenarioOptions: recommendedRoutes.length,
          createdAt: new Date().toISOString(),
        },
        recommendedRoute: recommendedRoutes,
        approvalRequired: true,
        executionStillDisabled: true,
        blockedByDefault,
      },
    });
  } catch (e) {
    safeError(res, e, "QUANTUM_SIMULATE_ROUTE_FAILED");
  }
});

router.post("/agents/home-center/quantum/risk-energy", (req, res) => {
  try {
    const body = req.body || {};
    const re = computeRiskEnergy({ riskFlags: body.riskFlags, forbiddenActions: body.forbiddenActions });
    res.json({ success: true, data: { riskEnergy: re, mode: "CLASSICAL_PREVIEW_ONLY", note: "Lower energy = safer manual path. Advisory only." } });
  } catch (e) {
    safeError(res, e, "QUANTUM_RISK_FAILED");
  }
});

// Final catch-all for the home-center prefix
router.use("/agents/home-center", (_req, res) => {
  res.status(404).json({ success: false, error: "HOME_CENTER_AGENTS_ROUTE_NOT_FOUND", message: "HOME_CENTER_AGENTS_ROUTE_NOT_FOUND" });
});

export default router;
