/**
 * GXEON Provider Truth Gate — read-only marketplace demand verification.
 *
 * Public APIs only. This file never creates transactions, obtains auth,
 * generates keys, claims jobs or reports reward advertisements as revenue.
 * An API claim of escrow is NOT independent blockchain confirmation.
 */
const BASE_CHAIN_ID=8453;
const USDC_NETWORK="eip155:8453";
const SECURE_TX=/^0x[0-9a-fA-F]{64}$/;
const READ_ONLY_ENDPOINTS=Object.freeze({
  basebounty:"https://www.basebounty.app/api/v1/bounties?status=open",
  basedagents:"https://api.basedagents.ai/v1/tasks?status=open",
  projectroom:"https://room.trydemigod.com/api/project-offers",
});
export const PROVIDER_POLICY=Object.freeze({
  mode:"READ_ONLY_NEVER_CLAIM",
  requestTimeoutMs:12000,
  maxJsonBytes:1000000,
  minRewardUsdc:100,
  chainId:BASE_CHAIN_ID,
  noPaymentSigning:true,
  noKeysOrWallets:true,
  noClaims:true,
  noRevenueClaims:true,
  claimNeedsManualUserApproval:true,
  escrowNeedsIndependentChainVerification:true,
});
const rejected=(provider,id,title,reason,detail={})=>Object.freeze({
  provider,id,title:typeof title==="string"?title.slice(0,180):"",
  status:"BLOCKED",reason,qualified:false,claimApproved:false,
  ...detail,
});
const candidate=(provider,id,title,amountUsdc,detail={})=>Object.freeze({
  provider,id,title:title.slice(0,180),amountUsdc,
  status:"PROVIDER_ESCROW_REPORTED",qualified:false,claimApproved:false,
  warning:"Provider API says funded; chain escrow, taker permissions, task legitimacy and acceptance still unverified.",
  ...detail,
});
function safeAmount(s){
  if(typeof s!=="string"||!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(s))return null;
  const n=Number(s);
  return Number.isFinite(n)&&n>=0&&n<=1e8?n:null;
}
function atomicUsdc(s){
  if(typeof s!=="string"||!/^(?:0|[1-9]\d*)$/.test(s))return null;
  const units=BigInt(s);
  if(units>100000000000000n)return null;
  return Number(units)/1e6;
}
function suspicious(title,description){
  const combined=(String(title??"")+"\n"+String(description??"")).slice(0,9000);
  return /(?:please\s+ignore|test\s+hire|will\s+be\s+cancelled|fake\s+bounty|honeypot|wallet\s+top.?up|deposit\s+funds\s+to\s+claim|paid\s+trial\s+cycle|across\s+two\s+utc\s+days|attributable\s+settled\s+.*revenue)/i.test(combined);
}

export function inspectBasedAgentsPayload(payload, opts={minUsdc:PROVIDER_POLICY.minRewardUsdc}){
  if(!payload||payload.ok!==true||!Array.isArray(payload.tasks))
    throw new Error("GXEON_BASEDAGENTS_SCHEMA_UNKNOWN");
  if(payload.tasks.length>500)throw new Error("GXEON_BASEDAGENTS_UNBOUNDED");
  return payload.tasks.map(task=>{
    const id=typeof task?.task_id==="string"&&/^task_[a-zA-Z0-9_-]{5,90}$/.test(task.task_id)?task.task_id:"INVALID";
    const title=String(task?.title??"");
    if(id==="INVALID")return rejected("basedagents",id,title,"INVALID_TASK_ID");
    if(task?.status!=="open"||task?.claimable!==true||task?.claimed_by_agent_id)
      return rejected("basedagents",id,title,"NOT_CURRENTLY_OPEN_CLAIMABLE");
    if(suspicious(title,task.description))return rejected("basedagents",id,title,"TEST_OR_CONDITIONAL_REVENUE_TASK");
    const amount=atomicUsdc(task?.bounty?.amount_atomic??task?.bounty_amount);
    if(amount===null||amount<opts.minUsdc)
      return rejected("basedagents",id,title,"BELOW_MIN_REWARD_OR_NO_CASH",{amountUsdc:amount});
    if(task?.bounty?.token!=="USDC" || task?.bounty?.network!==USDC_NETWORK)
      return rejected("basedagents",id,title,"WRONG_TOKEN_OR_NETWORK");
    if(task?.escrow?.status!=="funded"||task?.payment_verified!==1||!SECURE_TX.test(task?.escrow?.deposit_tx_hash??""))
      return rejected("basedagents",id,title,"ESCROW_NOT_PROVEN_IN_PROVIDER_RECORD",{amountUsdc:amount});
    return candidate("basedagents",id,title,amount,{
      sourceUrl:`https://api.basedagents.ai/v1/tasks/${encodeURIComponent(id)}`,
      network:USDC_NETWORK,
      depositTxHash:task.escrow.deposit_tx_hash,
      payoutState:"NOT_EARNED",
    });
  });
}

