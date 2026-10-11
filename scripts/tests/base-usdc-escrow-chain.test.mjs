import test from "node:test";
import assert from "node:assert/strict";
import {assessBaseEscrowDeposit,verifyBaseEscrowDeposit} from "../base-usdc-escrow-chain.mjs";
import {BASE_USDC_ADDRESS} from "../payout-proof-gate.mjs";
const txHash="0x"+"c".repeat(64);
const payer="0x"+"a".repeat(40),escrow="0x"+"b".repeat(40);
const task=(patch={})=>({
  title:"Develop an approved TypeScript API integration",
  description:"Human-reviewed agent coding task",
  status:"open",claimable:true,payment_verified:1,bounty_amount:"150000000",
  bounty:{amount_atomic:"150000000",token:"USDC",network:"eip155:8453"},
  escrow:{status:"funded",wallet:escrow,deposit_tx_hash:txHash},
  creator:{wallet:payer},
  ...patch
});
const receipt=(patch={})=>({hash:txHash,result:"success",status:"ok",confirmations:20,...patch});
const transfers=(patch={})=>({items:[{
 from:{hash:payer},to:{hash:escrow},token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},
 total:{value:"150000000",decimals:"6"}
}],next_page_params:null,...patch});
test("valid API escrow AND independent USDC chain event is not enough to auto-claim",()=>{
 const r=assessBaseEscrowDeposit(task(),receipt(),transfers());
 assert.equal(r.independentlyVerified,true);
 assert.equal(r.status,"PROVIDER_ESCROW_AND_CHAIN_MATCH");
 assert.equal(r.claimReady,false);
 assert.equal(r.paymentReceived,false);
 assert.equal(r.rewardUsdc,150);
});
test("genuine independently proven funded test hire is NOT commercial demand",()=>{
 const r=assessBaseEscrowDeposit(task({title:"Test hire (please ignore)",description:"will be cancelled"}),receipt(),transfers());
 assert.equal(r.independentlyVerified,true);
 assert.equal(r.status,"FUNDED_BUT_INELIGIBLE_TEST");
 assert.equal(r.claimReady,false);
});
test("invalid or missing tx ref and escrow account fail before any network",async()=>{
 for(const v of [task({escrow:{status:"funded",wallet:escrow,deposit_tx_hash:"../ssrf"}}),task({escrow:null}),null]){
  let calls=0;
  const r=await verifyBaseEscrowDeposit(v,{fetchImpl:async()=>{calls++;throw Error("network") }});
  assert.equal(r.independentlyVerified,false);assert.equal(calls,0);
 }
});
test("unconfirmed, failed and wrong hash tx never counts",()=>{
 for(const patch of [
  {status:"error"},{result:"reverted"},{confirmations:4},{hash:"0x"+"d".repeat(64)},
  {confirmations:null}
 ]){assert.equal(assessBaseEscrowDeposit(task(),receipt(patch),transfers()).independentlyVerified,false);}
});
test("must have matching Base USDC token, amount and escrow recipient",()=>{
 for(const entry of [
  {from:{hash:payer},to:{hash:escrow},token:{address_hash:"0x"+"f".repeat(40),decimals:"6"},total:{value:"150000000"}},
  {from:{hash:payer},to:{hash:payer},token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},total:{value:"150000000"}},
  {from:{hash:payer},to:{hash:escrow},token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},total:{value:"1"}},
  {from:{hash:escrow},to:{hash:escrow},token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},total:{value:"150000000"}}
 ]){
  assert.equal(assessBaseEscrowDeposit(task(),receipt(),transfers({items:[entry]})).independentlyVerified,false);
 }
});
test("strict pagination completeness or missing data blocks verification",()=>{
 for(const v of [null,{},transfers({next_page_params:{page:2}}),transfers({items:{}})]){
  assert.equal(assessBaseEscrowDeposit(task(),receipt(),v).independentlyVerified,false);
 }
});
test("no mismatched provider amount accepted, even if chain sent higher USD value",()=>{
 const t=task({bounty_amount:"100000000"});
 assert.equal(assessBaseEscrowDeposit(t,receipt(),transfers()).independentlyVerified,false);
});
test("only 2 exact API GET requests with no authentication and no user-provided destination",async()=>{
 const urls=[];
 const fetchImpl=async(url,init)=>{
  urls.push(url);assert.equal(init.method,"GET");assert.equal(init.redirect,"error");
  assert.equal(init.headers.Authorization,undefined);
  if(url.endsWith("/token-transfers"))return new Response(JSON.stringify(transfers()),{status:200});
  return new Response(JSON.stringify(receipt()),{status:200});
 };
 const r=await verifyBaseEscrowDeposit(task(),{fetchImpl});
 assert.equal(r.independentlyVerified,true);
 assert.equal(urls.length,2);
 assert.ok(urls.every(x=>x.startsWith("https://base.blockscout.com/api/v2/transactions/")));
});
test("provider HTTP outage cannot be silently translated to a verified escrow",async()=>{
 await assert.rejects(verifyBaseEscrowDeposit(task(),{
  fetchImpl:async()=>new Response("rate limit",{status:429})
 }),/GXEON_CHAIN_HTTP_UNAVAILABLE/);
});
test("unparsable explorer JSON never yields proof",async()=>{
 await assert.rejects(verifyBaseEscrowDeposit(task(),{
  fetchImpl:async()=>new Response("not json",{status:200})
 }),/GXEON_CHAIN_JSON_INVALID/);
});
