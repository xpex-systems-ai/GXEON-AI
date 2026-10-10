/**
 * GXEON AgentOS Genesis P0 — synthetic-only mission journal.
 *
 * This module invokes NO models, MCP tools, external providers, payment APIs,
 * filesystem writes, deployments or authentication APIs. Actor IDs are test
 * assertions, not verified identities. An authenticated runtime and a durable
 * event store must be implemented and independently approved before production.
 */
import { createHash } from "node:crypto";

export type GenesisRole = "AUDITOR" | "ENGINEER" | "VERIFIER";
export type GenesisRisk = "R0" | "R1";
export type GenesisStatus =
  | "CREATED"
  | "AUDITED"
  | "DRAFTED"
  | "AWAITING_HUMAN_APPROVAL"
  | "REJECTED"
  | "CANCELLED";
export type GenesisAction =
  | "MISSION_CREATED"
  | "OBSERVATION_RECORDED"
  | "CORRECTION_DRAFTED"
  | "VERIFICATION_ACCEPTED"
  | "VERIFICATION_REJECTED"
  | "MISSION_CANCELLED";

export const GENESIS_SAFETY = Object.freeze({
  mode: "SYNTHETIC_PREVIEW_ONLY",
  storage: "IN_MEMORY_SNAPSHOT_ONLY",
  externalWritesEnabled: false,
  githubWriteEnabled: false,
  productionDeploymentEnabled: false,
  paymentEnabled: false,
  walletSigningEnabled: false,
  externalContactEnabled: false,
  autonomousExecutionEnabled: false,
  providerVerifiedRevenueBrl: 0,
  realRevenueClaimed: false,
  authenticatedOperatorPresent: false,
  approvalGranted: false,
} as const);

export interface GenesisActor {
  role: GenesisRole;
  actorId: string;
}

export interface GenesisEvent {
  sequence: number;
  action: GenesisAction;
  actor: GenesisActor;
  reference: string;
  previousDigest: string;
  digest: string;
}

export interface GenesisMission {
  missionId: string;
  objective: string;
  sourceRef: string;
  risk: GenesisRisk;
  status: GenesisStatus;
  maxEvents: 5;
  budgetUsd: 0;
  events: readonly GenesisEvent[];
  safety: typeof GENESIS_SAFETY;
}

const AGENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}$/;
const FIXTURE_REF = /^fixture:\/\/[a-zA-Z0-9][a-zA-Z0-9_.\/-]{2,160}$/;

function validateActor(actor: GenesisActor, expected: GenesisRole) {
  if (!actor || actor.role !== expected || !AGENT_ID.test(actor.actorId)) {
    throw new Error("GENESIS_ROLE_OR_ACTOR_DENIED");
  }
}

function requireFixture(value: string) {
  if (typeof value !== "string" || !FIXTURE_REF.test(value) || value.includes("..")) {
    throw new Error("GENESIS_SYNTHETIC_FIXTURE_REQUIRED");
  }
}

function eventDigest(
  missionId: string,
  sequence: number,
  action: GenesisAction,
  actor: GenesisActor,
  reference: string,
  previousDigest: string,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ missionId, sequence, action, actor, reference, previousDigest }))
    .digest("hex");
}

function makeEvent(
  missionId: string,
  events: readonly GenesisEvent[],
  action: GenesisAction,
  actor: GenesisActor,
  reference: string,
): GenesisEvent {
  const sequence = events.length + 1;
  const previousDigest = events.at(-1)?.digest ?? "GENESIS";
  return {
    sequence,
    action,
    actor: { role: actor.role, actorId: actor.actorId },
    reference,
    previousDigest,
    digest: eventDigest(missionId, sequence, action, actor, reference, previousDigest),
  };
}

export function verifyGenesisChain(mission: GenesisMission): boolean {
  if (!mission || !Array.isArray(mission.events) || mission.events.length < 1 || mission.events.length > 5) {
    return false;
  }
  let previousDigest = "GENESIS";
  for (let index = 0; index < mission.events.length; index++) {
    const event = mission.events[index];
    if (
      event.sequence !== index + 1 ||
      event.previousDigest !== previousDigest ||
      event.digest !== eventDigest(mission.missionId, index + 1, event.action, event.actor, event.reference, previousDigest)
    ) return false;
    previousDigest = event.digest;
  }
  const last: GenesisEvent | undefined = mission.events.at(-1) as GenesisEvent | undefined;
  const stateByAction: Record<GenesisAction, GenesisStatus> = {
    MISSION_CREATED: "CREATED",
    OBSERVATION_RECORDED: "AUDITED",
    CORRECTION_DRAFTED: "DRAFTED",
    VERIFICATION_ACCEPTED: "AWAITING_HUMAN_APPROVAL",
    VERIFICATION_REJECTED: "REJECTED",
    MISSION_CANCELLED: "CANCELLED",
  };
  if (!last || stateByAction[last.action] !== mission.status) return false;
  if (mission.events[0].action !== "MISSION_CREATED") return false;
  return (
    mission.sourceRef === mission.events[0].reference &&
    mission.safety === GENESIS_SAFETY &&
    mission.budgetUsd === 0 &&
    mission.maxEvents === 5 &&
    (mission.risk === "R0" || mission.risk === "R1")
  );
}

