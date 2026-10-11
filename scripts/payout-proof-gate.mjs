/**
 * GXEON Payout Proof Gate (read-only): never declare USDC "received" from
 * a bounty ad, provider acceptance message or tx hash alone.
 *
 * Requires corroborated Base USDC ERC20 transfer to an approved beneficiary.
 * chainTransfer must be from an independently verified chain read, NOT a
 * user-supplied attestation. This is a pure guard, it cannot fetch funds.
 */
export const BASE_USDC_ADDRESS="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const HASH=/^0x[0-9a-fA-F]{64}$/;
const uint=(v)=>typeof v==="string"&&/^(?:0|[1-9]\d*)$/.test(v)?BigInt(v):null;
// Trusted proof identity is private to this module and cannot be forged by callers.
const independentlyReadPayouts=new WeakSet();
const same=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.toLowerCase()===b.toLowerCase();
const fail=(reason)=>Object.freeze({verifiedReceived:false,reason,amountReceivedUsdc:0,
  claimEligible:false,withdrawn:false,revenueBookable:false});
export function verifyBasedAgentsPayout({task,chainTransfer,authorizedRecipientAgentId,authorizedRecipientWallet}={}){
 if(!task||!chainTransfer||!ADDRESS.test(authorizedRecipientWallet??"")||
    typeof authorizedRecipientAgentId!=="string"||!/^ag_[a-zA-Z0-9_-]{10,120}$/.test(authorizedRecipientAgentId))
   return fail("MISSING_PRIVATE_OPERATOR_IDENTITY_OR_CHAIN_EVIDENCE");
 if(task.status!=="verified"||task.payment_status!=="settled"||
   task.payment_settled!==1||task.escrow?.status!=="released")
   return fail("NOT_VERIFIED_ACCEPTED_AND_SETTLED");
 if(task.claimed_by_agent_id!==authorizedRecipientAgentId)
   return fail("DELIVERY_BELONGS_TO_ANOTHER_AGENT");
 if(task.bounty?.network!=="eip155:8453"||task.bounty?.token!=="USDC")
   return fail("UNSUPPORTED_TOKEN_OR_NETWORK");
 const expected=uint(task.bounty?.amount_atomic);
 if(expected===null||expected<=0n)return fail("INVALID_PAYOUT_AMOUNT");
 const paidHash=task.payment_tx_hash??task.escrow?.release_tx_hash;
 if(!HASH.test(paidHash??"")||!same(task.escrow?.release_tx_hash,paidHash))
   return fail("MISSING_MATCHING_RELEASE_TRANSACTION");
 if(!independentlyReadPayouts.has(chainTransfer)||chainTransfer.verifiedByIndependentChainReader!==true||
    chainTransfer.success!==true||chainTransfer.chainId!==8453||
    !Number.isSafeInteger(chainTransfer.confirmations)||chainTransfer.confirmations<12)
   return fail("CHAIN_CONFIRMATIONS_NOT_PROVEN");
 if(!same(chainTransfer.transactionHash,paidHash)||
    !same(chainTransfer.tokenAddress,BASE_USDC_ADDRESS)||
    !same(chainTransfer.to,authorizedRecipientWallet)||
    !same(chainTransfer.from,task.escrow?.wallet))
   return fail("CHAIN_TRANSFER_DOES_NOT_MATCH_RECEIPT");
 const sent=uint(chainTransfer.amountAtomic);
 if(sent!==expected)return fail("USDC_AMOUNT_MISMATCH");
 return Object.freeze({
    verifiedReceived:true,
    reason:"SETTLED_PROVIDER_AND_INDEPENDENT_USDC_TRANSFER_MATCH",
    amountReceivedUsdc:Number(sent)/1000000,
    claimEligible:false,withdrawn:false,revenueBookable:true,
    chainId:8453,txHash:paidHash,
    transactionConfirmed:true,
    payoutWalletFingerprint:authorizedRecipientWallet.slice(0,6)+"…"+authorizedRecipientWallet.slice(-4),
 });
}

const EXPLORER_PREFIX="https://base.blockscout.com/api/v2/transactions/";
async function readPublicReceipt(url,fetchImpl){
  if(!/^https:\/\/base\.blockscout\.com\/api\/v2\/transactions\/0x[0-9a-fA-F]{64}(?:\/token-transfers)?$/.test(url))
    throw new Error("GXEON_PAYOUT_INVALID_EXPLORER_URL");
  const response=await fetchImpl(url,{
    method:"GET",redirect:"error",signal:AbortSignal.timeout(12000),
    headers:{Accept:"application/json","User-Agent":"GXEON-payout-proof-readonly/1"},
  });
  if(!response.ok)throw new Error("GXEON_PAYOUT_EXPLORER_UNAVAILABLE");
  const data=await response.text();
  if(Buffer.byteLength(data,"utf8")>400000)throw new Error("GXEON_PAYOUT_RESPONSE_TOO_LARGE");
  try{return JSON.parse(data);}catch{throw new Error("GXEON_PAYOUT_BAD_EXPLORER_JSON");}
}

/** Only a real explorer GET can mint a trusted in-memory transfer proof. */
export async function readVerifiedBaseUsdcPayout({
  transactionHash,from,to,amountAtomic,fetchImpl=fetch,
}={}){
  const atomic=uint(amountAtomic);
  if(!HASH.test(transactionHash??"")||!ADDRESS.test(from??"")||
     !ADDRESS.test(to??"")||atomic===null||atomic<=0n||atomic>100000000000000n)
    throw new Error("GXEON_PAYOUT_INVALID_TRANSACTION_REQUEST");
  const url=EXPLORER_PREFIX+transactionHash;
  const [tx,report]=await Promise.all([
    readPublicReceipt(url,fetchImpl),
    readPublicReceipt(url+"/token-transfers",fetchImpl),
  ]);
  const confirmations=Number(tx?.confirmations);
  if(!same(tx?.hash,transactionHash)||tx?.result!=="success"||tx?.status!=="ok"||
     !Number.isSafeInteger(confirmations)||confirmations<12)
    throw new Error("GXEON_PAYOUT_TRANSACTION_UNCONFIRMED");
  if(!Array.isArray(report?.items)||report.next_page_params!=null||
     report.items.length===0||report.items.length>100)
    throw new Error("GXEON_PAYOUT_TOKEN_EVENTS_INCOMPLETE");
  const matches=report.items.filter(entry=>
    same(entry?.from?.hash,from)&&same(entry?.to?.hash,to)&&
    same(entry?.token?.address_hash,BASE_USDC_ADDRESS)&&
    String(entry?.token?.decimals)==="6"&&
    uint(entry?.total?.value)===atomic);
  if(matches.length!==1)throw new Error("GXEON_PAYOUT_USDC_TRANSFER_NOT_UNIQUE");
  const proof=Object.freeze({
    verifiedByIndependentChainReader:true,
    success:true,chainId:8453,confirmations,
    transactionHash,from,to,tokenAddress:BASE_USDC_ADDRESS,
    amountAtomic,
  });
  independentlyReadPayouts.add(proof);
  return proof;
}
