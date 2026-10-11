/**
 * GXEON existing-demand exchange — read-only public Github issue discovery.
 * No wallet, no paid model calls, no service offering, no claims or submissions.
 * Issue authors' advertised $ are NOT escrow or receivables.
 */
const GITHUB_URL = "https://api.github.com/search/issues";
const QUERY = Object.freeze([
  'is:issue is:open label:bounty "agent"',
  'is:issue is:open label:bounty "MCP"',
  'is:issue is:open label:bounty "API"',
]);
const SCAM_FARM_REPOS = Object.freeze([
  "unsafelabs/", "securebananalabs/", "clankernation/", "zhangjiayang6835-cyber/bounty-plaza", "senthemodder/claude-honeypot",
]);
export const DEMAND_POLICY = Object.freeze({
  version:"GXEON_EXISTING_DEMAND_V1",
  minimumAdvertisedUsd:100,
  maximumCommentCount:100,
  maximumPerQuery:30,
  timeoutMs:12000,
  retryCount:0,
  networkHosts:["api.github.com"],
  onlyReadExistingDemand:true,
  noOutboundSolicitation:true,
  noClaimWithoutVerifiedPaymentTerms:true,
  noAutomaticPaymentOrApproval:true,
});
const refund=(n)=>Math.round(Number(n)*100)/100;

