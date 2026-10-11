#!/usr/bin/env node
/**
 * GXEON read-only independent escrow deposit verification for one public
 * BasedAgents task id. NO keys, wallet write, signature, claim or payout.
 */
import { verifyBaseEscrowDeposit } from "./base-usdc-escrow-chain.mjs";
import { inspectBasedAgentsPayload } from "./provider-escrow-readiness.mjs";
const allowed="https://api.basedagents.ai/v1/tasks?status=open";
const id=process.argv.find(a=>a.startsWith("--task-id="))?.slice("--task-id=".length);
if(!process.argv.includes("--live-read")){
 console.log(JSON.stringify({status:"OFFLINE_DEFAULT",provider:"basedagents",reads:0,
  claims:0,paymentSigned:false,operatorGoRequired:true},null,2));
}else if(!/^task_[a-zA-Z0-9_-]{5,90}$/.test(id??"")){
 console.error("GXEON_CHAIN_TASK_ID_REQUIRED");
 process.exitCode=1;
}else{
 try{
  const response=await fetch(allowed,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(12000),
   headers:{Accept:"application/json","User-Agent":"GXEON-public-escrow-check/1"},
  });
  if(!response.ok)throw new Error("GXEON_CHAIN_TASK_SOURCE_UNAVAILABLE");
  const text=await response.text();
  if(Buffer.byteLength(text,"utf8")>1000000)throw new Error("GXEON_CHAIN_TASK_LIST_TOO_LARGE");
  const json=JSON.parse(text);
  if(json.ok!==true||!Array.isArray(json.tasks))throw new Error("GXEON_CHAIN_TASK_SCHEMA_INVALID");
  const task=json.tasks.find(v=>v.task_id===id);
  if(!task)throw new Error("GXEON_CHAIN_TASK_NOT_OPEN");
  // Critical preflight: do NOT spend explorer bandwidth on test hires,
  // conditional paid-cycle offers, unclaimed demos or <$100 bounties.
  // An explicitly blocked target is an expected outcome (exit code 0),
  // not a source failure and never a revenue event.
  const [gate]=inspectBasedAgentsPayload({ok:true,tasks:[task]});
  if(gate.status!=="PROVIDER_ESCROW_REPORTED"){
    console.log(JSON.stringify({
      taskId:id,source:"BasedAgents",
      status:"INELIGIBLE_NO_EXPLORER_CALL",
      reason:gate.reason??"NOT_PROVISIONALLY_ELIGIBLE",
      independentlyVerified:false,claimReady:false,
      explorerReads:0,claims:0,paymentsInitiated:0,revenueUsdc:0,
    },null,2));
    process.exitCode=0;
  }else{
    const evidence=await verifyBaseEscrowDeposit(task);
    console.log(JSON.stringify({
      taskId:id,source:"BasedAgents + public Base Blockscout",...evidence,
      claims:0,paymentsInitiated:0,revenueUsdc:0,
    },null,2));
  }

 }catch(e){
  console.error(/^GXEON_CHAIN_/.test(e?.message??"")?e.message:"GXEON_CHAIN_READ_FAILED");
  process.exitCode=1;
 }
}
