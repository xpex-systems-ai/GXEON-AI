import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  BILLING_PREFLIGHT_POLICY,
  GXEON16_READ_INTENT,
  buildBlockedPreflightReceipt,
  checkOpenAIProjectSpendLimit,
  evaluateProviderSpendLimit,
} from "../../artifacts/api-server/src/agentos/projectBillingPreflight.ts";
import { REAL_SANDBOX_GUARD } from "../../artifacts/api-server/src/agentos/realModelSandbox.ts";

const projectId="proj_GXEON16FixtureProject";
const good={
  object:"project.spend_limit",
  threshold_amount:1,
  currency:"USD",
  interval:"month",
  enforcement:{status:"enforcing"},
};
const config=()=>({
  projectId,
  adminKey:"sk-admin-test_FixtureOnlyXXXXXXXX",
  environment:"synthetic-only",
  enabled:true,
  explicitReadCheck:GXEON16_READ_INTENT,
});
const mock=(body=good,status=200)=>{
  let calls=0;return {
    fetcher: async(url,init)=>{
      calls++;
      assert.equal(url,"https://api.openai.com/v1/organization/projects/proj_GXEON16FixtureProject/spend_limit");
      assert.equal(init.method,"GET");
      assert.equal(init.redirect,"error");
      assert.equal(init.headers.Authorization,"Bearer "+config().adminKey);
      assert.ok(init.signal);
      return new Response(JSON.stringify(body),{status});
    },
    get calls(){return calls},
  };
};

test("official hard-spend schema enforces a 1-cent USD monthly threshold",()=>{
  const gate=evaluateProviderSpendLimit(good);
  assert.equal(gate.hardLimitGate,"HARD_LIMIT_ENFORCING_USD_0_01");
  assert.equal(gate.observedLimitCents,1);
  assert.equal(BILLING_PREFLIGHT_POLICY.maximumApprovedUsd,0.01);
  assert.equal(REAL_SANDBOX_GUARD.maximumOperatorAuthorizationUsd,0.01);
});
test("project spend alert or inactive hard limit never passes",()=>{
  for(const raw of [
    { ...good, enforcement:{status:"inactive"} },
    { ...good, enforcement:"enforcing" },
    { ...good, enforcement:{enabled:true} },
    { ...good, object:"project.spend_alert" },
    null,[],{},undefined,
  ]) assert.equal(evaluateProviderSpendLimit(raw).hardLimitGate,"HARD_LIMIT_NOT_VERIFIED");
});
test("upper limits of two cents or more are blocked as beyond consent",()=>{
  for(const value of [2,5,100,10000,0,-1,NaN,0.5]){
    const gate=evaluateProviderSpendLimit({...good,threshold_amount:value});
    assert.equal(gate.hardLimitGate,"HARD_LIMIT_NOT_VERIFIED");
  }
});
test("only USD and month can be considered valid",()=>{
  assert.equal(evaluateProviderSpendLimit({...good,currency:"BRL"}).hardLimitGate,"HARD_LIMIT_NOT_VERIFIED");
  assert.equal(evaluateProviderSpendLimit({...good,interval:"day"}).hardLimitGate,"HARD_LIMIT_NOT_VERIFIED");
});
test("admin preflight refuses execution with missing admin key, opt-in or wrong environment",async()=>{
  for(const fn of [
    x=>{x.enabled=false},
    x=>{x.explicitReadCheck="yes"},
    x=>{x.environment="production"},
    x=>{x.adminKey=""},
    x=>{x.projectId="../other-project"},
    x=>{x.projectId="https://evil.local/path"},
  ]){
    const cfg=config();fn(cfg);const f=mock();
    await assert.rejects(checkOpenAIProjectSpendLimit(cfg,f.fetcher),/GXEON16_ADMIN_READ_NOT_AUTHORIZED/);
    assert.equal(f.calls,0);
  }
});
test("actual project limit GET uses exact HTTPS project endpoint only",async()=>{
  const f=mock();
  const receipt=await checkOpenAIProjectSpendLimit(config(),f.fetcher);
  assert.equal(f.calls,1);
  assert.equal(receipt.hardLimitGate,"HARD_LIMIT_ENFORCING_USD_0_01");
  assert.equal(receipt.readOnlyAdminRequestSent,true);
  assert.equal(receipt.realInferenceCalls,0);
  assert.equal(receipt.readyForPaidInference,false);
});
test("a verified hard limit alone NEVER authorizes paid inference",()=>{
  const receipt=buildBlockedPreflightReceipt(projectId,true,good);
  assert.equal(receipt.status,"BLOCKED_PENDING_OPERATOR_REVIEW");
  assert.equal(receipt.providerBillingVerified,false);
  assert.equal(receipt.currentCreditsVerified,false);
  assert.equal(receipt.currentMonthlySpendVerified,false);
  assert.equal(receipt.isolatedRuntimeVerified,false);
  assert.equal(receipt.finalGoReceived,false);
  assert.equal(receipt.independentReviewVerified,false);
  assert.equal(receipt.paidModelBudgetAuthorizedUsd,0.01);
  assert.ok(receipt.remainingGates.includes("USER_FINAL_GO_BEFORE_CHARGE"));
});
test("receipt fingerprint never prints project ID or admin key",()=>{
  const receipt=buildBlockedPreflightReceipt(projectId,true,good);
  const json=JSON.stringify(receipt);
  assert.equal(receipt.projectIdFingerprint.length,12);
  assert.ok(!json.includes(projectId));
  assert.ok(!json.includes(config().adminKey));
  assert.equal(receipt.apiKeySafeToDisplay,false);
});
test("provider HTTP errors are redacted and do not cause paid calls",async()=>{
  const f=mock({error:"SECRET_USER_DATA"},401);
  await assert.rejects(checkOpenAIProjectSpendLimit(config(),f.fetcher),err=>{
    assert.equal(err.message,"GXEON16_ADMIN_READ_FAILED");
    assert.doesNotMatch(err.message,/SECRET_USER_DATA/);
    return true;
  });
  assert.equal(f.calls,1);
});
test("large provider responses fail closed",async()=>{
  const f={fetcher:async()=>new Response("X".repeat(5000),{status:200})};
  await assert.rejects(checkOpenAIProjectSpendLimit(config(),f.fetcher),/GXEON16_ADMIN_RESPONSE_TOO_LARGE/);
});
test("invalid response JSON fails closed",async()=>{
  const f={fetcher:async()=>new Response("{bad", {status:200})};
  await assert.rejects(checkOpenAIProjectSpendLimit(config(),f.fetcher),/GXEON16_ADMIN_RESPONSE_INVALID/);
});
test("admin read cannot be confused with a paid Responses API request",()=>{
  const src=readFileSync(new URL("../../artifacts/api-server/src/agentos/projectBillingPreflight.ts",import.meta.url),"utf8");
  assert.match(src,/\/organization\/projects\//);
  assert.doesNotMatch(src,/method: "POST"|method:"POST"|\/v1\/responses|createApprovedOneShotSandbox\(/);
  assert.equal(BILLING_PREFLIGHT_POLICY.noPaidInference,true);
  assert.equal(BILLING_PREFLIGHT_POLICY.noProviderWrites,true);
});