export function inspectBaseBountyPayload(payload,opts={minUsdc:PROVIDER_POLICY.minRewardUsdc}){
  if(!payload||payload.network!=="Base"||payload.chainId!==BASE_CHAIN_ID||
      payload.testnet!==false||!Array.isArray(payload.bounties)||
      !Number.isInteger(payload.count)||payload.count!==payload.bounties.length)
      throw new Error("GXEON_BASEBOUNTY_SCHEMA_UNKNOWN");
  if(payload.bounties.length>500)throw new Error("GXEON_BASEBOUNTY_UNBOUNDED");
  return payload.bounties.map(task=>{
    const id=String(task?.jobId??task?.id??"");
    const title=String(task?.title??task?.description??"");
    if(task?.status!=="open")return rejected("basebounty",id,title,"NOT_CURRENTLY_OPEN");
    if(suspicious(title,task?.description))return rejected("basebounty",id,title,"TEST_OR_CONDITIONAL_REVENUE_TASK");
    const amount=safeAmount(String(task?.workerPayoutUsdc??""));
    if(amount===null||amount<opts.minUsdc)
      return rejected("basebounty",id,title,"BELOW_MIN_REWARD_OR_AMOUNT_UNVERIFIED",{amountUsdc:amount});
    if(!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id)))
      return rejected("basebounty",id,title,"INVALID_JOB_ID",{amountUsdc:amount});
    // Read-from-chain contract storage described by provider, but STILL
    // require independent chain read and requirements review before claim.
    return candidate("basebounty",id,title,amount,{
      sourceUrl:`https://www.basebounty.app/api/v1/bounties/${id}?full=1`,
      network:USDC_NETWORK,
      escrowClaim:"PLATFORM_CONTRACT_STORAGE_NOT_INDEPENDENTLY_VERIFIED",
      payoutState:"NOT_EARNED",
    });
  });
}

export function inspectProjectRoomPayload(payload,opts={minUsdc:PROVIDER_POLICY.minRewardUsdc}){
  if(!payload||!Array.isArray(payload.offers))throw new Error("GXEON_PROJECTROOM_SCHEMA_UNKNOWN");
  if(payload.offers.length>500)throw new Error("GXEON_PROJECTROOM_UNBOUNDED");
  return payload.offers.map(offer=>{
    const id=String(offer?.id??"");
    const title=String(offer?.title??"");
    if(offer?.schema!=="project-room-offer/1"||offer?.status!=="published"||offer?.kind!=="task")
      return rejected("projectroom",id,title,"NOT_ACTIVE_CANONICAL_TASK");
    if(offer?.reward?.kind!=="cash"||offer?.reward?.unit!=="USDC"||offer?.reward?.decimals!==6)
      return rejected("projectroom",id,title,"NOT_USDC_CASH_REWARD");
    const amount=atomicUsdc(offer?.reward?.amountMinor);
    if(amount===null||amount<opts.minUsdc)
      return rejected("projectroom",id,title,"BELOW_MIN_REWARD_OR_AMOUNT_UNVERIFIED",{amountUsdc:amount});
    if(offer?.fundingStatus!=="funded"||offer?.paymentStatus!=="ready")
      return rejected("projectroom",id,title,"FUNDING_OR_PAYMENT_RAIL_NOT_CONFIGURED",{amountUsdc:amount,
        fundingStatus:String(offer.fundingStatus??"UNKNOWN"),
        paymentStatus:String(offer.paymentStatus??"UNKNOWN")});
    // Even if a future API changes statuses, this must NOT be counted as
    // escrow-verified automatically; project room does not expose a deposit.
    return rejected("projectroom",id,title,"NO_INDEPENDENT_DEPOSIT_EVIDENCE",{amountUsdc:amount});
  });
}

