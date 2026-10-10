import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GENESIS_SAFETY,
  cancelGenesisMission,
  createGenesisMission,
  draftGenesisCorrection,
  recordGenesisAudit,
  verifyGenesisChain,
  verifyGenesisDraft,
} from "../../artifacts/api-server/src/agentos/missionKernel.ts";

const AUDITOR = { role: "AUDITOR", actorId: "auditor_001" };
const ENGINEER = { role: "ENGINEER", actorId: "engineer_001" };
const VERIFIER = { role: "VERIFIER", actorId: "verifier_001" };
const seed = () => createGenesisMission({
  missionId: "xpex_genesis_001",
  objective: "Audit synthetic API fixtures without external side effects",
  sourceRef: "fixture://repos/example-api",
  risk: "R0",
  auditor: AUDITOR,
});
const audited = () => recordGenesisAudit(seed(), AUDITOR, "fixture://reports/audit-001");
const drafted = () => draftGenesisCorrection(audited(), ENGINEER, "fixture://drafts/patch-001");

test("an audited, drafted and independently verified synthetic mission remains awaiting human approval", () => {
  const mission = verifyGenesisDraft(drafted(), VERIFIER, "fixture://proof/ci-001", true);
  assert.equal(mission.status, "AWAITING_HUMAN_APPROVAL");
  assert.deepEqual(mission.events.map((event) => event.action), [
    "MISSION_CREATED", "OBSERVATION_RECORDED", "CORRECTION_DRAFTED", "VERIFICATION_ACCEPTED",
  ]);
  assert.equal(verifyGenesisChain(mission), true);
  assert.equal(mission.safety.approvalGranted, false);
});

test("all prohibited financial, GitHub, production and autonomous effects fail closed", () => {
  for (const key of [
    "externalWritesEnabled", "githubWriteEnabled", "productionDeploymentEnabled",
    "paymentEnabled", "walletSigningEnabled", "externalContactEnabled",
    "autonomousExecutionEnabled", "authenticatedOperatorPresent", "approvalGranted",
    "realRevenueClaimed",
  ]) assert.equal(GENESIS_SAFETY[key], false, key);
  assert.equal(GENESIS_SAFETY.providerVerifiedRevenueBrl, 0);
  assert.equal(GENESIS_SAFETY.mode, "SYNTHETIC_PREVIEW_ONLY");
  assert.equal(GENESIS_SAFETY.storage, "IN_MEMORY_SNAPSHOT_ONLY");
});

test("reject real provider URLs, untrusted references, credential paths and path traversal", () => {
  for (const sourceRef of [
    "https://github.com/example/repo", "git@github.com:x/y.git", "../secrets", "fixture://../prod",
    "fixture://alpha/../../secrets", "fixture://", "file:///etc/passwd",
  ]) assert.throws(() => createGenesisMission({
    missionId: "safe_mission_001", objective: "Check only synthetic artifacts today",
    sourceRef, risk: "R0", auditor: AUDITOR,
  }), /GENESIS_SYNTHETIC_FIXTURE_REQUIRED/);
});

test("risk R2–R4 never enters Genesis P0", () => {
  for (const risk of ["R2", "R3", "R4", "PRODUCTION", undefined]) {
    assert.throws(() => createGenesisMission({
      missionId: "safe_mission_001", objective: "Check only synthetic artifacts today",
      sourceRef: "fixture://sample/repo", risk, auditor: AUDITOR,
    }), /GENESIS_RISK_NOT_SUPPORTED/);
  }
});

test("an engineer cannot be the original auditor with the same identity", () => {
  assert.throws(() => draftGenesisCorrection(audited(), {role:"ENGINEER",actorId:AUDITOR.actorId}, "fixture://drafts/a"), /GENESIS_ROLE_SEPARATION_REQUIRED/);
});

test("the verifier must be independent of both auditor and engineer", () => {
  for (const actorId of [AUDITOR.actorId, ENGINEER.actorId]) {
    assert.throws(() => verifyGenesisDraft(drafted(), {role:"VERIFIER",actorId}, "fixture://proof/ci-002", true), /GENESIS_INDEPENDENT_VERIFIER_REQUIRED/);
  }
});

