import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  buildRealSandboxRequest, calculatePreflightReservationUsd,
  createApprovedOneShotSandbox, estimateObservedCostUsd,
  REAL_SANDBOX_GUARD, GXEON15_APPROVAL_INSTRUCTION,
} from "../../artifacts/api-server/src/agentos/realModelSandbox.ts";

const NOW=Date.parse("2026-10-10T22:00:00.000Z");
const valid=()=>({
 enabled:true,
 isolatedEnvironment:"synthetic-only",
 explicitApproval:GXEON15_APPROVAL_INSTRUCTION,
 approvedCapUsd:0.01,
 priceReviewedAt:new Date(NOW).toISOString(),
 apiKey:"sk-test_XXXXXXXXXXXXXXXXXXXXXXXX",
});
const proposals=[
 {systemCode:"SYN-WORKER-002",code:"UNKNOWN_OWNERSHIP"},
 {systemCode:"SYN-WORKER-002",code:"EVIDENCE_NOT_VERIFIED"},
 {systemCode:"SYN-PORTAL-003",code:"EVIDENCE_NOT_VERIFIED"},
 {systemCode:"SYN-PORTAL-003",code:"PRODUCTION_UNPROVEN"},
];
const fakeResponse=(proposal={proposed:proposals}, usage={
 input_tokens:220, output_tokens:90, input_tokens_details:{cached_tokens:20},
}, status="completed")=>({
 status,
 output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(proposal)}]}],
 usage,
});
const fake=(json=fakeResponse(), onCall=()=>{})=>{
 let called=0;
 const fetcher=async(url,opts)=>{
  called++;onCall(url,opts);
  return new Response(JSON.stringify(json),{status:200,headers:{"content-type":"application/json"}});
 };
 return {fetcher,get calls(){return called}};
};
const execute=async(response=fakeResponse(),config=valid())=>{
 const t=fake(response);
 return {outcome:await createApprovedOneShotSandbox(config,t.fetcher,()=>NOW).run(),called:t.calls};
};