function summarize(results){
 const byStatus={};
 for(const x of results)byStatus[x.reason??x.status]=(byStatus[x.reason??x.status]??0)+1;
 return byStatus;
}
export function evaluateProviderSnapshots({basedagents,basebounty,projectroom},opts={}){
 const records=[
  ...inspectBasedAgentsPayload(basedagents,opts),
  ...inspectBaseBountyPayload(basebounty,opts),
  ...inspectProjectRoomPayload(projectroom,opts),
 ];
 const provisional=records.filter(r=>r.status==="PROVIDER_ESCROW_REPORTED");
 return Object.freeze({
  mission:"GXEON_VERIFIED_DEMAND_READINESS",
  mode:"READ_ONLY_NO_CLAIM",
  minRewardUsdc:opts.minUsdc??PROVIDER_POLICY.minRewardUsdc,
  examined:records.length,
  provisionalProviderEscrow:provisional.length,
  independentlyVerifiedEscrow:0,
  claimReady:0,
  claimsSubmitted:0,
  expectedPayoutUsdc:0,
  confirmedRevenueUsdc:0,
  requiresIndependentOnchainReview:true,
  reasons:summarize(records),
  candidates:provisional,
  blocked:records.filter(r=>r.status==="BLOCKED"),
 });
}
async function readJson(url,fetchImpl){
 const u=new URL(url);
 if(u.protocol!=="https:"||!Object.values(READ_ONLY_ENDPOINTS).includes(u.href))
   throw new Error("GXEON_PROVIDER_ENDPOINT_DENIED");
 const response=await fetchImpl(u.href,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(PROVIDER_POLICY.requestTimeoutMs),
   headers:{Accept:"application/json","User-Agent":"GXEON-read-only-bounty-truth/1"},
 });
 if(!response.ok)throw new Error("GXEON_PROVIDER_HTTP_FAILURE");
 const content=await response.text();
 if(Buffer.byteLength(content,"utf8")>PROVIDER_POLICY.maxJsonBytes)
   throw new Error("GXEON_PROVIDER_RESPONSE_TOO_LARGE");
 try{return JSON.parse(content);}catch{throw new Error("GXEON_PROVIDER_JSON_INVALID");}
}
export async function verifyLiveProviderDemand({fetchImpl=fetch,minUsdc=PROVIDER_POLICY.minRewardUsdc}={}){
 if(!Number.isFinite(minUsdc)||minUsdc<0||minUsdc>100000)
   throw new Error("GXEON_PROVIDER_INVALID_MINIMUM");
 // Independent provider failures fail the whole audit, no fabricated 0s.
 const [basedagents,basebounty,projectroom]=await Promise.all([
   readJson(READ_ONLY_ENDPOINTS.basedagents,fetchImpl),
   readJson(READ_ONLY_ENDPOINTS.basebounty,fetchImpl),
   readJson(READ_ONLY_ENDPOINTS.projectroom,fetchImpl),
 ]);
 return evaluateProviderSnapshots({basedagents,basebounty,projectroom},{minUsdc});
}