export function createGenesisMission(input: {
  missionId: string;
  objective: string;
  sourceRef: string;
  risk: GenesisRisk;
  auditor: GenesisActor;
}): GenesisMission {
  if (!input || !AGENT_ID.test(input.missionId) || typeof input.objective !== "string" ||
      input.objective.trim().length < 12 || input.objective.length > 240) {
    throw new Error("GENESIS_INVALID_MISSION");
  }
  if (input.risk !== "R0" && input.risk !== "R1") throw new Error("GENESIS_RISK_NOT_SUPPORTED");
  requireFixture(input.sourceRef);
  validateActor(input.auditor, "AUDITOR");
  const initialEvent = makeEvent(input.missionId, [], "MISSION_CREATED", input.auditor, input.sourceRef);
  return {
    missionId: input.missionId,
    objective: input.objective.trim(),
    sourceRef: input.sourceRef,
    risk: input.risk,
    status: "CREATED",
    maxEvents: 5,
    budgetUsd: 0,
    events: [initialEvent],
    safety: GENESIS_SAFETY,
  };
}

function advance(
  mission: GenesisMission,
  expected: GenesisStatus,
  next: GenesisStatus,
  action: GenesisAction,
  actor: GenesisActor,
  role: GenesisRole,
  reference: string,
): GenesisMission {
  if (!verifyGenesisChain(mission) || mission.status !== expected) throw new Error("GENESIS_TRANSITION_DENIED");
  validateActor(actor, role);
  requireFixture(reference);
  if (mission.events.length >= mission.maxEvents) throw new Error("GENESIS_EVENT_LIMIT");
  return {
    ...mission,
    status: next,
    events: [...mission.events, makeEvent(mission.missionId, mission.events, action, actor, reference)],
  };
}

export function recordGenesisAudit(mission: GenesisMission, auditor: GenesisActor, evidenceRef: string) {
  if (mission.events[0]?.actor.actorId !== auditor.actorId) throw new Error("GENESIS_AUDITOR_MISMATCH");
  return advance(mission, "CREATED", "AUDITED", "OBSERVATION_RECORDED", auditor, "AUDITOR", evidenceRef);
}

export function draftGenesisCorrection(mission: GenesisMission, engineer: GenesisActor, draftRef: string) {
  if (mission.events[0]?.actor.actorId === engineer.actorId) throw new Error("GENESIS_ROLE_SEPARATION_REQUIRED");
  return advance(mission, "AUDITED", "DRAFTED", "CORRECTION_DRAFTED", engineer, "ENGINEER", draftRef);
}

export function verifyGenesisDraft(
  mission: GenesisMission,
  verifier: GenesisActor,
  proofRef: string,
  accepted: boolean,
) {
  if (typeof accepted !== "boolean") throw new Error("GENESIS_VERIFICATION_REQUIRED");
  if (mission.events.some((event) => event.actor.actorId === verifier.actorId)) {
    throw new Error("GENESIS_INDEPENDENT_VERIFIER_REQUIRED");
  }
  return advance(
    mission,
    "DRAFTED",
    accepted ? "AWAITING_HUMAN_APPROVAL" : "REJECTED",
    accepted ? "VERIFICATION_ACCEPTED" : "VERIFICATION_REJECTED",
    verifier,
    "VERIFIER",
    proofRef,
  );
}

/** Cancellation records a decision in a synthetic ledger; it cannot change external state. */
export function cancelGenesisMission(mission: GenesisMission, auditor: GenesisActor, reasonRef: string) {
  if (mission.events[0]?.actor.actorId !== auditor.actorId) throw new Error("GENESIS_AUDITOR_MISMATCH");
  if (!["CREATED", "AUDITED", "DRAFTED"].includes(mission.status)) throw new Error("GENESIS_CANCEL_DENIED");
  return advance(mission, mission.status, "CANCELLED", "MISSION_CANCELLED", auditor, "AUDITOR", reasonRef);
}
