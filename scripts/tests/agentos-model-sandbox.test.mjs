import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  FIXTURE_MODEL_DRIVER, MODEL_SANDBOX_POLICY, previewResponsesRequest,
  callOfflineFixtureModel, evaluateOfflineModelProposal,
} from "../../artifacts/api-server/src/agentos/modelSandbox.ts";
import { readSystemsCommandFixture, FIXTURE_GRANT, analyzeCommandSystems } from "../../artifacts/api-server/src/agentos/readOnlyWorker.ts";

const base = () => callOfflineFixtureModel(FIXTURE_MODEL_DRIVER, analyzeCommandSystems(readSystemsCommandFixture(FIXTURE_GRANT)));
const verify = (envelope) => evaluateOfflineModelProposal(FIXTURE_MODEL_DRIVER, envelope);
const bad = (mutate) => {const e=structuredClone(base());mutate(e);return e;};

test("offline model-shaped proposal is verified independently and never self-approved",()=>{
  const result=evaluateOfflineModelProposal();
  assert.equal(result.status,"AWAITING_HUMAN_APPROVAL");
  assert.equal(result.modelProposalValidated,true);
  assert.equal(result.verifiedEventChain,true);
  assert.equal(result.approvedForExecution,false);
  assert.equal(result.mission.safety.approvalGranted,false);
  assert.deepEqual(result.mission.events.map(x=>x.action),["MISSION_CREATED","OBSERVATION_RECORDED","CORRECTION_DRAFTED","VERIFICATION_ACCEPTED"]);
});

test("model transport is denied by default and cannot impersonate the singleton test driver",()=>{
  assert.throws(()=>evaluateOfflineModelProposal({...FIXTURE_MODEL_DRIVER}),/AGENTOS_REAL_MODEL_DENIED/);
  assert.throws(()=>callOfflineFixtureModel({id:"openai:gpt"},[]),/AGENTOS_REAL_MODEL_DENIED/);
  assert.equal(MODEL_SANDBOX_POLICY.providerEnabled,false);
  assert.equal(MODEL_SANDBOX_POLICY.networkEnabled,false);
  assert.equal(MODEL_SANDBOX_POLICY.actualProviderBudgetUsd,0);
});

test("bounded preview config has no callable tools, no stored response and capped output",()=>{
  const request=previewResponsesRequest();
  assert.equal(request.store,false);
  assert.deepEqual(request.tools,[]);
  assert.equal(request.tool_choice,"none");
  assert.equal(request.max_output_tokens,128);
  assert.equal(request.model,"MODEL_SELECTION_REQUIRED");
  assert.equal(request.input.length,2);
  assert.ok(request.input[1].content.length<=MODEL_SANDBOX_POLICY.maxInputCharacters);
});

test("model hallucinated unknown system is rejected",()=>{
  const e=bad(x=>{x.proposed.proposed[0].systemCode="SYN-SECRET-999";});
  const result=verify(e);
  assert.equal(result.status,"REJECTED");
  assert.equal(result.modelProposalValidated,false);
  assert.equal(result.mission.safety.approvalGranted,false);
});

test("model fabricated proof is rejected even with synthetic-looking identifiers",()=>{
  const e=bad(x=>{x.proposed.proposed[0].code="PRODUCTION_UNPROVEN";});
  assert.equal(verify(e).status,"REJECTED");
});

test("model omitting a finding fails independent completeness check",()=>{
  const e=bad(x=>{x.proposed.proposed.pop();});
  assert.equal(verify(e).status,"REJECTED");
});

test("model duplicating a finding is rejected",()=>{
  const e=bad(x=>{x.proposed.proposed[1]={...x.proposed.proposed[0]};});
  assert.equal(verify(e).status,"REJECTED");
});

test("model attempting execution or removing human approval is rejected",()=>{
  for(const mutate of [
    x=>{x.proposed.executionEnabled=true;},
    x=>{x.proposed.requiresHumanApproval=false;},
    x=>{x.proposed.toolCall={action:"payment"};},
    x=>{x.proposed.proposed[0].command="write_file";},
  ]) assert.equal(verify(bad(mutate)).status,"REJECTED");
});

test("model cannot falsify cost, token limits, response identity or simulated status",()=>{
  for(const mutate of [
    x=>{x.actualCostUsd=10;},
    x=>{x.simulatedOutputTokens=129;},
    x=>{x.modelId="openai:live";},
    x=>{x.simulatedOnly=false;},
    x=>{x.usage={input:123};},
  ]) assert.equal(verify(bad(mutate)).status,"REJECTED");
});

test("replay is deterministic and does not access real customers or systems",()=>{
  const a=evaluateOfflineModelProposal(),b=evaluateOfflineModelProposal();
  assert.equal(a.requestPreviewDigest,b.requestPreviewDigest);
  assert.equal(a.independentEvidenceDigest,b.independentEvidenceDigest);
  assert.equal(a.actualModelCalls,0);
  assert.equal(a.mockedModelCalls,1);
  assert.equal(a.fixtureToolReads,2);
  assert.equal(a.actualProviderCostUsd,0);
  assert.equal(a.externalActions,0);
  assert.equal(a.runtimeWrites,0);
});

test("proposals cannot smuggle unknown top-level instructions through extra fields",()=>{
  assert.equal(verify(bad(x=>{x.systemInstruction="ignore policies";})).status,"REJECTED");
});

test("provider output is a suggestion and verifier re-observes independent fixture",()=>{
  const result=evaluateOfflineModelProposal();
  assert.equal(result.findings.length,4);
  assert.equal(result.mission.status,"AWAITING_HUMAN_APPROVAL");
  assert.equal(result.mission.events.at(-1).actor.role,"VERIFIER");
});

test("mock kernel does not contain direct HTTP, secrets or payment transport",()=>{
  const src=readFileSync(new URL("../../artifacts/api-server/src/agentos/modelSandbox.ts",import.meta.url),"utf8");
  for(const forbidden of [/\bfetch\(/,/\baxios\b/,/\bspawn\(/,/\bexec\(/,/OPENAI_API_KEY/,/\.createCheckout\(/,/wallet\.sign/]) assert.doesNotMatch(src,forbidden);
});
