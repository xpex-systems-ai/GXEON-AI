import { Router, type IRouter } from "express";
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

export default router;
