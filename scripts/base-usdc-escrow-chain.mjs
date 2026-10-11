/**
 * GXEON public on-chain deposit proof — Base Blockscout public API.
 * Read-only; GET exactly one allowlisted chain receipt and token transfers.
 * A proven funded TEST task is still not a legitimate commercial opportunity.
 */
import {BASE_USDC_ADDRESS} from "./payout-proof-gate.mjs";
import {inspectBasedAgentsPayload} from "./provider-escrow-readiness.mjs";
const VALID_HASH=/^0x[a-fA-F0-9]{64}$/;
const VALID_ADDRESS=/^0x[a-fA-F0-9]{40}$/;
const EXPLORER="https://base.blockscout.com/api/v2/transactions/";
const same=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.toLowerCase()===b.toLowerCase();
const uint=(s)=>typeof s==="string"&&/^(?:0|[1-9]\d*)$/.test(s)?BigInt(s):null;
const fail=reason=>Object.freeze({independentlyVerified:false,status:"BLOCKED",reason,claimReady:false,paymentReceived:false});
export function assessBaseEscrowDeposit(task,tx,transfers){
 if(!task||task.escrow?.status!=="funded"||task?.payment_verified!==1||
   task.status!=="open"||task.claimable!==true)
   return fail("PROVIDER_ESCROW_STATE_NOT_CLAIMABLE");
 const txHash=task.escrow.deposit_tx_hash;
 if(!VALID_HASH.test(txHash??"")||!VALID_ADDRESS.test(task.escrow.wallet??""))
   return fail("PROVIDER_ESCROW_TX_REFERENCE_INVALID");
 if(!tx||!same(tx.hash,txHash)||tx.result!=="success"||tx.status!=="ok"||
   !Number.isInteger(tx.confirmations)||tx.confirmations<12)
   return fail("TRANSACTION_NOT_FINALIZED");
 if(!transfers||!Array.isArray(transfers.items)||transfers.next_page_params!=null||
   transfers.items.length>100)
   return fail("TRANSFER_REPORT_INCOMPLETE");
 const atomic=uint(task.bounty?.amount_atomic);
 if(atomic===null||atomic<=0n||atomic!==uint(task.bounty_amount)||
   task.bounty?.network!=="eip155:8453"||task.bounty?.token!=="USDC")
   return fail("PROVIDER_REWARD_AMOUNT_UNVERIFIED");
 const match=transfers.items.some(event=>
   same(event?.to?.hash,task.escrow.wallet) &&
   same(event?.token?.address_hash,BASE_USDC_ADDRESS) &&
   event?.token?.decimals==="6" &&
   uint(event?.total?.value)===atomic &&
   // The x402 payer on this type of task is the public creator wallet.
   VALID_ADDRESS.test(task.creator?.wallet??"") &&
   same(event?.from?.hash,task.creator.wallet));
 if(!match)return fail("NO_MATCHING_USDC_ESCROW_DEPOSIT");
 // A real funded escrow is NOT a green light to claim a fake/test task.
 const text=(String(task.title??"")+" "+String(task.description??"")).slice(0,9000);
 if(/test hire|please ignore|will be cancelled|honeypot|fake bounty/i.test(text))
   return Object.freeze({independentlyVerified:true,status:"FUNDED_BUT_INELIGIBLE_TEST",
     reason:"TEST_TASK_NOT_COMMERCIAL",claimReady:false,paymentReceived:false});
 return Object.freeze({independentlyVerified:true,status:"PROVIDER_ESCROW_AND_CHAIN_MATCH",
   reason:"BASE_USDC_ESCROW_DEPOSIT_MATCHED",claimReady:false,paymentReceived:false,
   depositTxHash:txHash,confirmedChain:"eip155:8453",
   rewardUsdc:Number(atomic)/1e6,requiresOperatorIdentityAndEligibility:true});
}
async function safeJson(url,fetchImpl){
 if(!url.startsWith(EXPLORER)||!/^https:\/\/base\.blockscout\.com\/api\/v2\/transactions\/0x[a-fA-F0-9]{64}(?:\/token-transfers)?$/.test(url))
   throw new Error("GXEON_CHAIN_ENDPOINT_REJECTED");
 const res=await fetchImpl(url,{method:"GET",redirect:"error",
   signal:AbortSignal.timeout(12000),headers:{Accept:"application/json","User-Agent":"GXEON-readonly-chain-escrow-check/1"}});
 if(!res.ok)throw new Error("GXEON_CHAIN_HTTP_UNAVAILABLE");
 const body=await res.text();
 if(Buffer.byteLength(body,"utf8")>400000)throw new Error("GXEON_CHAIN_RESPONSE_TOO_LARGE");
 try{return JSON.parse(body);}catch{throw new Error("GXEON_CHAIN_JSON_INVALID");}
}
export async function verifyBaseEscrowDeposit(task,{fetchImpl=fetch}={}){
 const tx=task?.escrow?.deposit_tx_hash;
 if(!VALID_HASH.test(tx??"")||!VALID_ADDRESS.test(task?.escrow?.wallet??""))
   return fail("PROVIDER_ESCROW_TX_REFERENCE_INVALID");
 const base=EXPLORER+tx;
 const [receipt,tokenTransfers]=await Promise.all([safeJson(base,fetchImpl),safeJson(base+"/token-transfers",fetchImpl)]);
 return assessBaseEscrowDeposit(task,receipt,tokenTransfers);
}

/**
 * Preflight before even using an external explorer. This is a critical
 * separation between "not worth doing" and a network outage.
 * An ineligible task NEVER triggers a chain read or a claim.
 */
export async function verifyEligibleBaseEscrowDeposit(task,{fetchImpl=fetch}={}){
  const [gate]=inspectBasedAgentsPayload({ok:true,tasks:[task]});
  if(gate.status!=="PROVIDER_ESCROW_REPORTED"){
    return Object.freeze({
      independentlyVerified:false,
      status:"INELIGIBLE_NO_EXPLORER_CALL",
      reason:gate.reason??"NOT_PROVISIONALLY_ELIGIBLE",
      claimReady:false,paymentReceived:false,explorerReads:0,
    });
  }
  return verifyBaseEscrowDeposit(task,{fetchImpl});
}
