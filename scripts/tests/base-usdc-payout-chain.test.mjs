import test from "node:test";
import assert from "node:assert/strict";
import {inspectBasePayoutEvidence,verifyBasedAgentsPayoutOnChain} from "../base-usdc-payout-chain.mjs";
import {BASE_USDC_ADDRESS} from "../payout-proof-gate.mjs";
const tx="0x"+"a".repeat(64),escrow="0x"+"b".repeat(40),wallet="0x"+"c".repeat(40);
const agent="ag_"+"d".repeat(30);
const task=(patch={})=>({
 status:"verified",payment_status:"settled",payment_settled:1,
 claimed_by_agent_id:agent,payment_tx_hash:tx,bounty_amount:"150000000",
 bounty:{amount_atomic:"150000000",token:"USDC",network:"eip155:8453"},
 escrow:{status:"released",wallet:escrow,release_tx_hash:tx},...patch
});
const txReceipt=(patch={})=>({hash:tx,status:"ok",result:"success",confirmations:20,token_transfers_overflow:false,...patch});
const transfer=()=>({transaction_hash:tx,from:{hash:escrow},to:{hash:wallet},
 token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},total:{value:"150000000"}});
const transfers=(patch={})=>({items:[transfer()],next_page_params:null,...patch});
const verify=(t=task(),rc=txReceipt(),ts=transfers(),user=agent,beneficiary=wallet)=>
 inspectBasePayoutEvidence(t,rc,ts,user,beneficiary);
test("accepted payout is verified only by exact independent Base USDC token transfer",()=>{
 const r=verify();assert.equal(r.verifiedReceived,true);assert.equal(r.revenueBookable,true);
 assert.equal(r.amountReceivedUsdc,150);assert.equal(r.withdrawn,false);
});
test("settlement not yet accepted or released can never count as earning",()=>{
 for(const patch of [
  {status:"submitted"},{status:"open"},{payment_status:"pending"},{payment_settled:0},
  {escrow:{status:"funded",wallet:escrow,release_tx_hash:tx}},
  {claimed_by_agent_id:"ag_"+"x".repeat(30)}
 ])assert.equal(verify(task(patch)).verifiedReceived,false);
});
test("no receipt, reverted, insufficient confirmations or token overflow blocks proof",()=>{
 for(const receipt of [null,txReceipt({result:"reverted"}),txReceipt({status:"error"}),
  txReceipt({confirmations:11}),txReceipt({token_transfers_overflow:true}),txReceipt({hash:"0x"+"f".repeat(64)})])
  assert.equal(verify(task(),receipt).verifiedReceived,false);
});
test("missing, truncated, overflow, paginated or forged log cannot prove payout",()=>{
 for(const report of [null,{},transfers({items:{}}),transfers({items:[]}),
  transfers({next_page_params:{page:2}}),
  transfers({items:[transfer(),transfer()]})])
  assert.equal(verify(task(),txReceipt(),report).verifiedReceived,false);
});
test("reject wrong contract, token decimals, source wallet, recipient and amount",()=>{
 for(const patch of [
  {token:{address_hash:"0x"+"e".repeat(40),decimals:"6"}},
  {token:{address_hash:BASE_USDC_ADDRESS,decimals:"18"}},
  {from:{hash:wallet}},{to:{hash:escrow}},{total:{value:"150000001"}},
  {transaction_hash:"0x"+"f".repeat(64)}
 ]){
  const t=transfers({items:[{...transfer(),...patch}]});
  assert.equal(verify(task(),txReceipt(),t).verifiedReceived,false);
 }
});
test("mismatched nested and top-level provider payout values are not earnings",()=>{
 const t=task({bounty_amount:"500000000"});
 assert.equal(verify(t).verifiedReceived,false);
});
test("task cannot redirect earnings to different operator identity or recipient",()=>{
 assert.equal(verify(task(),txReceipt(),transfers(),"ag_"+"f".repeat(30)).verifiedReceived,false);
 assert.equal(verify(task(),txReceipt(),transfers(),agent,"0x"+"f".repeat(40)).verifiedReceived,false);
});
test("preflight fails closed before network if provider or recipient authorization missing",async()=>{
 for(const input of [
  {task:task({status:"open"}),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet},
  {task:task(),authorizedRecipientAgentId:"ag_"+"e".repeat(30),authorizedRecipientWallet:wallet},
  {task:task(),authorizedRecipientAgentId:agent,authorizedRecipientWallet:"invalid"},
  {task:task({payment_tx_hash:"invalid"}),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet}
 ]){
  let count=0;
  const report=await verifyBasedAgentsPayoutOnChain({...input,fetchImpl:()=>{count++;throw Error("NO_NETWORK_ALLOWED");}});
  assert.equal(report.verifiedReceived,false);assert.equal(count,0);
 }
});
test("real adapter GETs exactly two allowlisted explorer paths with no credentials",async()=>{
 const seen=[];
 const f=async(url,init)=>{
  seen.push(url);
  assert.equal(init.method,"GET");assert.equal(init.redirect,"error");
  assert.equal(init.headers.Authorization,undefined);
  assert.match(url,/^https:\/\/base\.blockscout\.com\/api\/v2\/transactions\/0x[a-f0-9]{64}/);
  return new Response(JSON.stringify(url.endsWith("token-transfers")?transfers():txReceipt()),{status:200});
 };
 const report=await verifyBasedAgentsPayoutOnChain({
  task:task(),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet,fetchImpl:f
 });
 assert.equal(seen.length,2);assert.equal(report.verifiedReceived,true);
});
test("HTTP 402 or rate limits keep verification unavailable, never fabricate zero or received",async()=>{
 for(const status of [402,403,429]){
  await assert.rejects(verifyBasedAgentsPayoutOnChain({
   task:task(),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet,
   fetchImpl:async()=>new Response("insufficient credits",{status})
  }),/GXEON_PAYOUT_EXPLORER_UNAVAILABLE/);
 }
});
test("malformed explorer JSON and oversized bodies are blocked",async()=>{
 await assert.rejects(verifyBasedAgentsPayoutOnChain({
  task:task(),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet,
  fetchImpl:async()=>new Response("broken",{status:200})
 }),/GXEON_PAYOUT_BAD_EXPLORER_JSON/);
 await assert.rejects(verifyBasedAgentsPayoutOnChain({
  task:task(),authorizedRecipientAgentId:agent,authorizedRecipientWallet:wallet,
  fetchImpl:async()=>new Response("x".repeat(500001),{status:200})
 }),/GXEON_PAYOUT_RESPONSE_TOO_LARGE/);
});
