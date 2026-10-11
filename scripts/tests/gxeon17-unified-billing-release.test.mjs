import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  verifyProjectBillingBeforePaidCall, evaluateProjectCostReport,
  monthCostWindow, GXEON17_READINESS,
} from "../../artifacts/api-server/src/agentos/unifiedBillingGate.ts";
const NOW=Date.parse("2026-10-10T22:00:00Z");
const projectId="proj_GXEON17Synthetic";
const cfg=()=>({
  projectId,adminKey:"sk-admin-fixture-secret-not-real",
  enabled:true,environment:"synthetic-only",
  explicitReadCheck:"GXEON16_READ_PROJECT_HARD_SPEND_LIMIT_ONLY",
  operatorFinalGo:"I_CONFIRM_ONE_PAID_SYNTHETIC_CALL_NOW",
  approvedCapUsd:0.01,
});
const hard={object:"project.spend_limit",threshold_amount:1,currency:"USD",interval:"month",enforcement:{status:"enforcing"}};
const costs=(override={})=>({
  object:"page",has_more:false,next_page:null,
  data:[{object:"bucket",
    start_time:monthCostWindow(NOW).startSeconds,
    end_time:monthCostWindow(NOW).startSeconds+86400,
    results:[{object:"organization.costs.result",project_id:projectId,amount:{currency:"usd",value:0}}],
  }],
  ...override,
});
const makeFetch=(h=hard,c=costs())=>{
 let called=[];
 return {
  calls:called,
  fn:async(url,init)=>{
    called.push({url,init});
    assert.equal(init.method,"GET");
    assert.equal(init.redirect,"error");
    assert.equal(init.headers.Authorization,"Bearer "+cfg().adminKey);
    if(called.length===1){
      assert.equal(url,`https://api.openai.com/v1/organization/projects/${projectId}/spend_limit`);
      return new Response(JSON.stringify(h),{status:200});
    }
    const u=new URL(url);
    assert.equal(u.origin,"https://api.openai.com");
    assert.equal(u.pathname,"/v1/organization/costs");
    assert.equal(u.searchParams.get("project_ids[]"),projectId);
    assert.equal(u.searchParams.get("group_by[]"),"project_id");
    assert.equal(u.searchParams.get("limit"),"31");
    return new Response(JSON.stringify(c),{status:200});
  }
 };
};
test("complete simulated preflight performs exactly two admin GETs, never paid inference",async()=>{
  const f=makeFetch();
  const result=await verifyProjectBillingBeforePaidCall(cfg(),f.fn,NOW);
  assert.equal(f.calls.length,2);
  assert.equal(result.status,"PROVIDER_READ_CHECKS_MATCHED_NOT_FINANCIAL_GUARANTEE");
  assert.equal(result.monthlyCostUsdReported,0);
  assert.equal(result.hardLimitEnforcing,true);
  assert.equal(result.providerLimitMayOvershoot,true);
  assert.equal(result.providerCostAggregationMayLag,true);
  assert.equal(result.paymentRequestPerformed,false);
  assert.equal(result.adminReadRequests,2);
  assert.ok(!JSON.stringify(result).includes(projectId));
});
test("without verified final consent, first admin GET never happens",async()=>{
 for(const value of ["", "yes", "I_APPROVE_ONE_PAID_GXEON15_SANDBOX_CALL"]){
  const c=cfg();c.operatorFinalGo=value;const f=makeFetch();
  await assert.rejects(verifyProjectBillingBeforePaidCall(c,f.fn,NOW),/GXEON17_FINAL_APPROVAL_AND_READ_CREDENTIALS_REQUIRED/);
  assert.equal(f.calls.length,0);
 }
});
test("missing admin secret, wrong project and budget greater than US$0.01 fail before transport",async()=>{
 for(const change of [
  c=>c.adminKey="",
  c=>c.projectId="../escape",
  c=>c.approvedCapUsd=0.02,
  c=>c.approvedCapUsd=0,
  c=>c.environment="production",
  c=>c.enabled=false,
 ]){
  const c=cfg(),f=makeFetch();change(c);
  await assert.rejects(verifyProjectBillingBeforePaidCall(c,f.fn,NOW),/GXEON17_FINAL_APPROVAL_AND_READ_CREDENTIALS_REQUIRED/);
  assert.equal(f.calls.length,0);
 }
});
test("provider hard-limit alert or more than one cent blocks cost query and payment",async()=>{
 for(const h of [
  {...hard,threshold_amount:2},
  {...hard,enforcement:{status:"inactive"}},
  {...hard,object:"project.spend_alert"},
 ]){
  const f=makeFetch(h);
  await assert.rejects(verifyProjectBillingBeforePaidCall(cfg(),f.fn,NOW),/GXEON17_HARD_LIMIT_NOT_ENFORCING/);
  assert.equal(f.calls.length,1);
 }
});
test("any recorded project cost, even US$0.0001, blocks paid request",async()=>{
 const f=makeFetch(hard,costs({data:[{...costs().data[0],results:[{object:"organization.costs.result",project_id:projectId,amount:{currency:"usd",value:0.0001}}]}]}));
 await assert.rejects(verifyProjectBillingBeforePaidCall(cfg(),f.fn,NOW),/GXEON17_COSTS_UNVERIFIED/);
 assert.equal(f.calls.length,2);
});
test("foreign project, missing identity, wrong currency and negative cost are rejected",()=>{
 const win=monthCostWindow(NOW);
 for(const entry of [
  {object:"organization.costs.result",project_id:"proj_OTHER",amount:{currency:"usd",value:0}},
  {object:"organization.costs.result",project_id:null,amount:{currency:"usd",value:0}},
  {object:"organization.costs.result",project_id:projectId,amount:{currency:"brl",value:0}},
  {object:"organization.costs.result",project_id:projectId,amount:{currency:"usd",value:-0.01}},
 ]){
  const doc=costs({data:[{...costs().data[0],results:[entry]}]});
  assert.throws(()=>evaluateProjectCostReport(projectId,doc,win.startSeconds,win.endSeconds),/GXEON17_COSTS_UNVERIFIED/);
 }
});
test("missing, partial/paginated or malformed provider cost pages are rejected",()=>{
 const win=monthCostWindow(NOW);
 for(const doc of [null,{},[],costs({has_more:true}),costs({next_page:"next"}),costs({data:[]}),costs({object:"other"})]){
   assert.throws(()=>evaluateProjectCostReport(projectId,doc,win.startSeconds,win.endSeconds),/GXEON17_COSTS_UNVERIFIED/);
 }
});
test("valid empty daily cost bucket is allowed but still marked aggregation-lag risk",async()=>{
 const f=makeFetch(hard,costs({data:[{...costs().data[0],results:[]}]}));
 const result=await verifyProjectBillingBeforePaidCall(cfg(),f.fn,NOW);
 assert.equal(result.providerCostAggregationMayLag,true);
 assert.equal(result.monthlyCostUsdReported,0);
});
test("costs read HTTP errors never authorize the paid call or leak provider response",async()=>{
 let n=0;
 const fetcher=async()=>{n++;return n===1?new Response(JSON.stringify(hard),{status:200}):new Response("sensitive",{status:401})};
 await assert.rejects(verifyProjectBillingBeforePaidCall(cfg(),fetcher,NOW),e=>{
  assert.equal(e.message,"GXEON17_PROVIDER_COSTS_READ_FAILED");
  assert.doesNotMatch(e.message,/sensitive/);return true;
 });
 assert.equal(n,2);
});
test("operator paid CLI cannot execute without the unified preflight",()=>{
 const cli=readFileSync(new URL("../../scripts/agentos-real-model-once.mjs",import.meta.url),"utf8");
 assert.match(cli,/verifyProjectBillingBeforePaidCall\(/);
 assert.ok(cli.indexOf("verifyProjectBillingBeforePaidCall(") < cli.indexOf("createApprovedOneShotSandbox(config).run("));
 assert.match(cli,/GXEON15_FINAL_PAID_GO/);
 assert.match(cli,/GXEON16_OPENAI_ADMIN_KEY/);
});
test("billing preflight's only network operations are approved admin GETs",()=>{
 const src=readFileSync(new URL("../../artifacts/api-server/src/agentos/unifiedBillingGate.ts",import.meta.url),"utf8");
 assert.doesNotMatch(src,/method:"POST"|method: "POST"|createApprovedOneShotSandbox\(/);
 assert.equal(GXEON17_READINESS.noPaidInference,true);
 assert.equal(GXEON17_READINESS.noProjectMutations,true);
});
