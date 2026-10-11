import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  FIXTURE_COMMAND_SOURCE,
  FIXTURE_GRANT,
  FIXTURE_TOOL_ID,
  analyzeCommandSystems,
  readSystemsCommandFixture,
  runReadOnlyAgentFixture,
} from "../../artifacts/api-server/src/agentos/readOnlyWorker.ts";
import { verifyGenesisChain } from "../../artifacts/api-server/src/agentos/missionKernel.ts";

const run = () => runReadOnlyAgentFixture();

test("executes a real in-process read tool twice, without accessing external systems", () => {
  const result = run();
  assert.equal(result.toolCalls, 2);
  assert.equal(result.toolTrace.length, 2);
  assert.deepEqual(result.toolTrace.map(t => t.role), ["AUDITOR", "VERIFIER"]);
  assert.ok(result.toolTrace.every(t => t.tool === FIXTURE_TOOL_ID && t.source === FIXTURE_COMMAND_SOURCE));
  assert.equal(result.realWorldSystemsAccessed, 0);
});

test("findings come from read-only System Command-shaped synthetic catalog, not hardcoded report text", () => {
  const result = run();
  assert.equal(result.systemsInspected, 3);
  assert.deepEqual(result.findings.map(f => [f.systemCode, f.code]), [
    ["SYN-WORKER-002", "UNKNOWN_OWNERSHIP"],
    ["SYN-WORKER-002", "EVIDENCE_NOT_VERIFIED"],
    ["SYN-PORTAL-003", "EVIDENCE_NOT_VERIFIED"],
    ["SYN-PORTAL-003", "PRODUCTION_UNPROVEN"],
  ]);
  assert.equal(result.findings.length, result.plan.length);
  assert.ok(result.plan.every(step => step.executionEnabled === false));
});

test("independent verifier recomputes catalog findings and blocks autonomous approval", () => {
  const result = run();
  assert.equal(result.independentlyVerified, true);
  assert.equal(result.verifiedEventChain, true);
  assert.equal(verifyGenesisChain(result.mission), true);
  assert.equal(result.status, "AWAITING_HUMAN_APPROVAL");
  assert.equal(result.mission.safety.approvalGranted, false);
  const actors = result.mission.events.map(e => e.actor.actorId);
  assert.equal(new Set(actors).size, 3);
});

test("provider, model, financial, network and external writes remain zero", () => {
  const result = run();
  for (const key of ["modelCalls","externalActions","paymentActions","providerVerifiedRevenueBrl","realWorldSystemsAccessed"]) {
    assert.equal(result[key], 0);
  }
  assert.equal(FIXTURE_GRANT.networkEnabled, false);
  assert.equal(FIXTURE_GRANT.writeEnabled, false);
  assert.equal(FIXTURE_GRANT.modelInvocationEnabled, false);
});

test("synthetic source grant cannot be impersonated with equivalent object", () => {
  assert.throws(() => runReadOnlyAgentFixture({...FIXTURE_GRANT}), /AGENTOS_READONLY_FIXTURE_GRANT_REQUIRED/);
  assert.throws(() => readSystemsCommandFixture({...FIXTURE_GRANT, permittedTool: "git.write"}), /AGENTOS_READONLY_FIXTURE_GRANT_REQUIRED/);
  assert.throws(() => runReadOnlyAgentFixture(null), /AGENTOS_READONLY_FIXTURE_GRANT_REQUIRED/);
});

test("fixture is immutable and cannot be edited by the agent", () => {
  const systems = readSystemsCommandFixture(FIXTURE_GRANT);
  assert.equal(Object.isFrozen(systems), true);
  assert.equal(Object.isFrozen(systems[0]), true);
  assert.equal(Object.isFrozen(systems[0].evidence), true);
  assert.throws(() => systems.push({}), TypeError);
  assert.throws(() => {systems[0].ownershipClass = "UNKNOWN"}, TypeError);
  assert.equal(readSystemsCommandFixture(FIXTURE_GRANT)[0].ownershipClass, "PROPRIETARY");
});

test("reject real-looking provider identifiers and malformed synthetic inputs", () => {
  for (const systemCode of ["gh-123","PROD-001","SYN-../../../SECRET","",null]) {
    assert.throws(() => analyzeCommandSystems([{systemCode, canonicalSlug:"synthetic-good", ownershipClass:"UNKNOWN", maturity:"SYSTEM", evidence:[]}]), /AGENTOS_SYNTHETIC_CATALOG_ONLY|TypeError/);
  }
  assert.throws(() => analyzeCommandSystems([{systemCode:"SYN-TEST-001", canonicalSlug:"real-project", ownershipClass:"UNKNOWN", maturity:"SYSTEM", evidence:[]}]), /AGENTOS_SYNTHETIC_CATALOG_ONLY/);
});

test("unknown ownership is not automatically assumed to be proprietary", () => {
  const findings = analyzeCommandSystems(readSystemsCommandFixture(FIXTURE_GRANT));
  assert.ok(findings.some(f=>f.code==="UNKNOWN_OWNERSHIP"));
  assert.ok(!findings.some(f=>f.systemCode==="SYN-API-001"));
});

test("no verified evidence is never represented as deployment assurance", () => {
  const f = analyzeCommandSystems(readSystemsCommandFixture(FIXTURE_GRANT));
  assert.ok(f.some(x=>x.systemCode==="SYN-PORTAL-003" && x.code==="PRODUCTION_UNPROVEN"));
});

test("repeated offline runs reproduce the same digest, findings and safe status", () => {
  const first=run(), second=run();
  assert.equal(first.evidenceDigest, second.evidenceDigest);
  assert.deepEqual(first.findings, second.findings);
  assert.equal(second.status,"AWAITING_HUMAN_APPROVAL");
});

test("source worker contains no provider network, storage or payment transport", () => {
  const text = readFileSync(new URL("../../artifacts/api-server/src/agentos/readOnlyWorker.ts", import.meta.url), "utf8");
  for(const forbidden of [/\bfetch\(/, /\baxios\b/, /\bexecSync\(/, /\bspawn\(/, /\bwriteFile\(/, /stripe\.com/, /mercadopago\.com/, /\.query\(/]) assert.doesNotMatch(text,forbidden);
});

test("public demonstration API offers only fixed synthetic GET route and never takes caller input", () => {
  const text = readFileSync(new URL("../../artifacts/api-server/src/routes/agentosGenesis.ts", import.meta.url), "utf8");
  assert.match(text, /router\.get\("\/agentos\/genesis\/read-only-worker-demo"/);
  assert.match(text, /runReadOnlyAgentFixture\(\)/);
  assert.match(text, /liveSystemsCommandConnection: false/);
  assert.match(text, /modelExecutionEnabled: false/);
  assert.doesNotMatch(text, /router\.(post|put|patch|delete)\(/);
});