export function advertisedBountyUsd(issue){
  if(!issue || typeof issue!=="object")return null;
  const title=typeof issue.title==="string"?issue.title:"";
  const body=typeof issue.body==="string"?issue.body.slice(0,12000):"";
  const patterns=[
    /\[\s*BOUNTY\s*\$\s*(\d{2,6}(?:\.\d{1,2})?)\s*\]/i,
    /\bBOUNTY\s*[:—–-]?\s*\$\s*(\d{2,6}(?:\.\d{1,2})?)\b/i,
    /\b(?:Reward|Payout|Worker price)\s*[:—–-]?\s*\$\s*(\d{2,6}(?:\.\d{1,2})?)\b/i,
    /\$\s*(\d{2,6}(?:\.\d{1,2})?)\s*(?:USDC|USD)\b/i
  ];
  // Cross-check all explicitly advertised reward claims: a mirror with
  // "$400" in a title and "$1 USDC" in the source description is INVALID.
  // Never pick the larger number or default to a payout currency.
  const candidates=[];
  for (const text of [title,body]) for (const p of patterns){
    const match=p.exec(text);
    if(match){
      const amount=Number(match[1]);
      if(!Number.isFinite(amount)||amount>100000||amount<1)return null;
      candidates.push(refund(amount));
    }
  }
  if(!candidates.length || new Set(candidates).size!==1)return null;
  return candidates[0];
}
export function canonicalBountyIssueUrl(raw){
  if(typeof raw!=="string")return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||url.hostname.toLowerCase()!=="github.com"||url.search||url.hash)return null;
    if(!/^\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/.test(url.pathname))return null;
    return url.href;
  }catch{return null;}
}
export function normalizeDemandIssue(issue, now=new Date()){
  if(!issue||typeof issue!=="object"||issue.state!=="open"||
     issue.pull_request || issue.draft===true)return null;
  const url=canonicalBountyIssueUrl(issue.html_url);
  if(!url)return null;
  const reward=advertisedBountyUsd(issue);
  if(reward===null || reward<DEMAND_POLICY.minimumAdvertisedUsd)return null;
  const path=new URL(url).pathname;
  const repo=path.split("/").slice(1,3).join("/");
  if(SCAM_FARM_REPOS.some(prefix=>repo.toLowerCase().startsWith(prefix)))return null;
  // Aggregator mirrors are not the maintainer/escrow source of truth.
  // Do not rank a copied issue as an independently funded bounty.
  const bodyForMirrorCheck=String(issue.body??"").slice(0,5000);
  if(/(?:^|\n)\s*#{1,5}\s*(?:原始链接|source url|original issue|source issue)\s*(?:\n|:)/im.test(bodyForMirrorCheck))return null;
  if(/(?:honeypot|AI agent trap|stop burning your human.s API tokens)/i.test(title+" "+bodyForMirrorCheck))return null;
  const count=Number.isInteger(issue.comments)&&issue.comments>=0?issue.comments:null;
  // Comments do not equal actual claimants, but excessive competition is a warning.
  if(count===null || count>DEMAND_POLICY.maximumCommentCount)return null;
  if(typeof issue.updated_at!=="string" || !Number.isFinite(Date.parse(issue.updated_at)))return null;
  const days=(now.getTime()-Date.parse(issue.updated_at))/86400000;
  if(days<-2 || days>90)return null;
  const title=String(issue.title??"").slice(0,220).trim();
  const body=String(issue.body??"").slice(0,3000);
  const combined=(title+" "+body).toLowerCase();
  const skillTags=["mcp","typescript","javascript","node","api","agent","security","github action","integration"].filter(x=>combined.includes(x));
  const externalPaymentPlatform=/(?:https:\/\/)?(?:www\.)?(?:algora\.io|opire\.dev|gofrantic\.com)\b/i.test(body)
    ? "EXTERNAL_PLATFORM_MENTIONED_NOT_VERIFIED" : "NOT_ESTABLISHED";
  const fundingEvidence="UNVERIFIED";
  return Object.freeze({
    url,title,repository:repo,
    rewardAdvertisedUsd:reward,
    rewardCurrency:"USD_OR_USDC_UNCONFIRMED",
    taskStatus:"GITHUB_OPEN_AT_SEARCH_TIME",
    fundingEvidence,
    externalPaymentPlatform,
    claimState:"NOT_CLAIMED",
    payoutState:"NOT_PAID",
    requiresManualEscrowConfirmation:true,
    requiresEligibilityCheck:true,
    commentCount:count,
    updatedAt:issue.updated_at,
    skillTags,
    opportunityScore:Math.max(0,Math.round((skillTags.length*3)+(reward>=200?6:3)+Math.max(0,15-count/5))),
  });
}

export function evaluatePublicSearchResponse(raw,{now=new Date(),max=15}={}){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||!Array.isArray(raw.items)){
    throw new Error("GXEON_DEMAND_INVALID_SOURCE_SCHEMA");
  }
  if(raw.incomplete_results===true)throw new Error("GXEON_DEMAND_INCOMPLETE_SEARCH");
  if(raw.items.length>DEMAND_POLICY.maximumPerQuery)throw new Error("GXEON_DEMAND_TOO_MANY_ITEMS");
  return raw.items.map(x=>normalizeDemandIssue(x,now)).filter(Boolean).sort((a,b)=>b.opportunityScore-a.opportunityScore).slice(0,max);
}
export function mergeDemandBatches(...lists){
  const seen=new Map();
  for(const list of lists)for(const x of list){
    const existing=seen.get(x.url);
    if(!existing || x.opportunityScore>existing.opportunityScore)seen.set(x.url,x);
  }
  return [...seen.values()].sort((a,b)=>b.opportunityScore-a.opportunityScore || a.url.localeCompare(b.url));
}
export async function scanPublicDemand({fetchImpl=fetch,now=new Date(),max=15}={}){
  const batches=[];
  for(const query of QUERY){
    const u=new URL(GITHUB_URL);
    u.searchParams.set("q",query);
    u.searchParams.set("per_page",String(DEMAND_POLICY.maximumPerQuery));
    u.searchParams.set("sort","updated");
    u.searchParams.set("order","desc");
    const response=await fetchImpl(u.toString(),{
      method:"GET",
      redirect:"error",
      signal:AbortSignal.timeout(DEMAND_POLICY.timeoutMs),
      headers:{Accept:"application/vnd.github+json","User-Agent":"xpex-gxeon-demand-readonly/1"},
    });
    if(!response.ok)throw new Error("GXEON_DEMAND_GITHUB_SOURCE_UNAVAILABLE");
    const body=await response.text();
    if(Buffer.byteLength(body,"utf8")>600000)throw new Error("GXEON_DEMAND_RESPONSE_TOO_LARGE");
    let json;
    try{json=JSON.parse(body);}catch{throw new Error("GXEON_DEMAND_JSON_INVALID");}
    batches.push(evaluatePublicSearchResponse(json,{now,max}));
  }
  return Object.freeze({
    mission:"GXEON_EXISTING_DEMAND_DISCOVERY",
    mode:"READ_ONLY",
    queriedSources:["GitHub open issues with bounty labels"],
    scans:QUERY.length,
    allRewards:"ADVERTISED_UNVERIFIED",
    escrowVerified:0,
    automaticClaims:0,
    paymentsInitiated:0,
    revenueConfirmedUsd:0,
    manualReviewRequired:true,
    results:mergeDemandBatches(...batches).slice(0,max),
  });
}
