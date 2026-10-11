import test from "node:test";
import assert from "node:assert/strict";
import {
 PROVIDER_POLICY,inspectBasedAgentsPayload,inspectBaseBountyPayload,
 inspectProjectRoomPayload,evaluateProviderSnapshots,verifyLiveProviderDemand
} from "../provider-escrow-readiness.mjs";
const tx="0x"+"a".repeat(64);
const basedTask=(extra={})=>({
 task_id:"task_Prefunded01123",title:"Review a TypeScript API and deliver reproducible tests",
 description:"Customer-authorized readonly PR review, signed evidence, no paid API",
 status:"open",claimable:true,claimed_by_agent_id:null,bounty_amount:"150000000",
 bounty:{amount_atomic:"150000000",amount_display:"150.00",token:"USDC",network:"eip155:8453"},
 payment_verified:1,payment_status:"pending",escrow:{status:"funded",deposit_tx_hash:tx},...extra
});
const basePayload=(bounties=[])=>({network:"Base",chainId:8453,testnet:false,count:bounties.length,bounties});
const projectRoom=(offers=[])=>({offers});
const offer=(extra={})=>({
 schema:"project-room-offer/1",id:"pilot-some-task-2026",status:"published",kind:"task",
 title:"Build clear agent report",reward:{kind:"cash",unit:"USDC",decimals:6,amountMinor:"100000000"},
 fundingStatus:"not_configured",paymentStatus:"not_configured",...extra
});
test("funded BasedAgents provider receipt is PROVISIONAL and never onchain-certified",()=>{
 const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask()]});
 assert.equal(a.status,"PROVIDER_ESCROW_REPORTED");
 assert.equal(a.amountUsdc,150);
 assert.equal(a.claimApproved,false);
 assert.equal(a.qualified,false);
 assert.equal(a.depositTxHash,tx);
});
test("BasedAgents real funded test hire is blocked despite funded escrow and claimable=true",()=>{
 const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({
 title:"Test hire (please ignore)", description:"Checking the paid flow. This task will be cancelled.",
 bounty:{amount_atomic:"1000000",token:"USDC",network:"eip155:8453"}
 })]},{minUsdc:0.1});
 assert.equal(a.reason,"TEST_OR_CONDITIONAL_REVENUE_TASK");
});
test("no escrow with pending payment blocks work regardless of advertised reward",()=>{
 const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({escrow:null,payment_verified:0})]});
 assert.equal(a.reason,"ESCROW_NOT_PROVEN_IN_PROVIDER_RECORD");
});
test("unverified escrow transaction hash is not eligible",()=>{
 for(const deposit_tx_hash of [null,"0x12","0x"+"f".repeat(65)]){
  const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({escrow:{status:"funded",deposit_tx_hash}})]});
  assert.equal(a.reason,"ESCROW_NOT_PROVEN_IN_PROVIDER_RECORD");
 }
});
test("no signed user spend for paid-cycle revenue sharing conditions",()=>{
 const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({
  description:"Requires attributable settled Industrial Platform revenue across two UTC days and a real paid trial cycle",
 })]});
 assert.equal(a.reason,"TEST_OR_CONDITIONAL_REVENUE_TASK");
});
test("zero and sub-threshold tasks never ranked as first revenue opportunities",()=>{
 for(const amount of ["5000000","0",null]){
  const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({
   bounty:{amount_atomic:amount,token:"USDC",network:"eip155:8453"}
  })]});
  assert.equal(a.reason,"BELOW_MIN_REWARD_OR_NO_CASH");
 }
});
test("require strict token and Base chain, no Arc or Polygon substitutions",()=>{
 for(const bounty of [
  {amount_atomic:"150000000",token:"USDT",network:"eip155:8453"},
  {amount_atomic:"150000000",token:"USDC",network:"eip155:137"},
 ]){const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({bounty})]});assert.equal(a.reason,"WRONG_TOKEN_OR_NETWORK");}
});
test("basedagents rejects nonclaimable, assigned, or fake task id",()=>{
 for(const patch of [{status:"taken"},{claimable:false},{claimed_by_agent_id:"ag_someone"},{task_id:"../foo"}]){
  const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask(patch)]});
  assert.equal(a.status,"BLOCKED");
 }
});
test("provider object schema inconsistencies fail closed",()=>{
 for(const bad of [null,{},[],{ok:false,tasks:[]},{ok:true,tasks:{}},{ok:true,tasks:Array.from({length:501},()=>({}))}]){
  assert.throws(()=>inspectBasedAgentsPayload(bad),/GXEON_BASEDAGENTS/);
 }
});
test("BaseBounty public empty onchain board is a valid zero-opportunities state",()=>{
 assert.deepEqual(inspectBaseBountyPayload(basePayload()),[]);
});
test("BaseBounty missing or inconsistent contract chain/count is a blocked verification",()=>{
 for(const obj of [
  {...basePayload(),chainId:1},{...basePayload(),testnet:true},{...basePayload(),count:9},
  {...basePayload(),bounties:{}},
 ])assert.throws(()=>inspectBaseBountyPayload(obj),/GXEON_BASEBOUNTY/);
});
test("BaseBounty plausible higher-paying open job is provisional not auto-claimable",()=>{
 const [a]=inspectBaseBountyPayload(basePayload([{
  jobId:"42",title:"TypeScript audit",status:"open",workerPayoutUsdc:"200.00"
 }]));
 assert.equal(a.status,"PROVIDER_ESCROW_REPORTED");
 assert.equal(a.qualified,false);assert.equal(a.claimApproved,false);
 assert.equal(a.amountUsdc,200);
});
test("BaseBounty blocks expired, underpaying and suspicious tasks",()=>{
 const list=[
  {jobId:"5",title:"A task",status:"expired",workerPayoutUsdc:"250"},
  {jobId:"6",title:"A task",status:"open",workerPayoutUsdc:"0.99"},
  {jobId:"7",title:"Test hire, please ignore",status:"open",workerPayoutUsdc:"300"},
 ];
 const x=inspectBaseBountyPayload(basePayload(list));
 assert.ok(x.every(v=>v.status==="BLOCKED"));
});
test("Project Room '200 USDC reward' still blocked when payout rail not configured",()=>{
 const [a]=inspectProjectRoomPayload(projectRoom([offer({reward:{kind:"cash",unit:"USDC",decimals:6,amountMinor:"200000000"}})]));
 assert.equal(a.reason,"FUNDING_OR_PAYMENT_RAIL_NOT_CONFIGURED");
 assert.equal(a.amountUsdc,200);
});
test("Project Room promised reward never treated as escrow even on optimistic status",()=>{
 const [a]=inspectProjectRoomPayload(projectRoom([offer({fundingStatus:"funded",paymentStatus:"ready"})]));
 assert.equal(a.reason,"NO_INDEPENDENT_DEPOSIT_EVIDENCE");
});
test("Project Room unpaid volunteer tasks remain excluded",()=>{
 const [a]=inspectProjectRoomPayload(projectRoom([offer({reward:{kind:"unpaid"},fundingStatus:"not_applicable"})]));
 assert.equal(a.reason,"NOT_USDC_CASH_REWARD");
});
test("multi-feed provider truth report tracks only provider claims, zero real payable verified",()=>{
 const r=evaluateProviderSnapshots({
  basedagents:{ok:true,tasks:[basedTask()]},
  basebounty:basePayload(),
  projectroom:projectRoom([offer()])
 });
 assert.equal(r.examined,2);
 assert.equal(r.provisionalProviderEscrow,1);
 assert.equal(r.independentlyVerifiedEscrow,0);
 assert.equal(r.claimReady,0);
 assert.equal(r.claimsSubmitted,0);
 assert.equal(r.confirmedRevenueUsdc,0);
 assert.equal(r.expectedPayoutUsdc,0);
 assert.equal(r.reasons.FUNDING_OR_PAYMENT_RAIL_NOT_CONFIGURED,1);
});
test("network-only allowed destinations, GETs and no auth headers",async()=>{
 const urls=[];
 const responses={
 "https://api.basedagents.ai/v1/tasks?status=open":{ok:true,tasks:[]},
 "https://www.basebounty.app/api/v1/bounties?status=open":basePayload(),
 "https://room.trydemigod.com/api/project-offers":projectRoom(),
 };
 const fetchImpl=async(url,opts)=>{
  urls.push(url);assert.equal(opts.method,"GET");assert.equal(opts.redirect,"error");
  assert.equal(opts.headers.Authorization,undefined);assert.ok(Object.hasOwn(responses,url));
  return new Response(JSON.stringify(responses[url]),{status:200});
 };
 const d=await verifyLiveProviderDemand({fetchImpl});
 assert.equal(urls.length,3);assert.equal(d.examined,0);assert.equal(d.claimReady,0);
});
test("source outage blocks whole audit: no fabricated zero reward result",async()=>{
 const fetchImpl=async()=>new Response("failure",{status:403});
 await assert.rejects(verifyLiveProviderDemand({fetchImpl}),/GXEON_PROVIDER_HTTP_FAILURE/);
});
test("oversized or invalid JSON data is never accepted as verified escrow",async()=>{
 const fetchImpl=async()=>new Response("x".repeat(1000001),{status:200});
 await assert.rejects(verifyLiveProviderDemand({fetchImpl}),/GXEON_PROVIDER_RESPONSE_TOO_LARGE/);
});
test("no wallet, signing, claim or payment mutation mode enabled",()=>{
 assert.equal(PROVIDER_POLICY.noPaymentSigning,true);
 assert.equal(PROVIDER_POLICY.noClaims,true);
 assert.equal(PROVIDER_POLICY.claimNeedsManualUserApproval,true);
 assert.equal(PROVIDER_POLICY.escrowNeedsIndependentChainVerification,true);
 assert.equal(PROVIDER_POLICY.noRevenueClaims,true);
});

test("mismatched nested and top-level reward cannot be claimed as funded",()=>{
 const [a]=inspectBasedAgentsPayload({ok:true,tasks:[basedTask({bounty_amount:"1000000"})]});
 assert.equal(a.reason,"BOUNTY_AMOUNT_FIELDS_INCONSISTENT");
 assert.equal(a.qualified,false);
});
