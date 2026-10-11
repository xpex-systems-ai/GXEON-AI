import { Router, type IRouter } from "express";
import { runReadOnlyAgentFixture } from "../agentos/readOnlyWorker";
import { evaluateOfflineModelProposal } from "../agentos/modelSandbox";
import {
  GENESIS_SAFETY,
  createGenesisMission,
  recordGenesisAudit,
  draftGenesisCorrection,
  verifyGenesisDraft,
  verifyGenesisChain,
} from "../agentos/missionKernel";

/**
 * Public-safe, fixed-fixture discovery ONLY.
 * No input, no external connector calls, no customer data, no mutations.
 * This is not an authenticated mission-execution endpoint.
 */
const router: IRouter = Router();
router.use("/agentos/genesis", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/agentos/genesis/status", (_req, res) => {
  return res.json({
    success: true,
    data: {
      module: "GXEON_AGENTOS_GENESIS_P0",
      status: "SYNTHETIC_DEMO_ONLY",
      implementation: "SOURCE_ONLY_PREVIEW",
      missionExecutionAvailable: false,
      integrationReady: false,
      existingBrokerMode: "PREVIEW_ONLY",
      safety: GENESIS_SAFETY,
      nextGates: ["IDENTITY_AND_TENANCY", "PERSISTENCE", "SANDBOX_EXECUTION", "INDEPENDENT_REVIEW", "G0_G7"],
    },
  });
});

router.get("/agentos/genesis/synthetic-demo", (_req, res) => {
  const auditor = { role: "AUDITOR" as const, actorId: "xpex_demo_auditor" };
  const engineer = { role: "ENGINEER" as const, actorId: "xpex_demo_engineer" };
  const verifier = { role: "VERIFIER" as const, actorId: "xpex_demo_verifier" };
  let mission = createGenesisMission({
    missionId: "gxeon_api_fixture_demo",
    objective: "Demonstrate read-only GXEON mission controls using synthetic references",
    sourceRef: "fixture://repos/demo-api",
    risk: "R0",
    auditor,
  });
  mission = recordGenesisAudit(mission, auditor, "fixture://reports/demo-api");
  mission = draftGenesisCorrection(mission, engineer, "fixture://drafts/demo-api");
  mission = verifyGenesisDraft(mission, verifier, "fixture://proof/demo-api", true);
  return res.json({
    success: true,
    data: {
      synthetic: true,
      actualExternalActions: 0,
      verifiedChain: verifyGenesisChain(mission),
      mission,
    },
  });
});

/**
 * Fixed synthetic Systems Command-shaped inventory — no user input, no remote
 * provider, no authentication bypass, no writes and no model inference.
 */
router.get("/agentos/genesis/read-only-worker-demo", (_req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        mode: "SYNTHETIC_READONLY_P1",
        runtimeScope: "IN_PROCESS_FIXTURE_ONLY",
        requiresHumanApproval: true,
        modelExecutionEnabled: false,
        liveSystemsCommandConnection: false,
        result: runReadOnlyAgentFixture(),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      data: {
        mode: "SYNTHETIC_READONLY_P1",
        modelExecutionEnabled: false,
        liveSystemsCommandConnection: false,
        executionDisabled: true,
      },
      error: "READONLY_FIXTURE_DEMO_FAILED",
    });
  }
});

/**
 * Fixed GET-only offline model simulator. No input or remote model invocation.
 * Deliberately NOT a production agent endpoint.
 */
router.get("/agentos/genesis/model-sandbox-demo", (_req, res) => {
  try {
    const report = evaluateOfflineModelProposal();
    return res.json({
      success: true,
      data: {
        mode: "OFFLINE_MOCK_ONLY",
        realModelEnabled: false,
        liveSystemsCommandConnection: false,
        modelProviderCalls: 0,
        report,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "AGENTOS_MODEL_SANDBOX_DEMO_FAILED",
      data: { mode: "OFFLINE_MOCK_ONLY", realModelEnabled: false, executionDisabled: true },
    });
  }
});

export default router;
