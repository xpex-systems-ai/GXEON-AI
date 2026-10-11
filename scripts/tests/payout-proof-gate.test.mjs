import test from "node:test";
import assert from "node:assert/strict";
import {verifyBasedAgentsPayout,readVerifiedBaseUsdcPayout,BASE_USDC_ADDRESS} from "../payout-proof-gate.mjs";
const wallet="0x"+"a".repeat(40),escrowWallet="0x"+"b".repeat(40);
const tx="0x"+"1".repeat(64);
const agent="ag_"+"c".repeat(32);
const task=()=>({
  status:"verified", payment_status:"settled",payment_settled:1,
  claimed_by_agent_id:agent,payment_tx_hash:tx,
  bounty:{network:"eip155:8453",token:"USDC",amount_atomic:"150000000"},
  escrow:{status:"released",release_tx_hash:tx,wallet:escrowWallet}
});
const transfer=()=>({
  verifiedByIndependentChainReader:true,success:true,chainId:8453,
  confirmations:12,transactionHash:tx,tokenAddress:BASE_USDC_ADDRESS,
  from:escrowWallet,to:wallet,amountAtomic:"150000000"
});
const check=(t=task(),v=transfer(),recipientAgent=agent,recipientWallet=wallet)=>
 verifyBasedAgentsPayout({task:t,chainTransfer:v,
 authorizedRecipientAgentId:recipientAgent,authorizedRecipientWallet:recipientWallet});

const explorerFetch=(rcpt={},events={})=>async(url,opts)=>{
 assert.equal(opts.method,"GET");
 assert.equal(opts.redirect,"error");
 assert.ok(url.startsWith("https://base.blockscout.com/api/v2/transactions/"+tx));
 const json=url.endsWith("/token-transfers")
  ? {items:[{from:{hash:escrowWallet},to:{hash:wallet},
      token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},
      total:{value:"150000000"}}],next_page_params:null,...events}
  : {hash:tx,result:"success",status:"ok",confirmations:20,...rcpt};
 return new Response(JSON.stringify(json),{status:200});
};
async function trustedTransfer(fetchImpl=explorerFetch()){
 return readVerifiedBaseUsdcPayout({
  transactionHash:tx,from:escrowWallet,to:wallet,
  amountAtomic:"150000000",fetchImpl,
 });
}
test("settled provider plus independently fetched Base USDC event is the only positive case",async()=>{
 const read=await trustedTransfer();
 const r=check(task(),read);
 assert.equal(r.verifiedReceived,true);
 assert.equal(r.amountReceivedUsdc,150);
 assert.equal(r.revenueBookable,true);
 assert.equal(r.withdrawn,false);
 assert.equal(r.txHash,tx);
 assert.doesNotMatch(JSON.stringify(r),new RegExp(wallet.slice(2)));
});
test("caller-forged verifiedByIndependentChainReader:true must NEVER book revenue",()=>{
 const r=check(task(),transfer());
 assert.equal(r.verifiedReceived,false);
 assert.equal(r.revenueBookable,false);
 assert.equal(r.reason,"CHAIN_CONFIRMATIONS_NOT_PROVEN");
});
test("even genuine explorer proof cannot book a different agent, recipient or amount",async()=>{
 const proof=await trustedTransfer();
 assert.equal(check(task(),proof, "ag_"+"d".repeat(32)).verifiedReceived,false);
 assert.equal(check(task(),proof,agent,"0x"+"f".repeat(40)).verifiedReceived,false);
 assert.equal(check({...task(),bounty:{...task().bounty,amount_atomic:"149000000"}},proof).verifiedReceived,false);
});
test("failed chain transaction, forged receipt hash, underconfirmed or wrong token rejects minting",async()=>{
 for(const receiptPatch of [{status:"error"},{result:"failed"},{confirmations:0},{hash:"0x"+"0".repeat(64)}]){
  await assert.rejects(trustedTransfer(explorerFetch(receiptPatch)),/GXEON_PAYOUT_TRANSACTION_UNCONFIRMED/);
 }
 const x={items:[{from:{hash:escrowWallet},to:{hash:wallet},token:{address_hash:"0x"+"f".repeat(40),decimals:"6"},total:{value:"150000000"}}],next_page_params:null};
 await assert.rejects(trustedTransfer(explorerFetch({},x)),/GXEON_PAYOUT_USDC_TRANSFER_NOT_UNIQUE/);
});
test("partial, paginated or duplicate transfer report never mints a proof",async()=>{
 for(const patch of [{items:[]},{next_page_params:{page:2}}]){
  await assert.rejects(trustedTransfer(explorerFetch({},patch)),/GXEON_PAYOUT_TOKEN_EVENTS_INCOMPLETE|GXEON_PAYOUT_USDC_TRANSFER_NOT_UNIQUE/);
 }
 const twin={from:{hash:escrowWallet},to:{hash:wallet},token:{address_hash:BASE_USDC_ADDRESS,decimals:"6"},total:{value:"150000000"}};
 await assert.rejects(trustedTransfer(explorerFetch({},{items:[twin,twin]})),/GXEON_PAYOUT_USDC_TRANSFER_NOT_UNIQUE/);
});
test("independent read HTTP error fails closed, no invented proof",async()=>{
 await assert.rejects(trustedTransfer(async()=>new Response("unavailable",{status:402})),/GXEON_PAYOUT_EXPLORER_UNAVAILABLE/);
});
test("invalid payout addresses and hashes must fail before network",async()=>{
 let requests=0;
 await assert.rejects(readVerifiedBaseUsdcPayout({transactionHash:"0xBAD",from:escrowWallet,to:wallet,amountAtomic:"150000000",fetchImpl:async()=>{requests++;throw Error("network");}}),/GXEON_PAYOUT_INVALID_TRANSACTION_REQUEST/);
 assert.equal(requests,0);
});

