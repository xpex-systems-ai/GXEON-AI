/**
 * GXEON AgentOS P1 — deterministic read-only worker over a FIXED synthetic
 * Systems Command-shaped catalog. No LLM, live provider, database or network.
 * A fixture grant is NOT authentication; live integration is deliberately absent.
 */
import { createHash } from "node:crypto";
import {
  createGenesisMission,
  recordGenesisAudit,
  draftGenesisCorrection,
  verifyGenesisDraft,
  verifyGenesisChain,
} from "./missionKernel";

export type CommandOwnership = "PROPRIETARY" | "FORK" | "EXTERNAL" | "UNKNOWN";
export type CommandMaturity = "DISCOVERED" | "PROTOTYPE" | "SYSTEM" | "PRODUCT" | "PRODUCTION";
export type CommandVerification = "UNVERIFIED" | "DISCOVERED" | "CORROBORATED" | "VERIFIED" | "REJECTED";

export interface ReadOnlyCommandSystem {
  readonly systemCode: string;
  readonly canonicalSlug: string;
  readonly ownershipClass: CommandOwnership;
  readonly maturity: CommandMaturity;
  readonly evidence: readonly {
    readonly evidenceId: string;
    readonly verificationStatus: CommandVerification;
  }[];
}
export interface ReadOnlyFinding {
  readonly systemCode: string;
  readonly code: "UNKNOWN_OWNERSHIP" | "EVIDENCE_NOT_VERIFIED" | "PRODUCTION_UNPROVEN";
  readonly severity: "REVIEW";
}
export type ReadOnlyPlanStep = {
  readonly systemCode: string;
  readonly proposedAction: "REVIEW_OWNERSHIP" | "VERIFY_SOURCE_EVIDENCE" | "REQUIRE_RELEASE_REVIEW";
  readonly executionEnabled: false;
};

export const FIXTURE_COMMAND_SOURCE = "fixture://repos/systems-command-catalog-v1";
export const FIXTURE_TOOL_ID = "systems_command.catalog.read_fixture_v1";
export const FIXTURE_GRANT = Object.freeze({
  purpose: "TEST_ONLY_NOT_AUTHENTICATION",
  source: FIXTURE_COMMAND_SOURCE,
  permittedTool: FIXTURE_TOOL_ID,
  risk: "R0",
  maxToolCalls: 2,
  networkEnabled: false,
  writeEnabled: false,
  modelInvocationEnabled: false,
} as const);

const commandFixture: readonly ReadOnlyCommandSystem[] = Object.freeze([
  Object.freeze({
    systemCode: "SYN-API-001", canonicalSlug: "synthetic-api",
    ownershipClass: "PROPRIETARY" as const, maturity: "SYSTEM" as const,
    evidence: Object.freeze([Object.freeze({ evidenceId: "SYN-EV-API", verificationStatus: "VERIFIED" as const })]),
  }),
  Object.freeze({
    systemCode: "SYN-WORKER-002", canonicalSlug: "synthetic-worker",
    ownershipClass: "UNKNOWN" as const, maturity: "PROTOTYPE" as const,
    evidence: Object.freeze([Object.freeze({ evidenceId: "SYN-EV-WORKER", verificationStatus: "DISCOVERED" as const })]),
  }),
  Object.freeze({
    systemCode: "SYN-PORTAL-003", canonicalSlug: "synthetic-portal",
    ownershipClass: "FORK" as const, maturity: "PRODUCTION" as const,
    evidence: Object.freeze([Object.freeze({ evidenceId: "SYN-EV-PORTAL", verificationStatus: "UNVERIFIED" as const })]),
  }),
]);

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function assertFixtureGrant(grant: typeof FIXTURE_GRANT) {
  if (grant !== FIXTURE_GRANT ||
      grant.purpose !== "TEST_ONLY_NOT_AUTHENTICATION" ||
      grant.source !== FIXTURE_COMMAND_SOURCE ||
      grant.permittedTool !== FIXTURE_TOOL_ID ||
      grant.maxToolCalls !== 2 ||
      grant.networkEnabled !== false ||
      grant.writeEnabled !== false ||
      grant.modelInvocationEnabled !== false ||
      grant.risk !== "R0") {
    throw new Error("AGENTOS_READONLY_FIXTURE_GRANT_REQUIRED");
  }
}
export function readSystemsCommandFixture(grant: typeof FIXTURE_GRANT): readonly ReadOnlyCommandSystem[] {
  assertFixtureGrant(grant);
  // The only permitted tool obtains a fixed in-repository fixture, never data from a provider.
  return commandFixture;
}
export function analyzeCommandSystems(systems: readonly ReadOnlyCommandSystem[]): readonly ReadOnlyFinding[] {
  if (!Array.isArray(systems) || systems.length > 10 ||
      systems.some(s => !/^SYN-[A-Z]+-\d{3}$/.test(s.systemCode) ||
        !/^synthetic-[a-z-]+$/.test(s.canonicalSlug) ||
        !["PROPRIETARY", "FORK", "EXTERNAL", "UNKNOWN"].includes(s.ownershipClass) ||
        !["DISCOVERED", "PROTOTYPE", "SYSTEM", "PRODUCT", "PRODUCTION"].includes(s.maturity) ||
        !Array.isArray(s.evidence) ||
        s.evidence.some(e => !/^SYN-EV-[A-Z]+$/.test(e.evidenceId) ||
          !["UNVERIFIED", "DISCOVERED", "CORROBORATED", "VERIFIED", "REJECTED"].includes(e.verificationStatus))
      )) throw new Error("AGENTOS_SYNTHETIC_CATALOG_ONLY");
  const findings: ReadOnlyFinding[] = [];
  for (const system of systems) {
    const evidenceVerified = system.evidence.some(ev => ev.verificationStatus === "VERIFIED");
    if (system.ownershipClass === "UNKNOWN") {
      findings.push({systemCode: system.systemCode, code: "UNKNOWN_OWNERSHIP", severity: "REVIEW"});
    }
    if (!evidenceVerified) {
      findings.push({systemCode: system.systemCode, code: "EVIDENCE_NOT_VERIFIED", severity: "REVIEW"});
      if (system.maturity === "PRODUCTION") {
        findings.push({systemCode: system.systemCode, code: "PRODUCTION_UNPROVEN", severity: "REVIEW"});
      }
    }
  }
  return findings;
}
function derivePlan(findings: readonly ReadOnlyFinding[]): readonly ReadOnlyPlanStep[] {
  const actionByFinding: Record<ReadOnlyFinding["code"], ReadOnlyPlanStep["proposedAction"]> = {
    UNKNOWN_OWNERSHIP: "REVIEW_OWNERSHIP",
    EVIDENCE_NOT_VERIFIED: "VERIFY_SOURCE_EVIDENCE",
    PRODUCTION_UNPROVEN: "REQUIRE_RELEASE_REVIEW",
  };
  return findings.map(f => ({
    systemCode: f.systemCode,
    proposedAction: actionByFinding[f.code],
    executionEnabled: false as const,
  }));
}

