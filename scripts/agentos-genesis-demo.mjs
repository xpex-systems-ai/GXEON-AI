import {
  createGenesisMission, recordGenesisAudit, draftGenesisCorrection,
  verifyGenesisDraft, verifyGenesisChain, GENESIS_SAFETY,
} from "../artifacts/api-server/src/agentos/missionKernel.ts";

// This demo operates entirely on fixed synthetic fixture identifiers.
const auditor = { role: "AUDITOR", actorId: "xpex_auditor_001" };
const engineer = { role: "ENGINEER", actorId: "xpex_engineer_001" };
const verifier = { role: "VERIFIER", actorId: "xpex_verifier_001" };
let mission = createGenesisMission({
  missionId: "gxeon_genesis_demo_001",
  objective: "Audit a synthetic API and draft a safe correction for independent review",
  sourceRef: "fixture://repos/demo-api",
  risk: "R0",
  auditor,
});
mission = recordGenesisAudit(mission, auditor, "fixture://reports/demo-audit");
mission = draftGenesisCorrection(mission, engineer, "fixture://drafts/demo-patch");
mission = verifyGenesisDraft(mission, verifier, "fixture://proof/demo-verification", true);
if (!verifyGenesisChain(mission) || mission.status !== "AWAITING_HUMAN_APPROVAL") {
  throw new Error("GENESIS_DEMO_NOT_VERIFIED");
}
process.stdout.write(JSON.stringify({
  missionId: mission.missionId,
  objective: mission.objective,
  status: mission.status,
  verifiedChain: true,
  recordedEvents: mission.events.map(({sequence, action, digest}) => ({sequence, action, digest})),
  safety: GENESIS_SAFETY,
  actualExternalAgentActions: 0,
  reportedRevenueBrl: 0,
}, null, 2) + "\n");