test("provider-only settled state without independently verified chain cannot book funds",()=>{
 const r=check(task(),{...transfer(),verifiedByIndependentChainReader:false});
 assert.equal(r.verifiedReceived,false);
 assert.equal(r.revenueBookable,false);
});
test("any unaccepted or unpaid provider task cannot book money",()=>{
 for(const change of [
  {status:"open"},{status:"submitted"},{status:"rejected"},
  {payment_status:"pending"},{payment_settled:0}
 ]){const r=check({...task(),...change});assert.equal(r.verifiedReceived,false);}
});
test("no release tx hash, modified hash or unsettled escrow cannot pass",()=>{
 for(const patch of [
  {...task(),payment_tx_hash:null,escrow:{...task().escrow,release_tx_hash:null}},
  {...task(),payment_tx_hash:"0x"+"2".repeat(64)},
  {...task(),escrow:{...task().escrow,status:"funded"}},
 ])assert.equal(check(patch).verifiedReceived,false);
});
test("cannot book a payout earned by another agent identity or wallet",()=>{
 assert.equal(check(task(),transfer(),"ag_"+"e".repeat(32)).verifiedReceived,false);
 assert.equal(check(task(),transfer(),agent,"0x"+"f".repeat(40)).verifiedReceived,false);
});
test("chain contract, transfer recipient, escrow source, chain and amount must all match",()=>{
 const good=transfer();
 for(const change of [
  {tokenAddress:"0x"+"f".repeat(40)},{to:"0x"+"e".repeat(40)},
  {from:"0x"+"d".repeat(40)},{chainId:1},{amountAtomic:"149000000"},
  {transactionHash:"0x"+"0".repeat(64)},{success:false},
  {confirmations:11}
 ])assert.equal(check(task(),{...good,...change}).verifiedReceived,false,JSON.stringify(change));
});
test("report never exposes payout to inactive receiver or missing trusted evidence",()=>{
 assert.equal(check(task(),null).verifiedReceived,false);
 assert.equal(check(null,transfer()).verifiedReceived,false);
 assert.equal(check(task(),transfer(),agent,"INVALID").verifiedReceived,false);
});
test("foreign-chain USDC, unstable amounts and missing agent assignment reject",()=>{
 const bad=[
  {...task(),bounty:{...task().bounty,network:"eip155:137"}},
  {...task(),bounty:{...task().bounty,token:"USDT"}},
  {...task(),bounty:{...task().bounty,amount_atomic:"-150000000"}},
  {...task(),claimed_by_agent_id:null}
 ];
 for(const t of bad)assert.equal(check(t).verifiedReceived,false);
});
test("a transaction hash without actual transfer proof is not a receipt",()=>{
 const v=transfer();delete v.verifiedByIndependentChainReader;
 const r=check(task(),v);assert.equal(r.verifiedReceived,false);
});