/** Executes exactly two in-process fixture reads, with distinct logical agent roles. */
export function runReadOnlyAgentFixture(grant: typeof FIXTURE_GRANT = FIXTURE_GRANT) {
  assertFixtureGrant(grant);
  const auditor = { role: "AUDITOR" as const, actorId: "gxeon_fixture_auditor" };
  const engineer = { role: "ENGINEER" as const, actorId: "gxeon_fixture_engineer" };
  const verifier = { role: "VERIFIER" as const, actorId: "gxeon_fixture_verifier" };
  let toolCalls = 0;
  const firstRead = readSystemsCommandFixture(grant); toolCalls++;
  const findings = analyzeCommandSystems(firstRead);
  const evidenceDigest = sha256({ systems: firstRead, findings });
  let mission = createGenesisMission({
    missionId: "gxeon_readonly_worker_p1",
    objective: "Inspect synthetic Systems Command metadata and identify evidence and ownership gaps",
    sourceRef: FIXTURE_COMMAND_SOURCE,
    risk: "R0", auditor,
  });
  mission = recordGenesisAudit(mission, auditor, "fixture://reports/read-only-audit");
  const plan = derivePlan(findings);
  mission = draftGenesisCorrection(mission, engineer, "fixture://drafts/remediation-plan");
  const verificationRead = readSystemsCommandFixture(grant); toolCalls++;
  const independentFindings = analyzeCommandSystems(verificationRead);
  const independentlyVerified =
    sha256({ systems: verificationRead, findings: independentFindings }) === evidenceDigest &&
    sha256(derivePlan(independentFindings)) === sha256(plan) &&
    toolCalls === grant.maxToolCalls;
  mission = verifyGenesisDraft(
    mission, verifier,
    independentlyVerified ? "fixture://proof/verification-pass" : "fixture://proof/verification-failed",
    independentlyVerified,
  );
  return {
    status: mission.status,
    synthetic: true as const,
    type: "DETERMINISTIC_READONLY_WORKER_NO_LLM" as const,
    systemsInspected: firstRead.length,
    findings,
    plan,
    evidenceDigest,
    toolTrace: [
      { tool: FIXTURE_TOOL_ID, role: "AUDITOR", source: FIXTURE_COMMAND_SOURCE, effect: "IN_PROCESS_FIXTURE_READ" },
      { tool: FIXTURE_TOOL_ID, role: "VERIFIER", source: FIXTURE_COMMAND_SOURCE, effect: "IN_PROCESS_FIXTURE_READ" },
    ],
    toolCalls,
    independentlyVerified,
    verifiedEventChain: verifyGenesisChain(mission),
    mission,
    externalActions: 0 as const,
    modelCalls: 0 as const,
    paymentActions: 0 as const,
    providerVerifiedRevenueBrl: 0 as const,
    realWorldSystemsAccessed: 0 as const,
  };
}
