#!/usr/bin/env node
/**
 * GXEON — operator-only public provider truth gate.
 * --live-read does ONLY unauthenticated GET on three allowlisted providers.
 * It does NOT claim, sign, spend, provision, make PRs or recognize revenue.
 */
import {verifyLiveProviderDemand,PROVIDER_POLICY} from "./provider-escrow-readiness.mjs";
if(!process.argv.includes("--live-read")){
 console.log(JSON.stringify({status:"OFFLINE_DEFAULT",policy:PROVIDER_POLICY,
   providersRead:0,claims:0,payments:0,confirmedRevenueUsdc:0},null,2));
}else{
 try{
  const report=await verifyLiveProviderDemand();
  console.log(JSON.stringify(report,null,2));
 }catch(e){
  const msg=typeof e?.message==="string"&&/^GXEON_PROVIDER_/.test(e.message)
   ?e.message:"GXEON_PROVIDER_READ_FAILED";
  console.error(msg);
  process.exitCode=1;
 }
}
