/**
 * GXEON on-chain PAYOUT verifier: independent read-only Base explorer
 * reconciliation (separate from provider self-reported "settled").
 *
 * Never signs, claims, mutates a wallet, or declares earnings based on
 * advertised rewards or a provider transaction hash alone.
 */
import {BASE_USDC_ADDRESS,verifyBasedAgentsPayout,readVerifiedBaseUsdcPayout} from "./payout-proof-gate.mjs";
const TX=/^0x[0-9a-fA-F]{64}$/;
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const EXPLORER="https://base.blockscout.com/api/v2/transactions/";
const same=(a,b)=>typeof a==="string"&&typeof b==="string"&&a.toLowerCase()===b.toLowerCase();
const uint=(v)=>typeof v==="string"&&/^(?:0|[1-9]\d*)$/.test(v)?BigInt(v):null;
const blocked=(reason)=>Object.freeze({verifiedReceived:false,revenueBookable:false,amountReceivedUsdc:0,reason});

export function inspectBasePayoutEvidence(task, receipt, transfers, authorizedRecipientAgentId, authorizedRecipientWallet){
  if(!task || !ADDRESS.test(authorizedRecipientWallet??"") ||
    typeof authorizedRecipientAgentId!=="string" || !/^ag_[A-Za-z0-9_-]{10,120}$/.test(authorizedRecipientAgentId))
    return blocked("AUTHORIZED_RECEIVER_REQUIRED");
  if(task.status!=="verified" || task.payment_status!=="settled" ||
    task.payment_settled!==1 || task.escrow?.status!=="released" ||
    task.claimed_by_agent_id!==authorizedRecipientAgentId)
    return blocked("PROVIDER_SETTLEMENT_AND_OWNERSHIP_UNVERIFIED");
  const hash=task.payment_tx_hash, release=task.escrow?.release_tx_hash;
  if(!TX.test(hash??"") || !same(hash,release) ||
    !ADDRESS.test(task.escrow?.wallet??""))
    return blocked("PAYOUT_TX_OR_ESCROW_REFERENCE_UNVERIFIED");
  if(!receipt || !same(receipt.hash,hash) || receipt.status!=="ok" ||
    receipt.result!=="success" || receipt.token_transfers_overflow===true ||
    !Number.isSafeInteger(receipt.confirmations)||receipt.confirmations<12)
    return blocked("CHAIN_TRANSACTION_NOT_FINALIZED");
  if(!transfers||!Array.isArray(transfers.items)||
    transfers.items.length>100||transfers.next_page_params!=null)
    return blocked("CHAIN_TOKEN_TRANSFERS_INCOMPLETE");
  const amount=uint(task.bounty?.amount_atomic);
  if(amount===null || amount<=0n || amount!==uint(task.bounty_amount) ||
     task.bounty?.network!=="eip155:8453" || task.bounty?.token!=="USDC")
    return blocked("REWARD_TOKEN_OR_VALUE_UNVERIFIED");
  const matches=transfers.items.filter(event=>
    same(event?.transaction_hash,hash) &&
    same(event?.token?.address_hash,BASE_USDC_ADDRESS) &&
    event?.token?.decimals==="6" &&
    same(event?.from?.hash,task.escrow.wallet) &&
    same(event?.to?.hash,authorizedRecipientWallet) &&
    uint(event?.total?.value)===amount
  );
  if(matches.length!==1)return blocked("EXACT_USDC_TRANSFER_NOT_UNIQUELY_PROVEN");
  // This function only examines caller-supplied JSON. It MUST NOT return
  // verified revenue, even for a perfectly shaped fake receipt.
  return blocked("MATCHED_FIELDS_NOT_INDEPENDENTLY_READ");

}
async function readExplorerJson(url,fetchImpl){
  if(!/^https:\/\/base\.blockscout\.com\/api\/v2\/transactions\/0x[a-fA-F0-9]{64}(?:\/token-transfers)?$/.test(url))
    throw new Error("GXEON_PAYOUT_EXPLORER_ENDPOINT_DENIED");
  const response=await fetchImpl(url,{method:"GET",redirect:"error",
    signal:AbortSignal.timeout(12000),
    headers:{Accept:"application/json","User-Agent":"GXEON-independent-payout-proof/1"},
  });
  if(!response.ok)throw new Error("GXEON_PAYOUT_EXPLORER_UNAVAILABLE");
  const json=await response.text();
  if(Buffer.byteLength(json,"utf8")>500000)throw new Error("GXEON_PAYOUT_RESPONSE_TOO_LARGE");
  try{return JSON.parse(json);}catch{throw new Error("GXEON_PAYOUT_BAD_EXPLORER_JSON");}
}
export async function verifyBasedAgentsPayoutOnChain({
  task,authorizedRecipientAgentId,authorizedRecipientWallet,fetchImpl=fetch
}={}){
  // Verify provider acceptance and operator ownership before touching network.
  if(!task || task.status!=="verified"||task.payment_status!=="settled"||
     task.payment_settled!==1||task.escrow?.status!=="released"||
     task.claimed_by_agent_id!==authorizedRecipientAgentId||
     !ADDRESS.test(authorizedRecipientWallet??"")||
     !TX.test(task.payment_tx_hash??"")||
     !same(task.payment_tx_hash,task.escrow?.release_tx_hash))
    return blocked("PROVIDER_SETTLEMENT_OR_AUTHORIZATION_REQUIRED");
  // Provider reward itself must be coherent before touching network.
  const amount=uint(task.bounty?.amount_atomic);
  if(amount===null||amount<=0n||amount!==uint(task.bounty_amount)||
     task.bounty?.network!=="eip155:8453"||task.bounty?.token!=="USDC"||
     !ADDRESS.test(task.escrow?.wallet??""))
    return blocked("REWARD_TOKEN_OR_VALUE_UNVERIFIED");
  // Uses same hardened in-memory proof mint as GXEON payout-proof-gate.
  // Avoid second independent-claim implementation whose provenance is an
  // arbitrary caller-supplied boolean.
  const proof=await readVerifiedBaseUsdcPayout({
    transactionHash:task.payment_tx_hash,
    from:task.escrow.wallet,
    to:authorizedRecipientWallet,
    amountAtomic:task.bounty.amount_atomic,
    fetchImpl,
  });
  return verifyBasedAgentsPayout({
    task,authorizedRecipientAgentId,authorizedRecipientWallet,chainTransfer:proof
  });
}