test("an incorrect role cannot perform the next operation", () => {
  assert.throws(() => recordGenesisAudit(seed(), ENGINEER, "fixture://reports/audit-001"), /GENESIS_AUDITOR_MISMATCH/);
  assert.throws(() => draftGenesisCorrection(audited(), AUDITOR, "fixture://drafts/a"), /GENESIS_ROLE_SEPARATION_REQUIRED/);
  assert.throws(() => verifyGenesisDraft(drafted(), {role:"ENGINEER",actorId:"other_001"}, "fixture://proof/ci-001", true), /GENESIS_ROLE_OR_ACTOR_DENIED/);
});

test("a mission cannot skip required audit or drafting transitions", () => {
  assert.throws(() => draftGenesisCorrection(seed(), ENGINEER, "fixture://drafts/patch-001"), /GENESIS_TRANSITION_DENIED/);
  assert.throws(() => verifyGenesisDraft(audited(), VERIFIER, "fixture://proof/ci-001", true), /GENESIS_TRANSITION_DENIED/);
});

test("rejected verification cannot be marked approved or retried without new review", () => {
  const rejected = verifyGenesisDraft(drafted(), VERIFIER, "fixture://proof/failure-001", false);
  assert.equal(rejected.status, "REJECTED");
  assert.equal(verifyGenesisChain(rejected), true);
  assert.throws(() => verifyGenesisDraft(rejected, {role:"VERIFIER",actorId:"verifier_002"}, "fixture://proof/ci-001", true), /GENESIS_TRANSITION_DENIED/);
});

test("cancellation is terminal and creates a verifiable synthetic event", () => {
  const cancelled = cancelGenesisMission(audited(), AUDITOR, "fixture://cancel/operator-request");
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(verifyGenesisChain(cancelled), true);
  assert.throws(() => draftGenesisCorrection(cancelled, ENGINEER, "fixture://drafts/a"), /GENESIS_TRANSITION_DENIED/);
});

test("tampered event evidence and fake status are detectable", () => {
  const draft = drafted();
  const tampered = { ...draft, events: draft.events.map((e, i) => i === 1 ? {...e, reference: "fixture://reports/other"} : e) };
  assert.equal(verifyGenesisChain(tampered), false);
  assert.equal(verifyGenesisChain({ ...draft, status: "AWAITING_HUMAN_APPROVAL" }), false);
});

test("a mission cannot duplicate actors by changing the action role", () => {
  assert.throws(() => createGenesisMission({
    missionId: "m_001", objective: "Audit synthetic code in bounded mode",
    sourceRef: "fixture://repos/demo", risk: "R1", auditor: {role:"VERIFIER",actorId:"bad_001"},
  }), /GENESIS_ROLE_OR_ACTOR_DENIED/);
});

test("source kernel contains no agent credential, network, payment or provider invocation paths", () => {
  const source = readFileSync(new URL("../../artifacts/api-server/src/agentos/missionKernel.ts", import.meta.url), "utf8");
  for (const forbidden of [ /\bfetch\(/, /\baxios\b/, /\bexecSync\(/, /\bspawn\(/, /\bwriteFile\(/, /\brequest\(/, /stripe\.com/, /mercadopago\.com/ ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test("AgentOS API exposes fixed-fixture read-only routes, never execution or payment endpoints", () => {
  const routes = readFileSync(new URL("../../artifacts/api-server/src/routes/agentosGenesis.ts", import.meta.url), "utf8");
  const index = readFileSync(new URL("../../artifacts/api-server/src/routes/index.ts", import.meta.url), "utf8");
  assert.match(routes, /router\.get\("\/agentos\/genesis\/status"/);
  assert.match(routes, /router\.get\("\/agentos\/genesis\/synthetic-demo"/);
  assert.doesNotMatch(routes, /router\.(post|put|patch|delete)\(/);
  assert.match(routes, /missionExecutionAvailable: false/);
  assert.match(routes, /actualExternalActions: 0/);
  assert.match(index, /router\.use\(agentosGenesisRouter\)/);
});
