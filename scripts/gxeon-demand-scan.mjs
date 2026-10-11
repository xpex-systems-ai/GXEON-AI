#!/usr/bin/env node
/**
 * GXEON existing demand: public search only.
 * No automatic claiming, outbound contact, checkout, credential or wallet.
 */
import { scanPublicDemand, DEMAND_POLICY } from "./demand-intelligence.mjs";
const args=new Set(process.argv.slice(2));
if(!args.has("--live-read")){
  process.stdout.write(JSON.stringify({
    mission:"GXEON_EXISTING_DEMAND_DISCOVERY",
    status:"NETWORK_DISABLED_BY_DEFAULT",
    toRun:"node scripts/gxeon-demand-scan.mjs --live-read",
    policy:DEMAND_POLICY,
    externalCalls:0,
    claims:0,
    payouts:0,
  },null,2)+"\n");
}else {
  try {
    const report=await scanPublicDemand();
    process.stdout.write(JSON.stringify(report,null,2)+"\n");
  }catch(error){
    process.stderr.write("GXEON_DEMAND_SCAN_READ_FAILED: "+(
      typeof error?.message==="string" && /^GXEON_DEMAND_/.test(error.message)
      ? error.message : "SOURCE_OR_NETWORK_ERROR"
    )+"\n");
    process.exitCode=1;
  }
}