test("real provider is blocked before transport without opt-in",async()=>{
 const t=fake(),c=valid();c.enabled=false;
 await assert.rejects(createApprovedOneShotSandbox(c,t.fetcher,()=>NOW).run(),/GXEON15_APPROVAL_OR_BUDGET_REQUIRED/);
 assert.equal(t.calls,0);
});
test("explicit one-shot approval text and isolated-environment scope required",async()=>{
 for(const change of [
  c=>{c.explicitApproval="yes"},
  c=>{c.isolatedEnvironment="production"},
  c=>{c.apiKey="not-a-key"},
  c=>{c.apiKey=""},
 ]) {
  const c=valid();change(c);const t=fake();
  await assert.rejects(createApprovedOneShotSandbox(c,t.fetcher,()=>NOW).run(),/GXEON15_APPROVAL_OR_BUDGET_REQUIRED/);
  assert.equal(t.calls,0);
 }
});
test("approved cost must exceed conservative reservation but cannot exceed pilot cap",async()=>{
 for(const cap of [0,1e-8,0.0003,0.06,NaN,-1]) {
  const c=valid();c.approvedCapUsd=cap;const t=fake();
  await assert.rejects(createApprovedOneShotSandbox(c,t.fetcher,()=>NOW).run(),/GXEON15_APPROVAL_OR_BUDGET_REQUIRED/);
  assert.equal(t.calls,0);
 }
 assert.ok(calculatePreflightReservationUsd()>0);
 assert.ok(calculatePreflightReservationUsd()<0.01);
});
test("reconfirmation of provider token pricing expires after 24 hours or future timestamps",async()=>{
 for(const when of [NOW-86400001,NOW+1,Date.parse("2025-10-10"),NaN]) {
  const c=valid();c.priceReviewedAt=Number.isFinite(when)?new Date(when).toISOString():"invalid";const t=fake();
  await assert.rejects(createApprovedOneShotSandbox(c,t.fetcher,()=>NOW).run(),/GXEON15_PRICE_ATTESTATION_EXPIRED/);
  assert.equal(t.calls,0);
 }
});
test("request is fixed to synthetic data, no tools, no state storage and strict schema",()=>{
 const req=buildRealSandboxRequest();
 assert.equal(req.model,"gpt-5.6-luna");
 assert.equal(req.store,false);
 assert.equal(req.background,false);
 assert.equal(req.stream,false);
 assert.deepEqual(req.tools,[]);
 assert.equal(req.tool_choice,"none");
 assert.equal(req.max_output_tokens,256);
 assert.equal(req.text.format.strict,true);
 assert.equal(req.text.format.schema.additionalProperties,false);
 assert.ok(req.input[1].content.includes("SYN-WORKER-002"));
 assert.ok(!req.input[1].content.includes("OPENAI_API_KEY"));
});
test("approved one shot uses exact fixed endpoint and never redirects",async()=>{
 let headers=null;
 const t=fake(fakeResponse(),(url,opt)=>{
  assert.equal(url,"https://api.openai.com/v1/responses");
  assert.equal(opt.method,"POST");
  assert.equal(opt.redirect,"error");
  assert.equal(opt.headers.Authorization,"Bearer "+valid().apiKey);
  headers=opt.headers;
  const body=JSON.parse(opt.body);
  assert.deepEqual(body.tools,[]);
  assert.equal(body.store,false);
  assert.equal(body.text.format.type,"json_schema");
 });
 const outcome=await createApprovedOneShotSandbox(valid(),t.fetcher,()=>NOW).run();
 assert.ok(headers);
 assert.equal(t.calls,1);
 assert.equal(outcome.status,"AWAITING_HUMAN_APPROVAL");
 assert.equal(outcome.approvalsGranted,false);
 assert.equal(outcome.toolsAdvertisedToModel,0);
 assert.equal(outcome.writesMade,0);
 assert.equal(outcome.providerInvoiceReconciled,false);
 assert.equal(outcome.providerCalls,1);
});
test("verified model output is checked against independently re-read synthetic source",async()=>{
 const {outcome}=await execute();
 assert.equal(outcome.verifiedByIndependentLogic,true);
 assert.equal(outcome.missionChainVerified,true);
 assert.equal(outcome.providerUsage.inputTokens,220);
 assert.equal(outcome.providerUsage.cachedInputTokens,20);
 assert.equal(outcome.providerUsage.outputTokens,90);
 assert.ok(outcome.estimatedCostUsd>0);
 assert.equal(outcome.decision,"PROPOSAL_MATCHED");
});
test("hallucinated provider findings are never approved",async()=>{
 const {outcome}=await execute(fakeResponse({proposed:[...proposals.slice(0,3),{systemCode:"SYN-PORTAL-003",code:"UNKNOWN_OWNERSHIP"}]}));
 assert.equal(outcome.status,"REJECTED");
 assert.equal(outcome.decision,"PROPOSAL_REJECTED");
});
test("missing, duplicate and injected output fields are rejected",async()=>{
 for(const payload of [
  {proposed:proposals.slice(1)},
  {proposed:[proposals[0],proposals[0],...proposals.slice(2)]},
  {proposed:proposals,executionEnabled:true},
  {proposed:[{...proposals[0],transferFunds:true},...proposals.slice(1)]},
 ]) {
  const {outcome}=await execute(fakeResponse(payload));
  assert.equal(outcome.status,"REJECTED");
 }
});
test("incomplete provider response cannot become approved",async()=>{
 const {outcome}=await execute(fakeResponse({proposed:proposals},undefined,"incomplete"));
 assert.equal(outcome.status,"REJECTED");
});
test("missing usage rejects outcome, does not imply zero provider billing",async()=>{
 const {outcome}=await execute({...fakeResponse(),usage:null});
 assert.equal(outcome.status,"REJECTED");
 assert.equal(outcome.providerUsage,null);
 assert.equal(outcome.estimatedCostUsd,null);
 assert.equal(outcome.decision,"USAGE_UNVERIFIED");
 assert.equal(outcome.providerInvoiceReconciled,false);
});
test("unusually high or invalid usage is not accepted",async()=>{
 for(const usage of [
  {input_tokens:3000,output_tokens:5},
  {input_tokens:20,output_tokens:260},
  {input_tokens:2,output_tokens:20,input_tokens_details:{cached_tokens:4}},
  {input_tokens:-1,output_tokens:3},
 ]) {
  const {outcome}=await execute(fakeResponse({proposed:proposals},usage));
  assert.equal(outcome.status,"REJECTED");
  assert.equal(outcome.estimatedCostUsd,null);
 }
});
test("no retry and process-local one-shot lock even after failed transport",async()=>{
 let count=0;
 const f=async()=>{count++;throw new Error("PROVIDER_DOWN")};
 const session=createApprovedOneShotSandbox(valid(),f,()=>NOW);
 await assert.rejects(session.run(),/PROVIDER_DOWN/);
 await assert.rejects(session.run(),/GXEON15_ONE_SHOT_ALREADY_USED/);
 assert.equal(count,1);
});
test("concurrent runs cannot both issue a paid request",async()=>{
 let called=0;
 const f=async()=>{called++;return new Response(JSON.stringify(fakeResponse()),{status:200})};
 const session=createApprovedOneShotSandbox(valid(),f,()=>NOW);
 const results=await Promise.allSettled([session.run(),session.run()]);
 assert.equal(called,1);
 assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
 assert.equal(results.filter(x=>x.status==="rejected").length,1);
});
test("timeout and operator AbortSignal propagate; run stays spent/locked",async()=>{
 let called=0;const controller=new AbortController();controller.abort();
 const f=async(_url,opts)=>{called++;assert.equal(opts.signal.aborted,true);throw new Error("ABORTED")};
 const s=createApprovedOneShotSandbox(valid(),f,()=>NOW);
 await assert.rejects(s.run(controller.signal),/ABORTED/);
 await assert.rejects(s.run(),/GXEON15_ONE_SHOT_ALREADY_USED/);
 assert.equal(called,1);
});
test("non-success HTTP response is redacted from errors",async()=>{
 const f=async()=>new Response("private: owner billing account info",{status:401});
 await assert.rejects(createApprovedOneShotSandbox(valid(),f,()=>NOW).run(),e=>{
  assert.equal(e.message,"GXEON15_PROVIDER_HTTP_FAILURE");
  assert.ok(!e.message.includes("private"));
  return true;
 });
});
test("provider token costs are estimates from usage, not reconciled billing",()=>{
 const expected=((200*0.20)+(20*0.02)+(90*1.20))/1e6;
 assert.ok(Math.abs(estimateObservedCostUsd({inputTokens:220,cachedInputTokens:20,outputTokens:90})-expected)<1e-7);
});
test("source does not expose runtime API POST execution route",()=>{
 const route=readFileSync(new URL("../../artifacts/api-server/src/routes/agentosGenesis.ts",import.meta.url),"utf8");
 const code=readFileSync(new URL("../../artifacts/api-server/src/agentos/realModelSandbox.ts",import.meta.url),"utf8");
 assert.doesNotMatch(route,/createApprovedOneShotSandbox/);
 assert.doesNotMatch(route,/router\.(post|put|patch|delete)\(/);
 assert.doesNotMatch(code,/wallet\.sign|createCheckout|stripe\.com|mercadopago\.com/);
});
