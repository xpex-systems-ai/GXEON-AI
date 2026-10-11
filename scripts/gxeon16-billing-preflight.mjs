/**
 * GXEON 16 — one-shot operator-only, read-only ADMIN preflight.
 * Never mounted as an API route or invoked by normal CI.
 * This file contains no API credentials and is disabled by default.
 */
import {
  checkOpenAIProjectSpendLimit,
  GXEON16_READ_INTENT,
} from "../artifacts/api-server/src/agentos/projectBillingPreflight.ts";

const enabled=process.env.GXEON16_ADMIN_READ_ENABLED==="true";
const projectId=process.env.GXEON15_OPENAI_PROJECT_ID ?? "";
const config={
  enabled,
  environment:process.env.GXEON16_ENVIRONMENT,
  explicitReadCheck:process.env.GXEON16_ADMIN_READ_INTENT ?? "",
  projectId,
  adminKey:process.env.GXEON16_OPENAI_ADMIN_KEY ?? "",
};
if(!enabled){
  process.stdout.write(JSON.stringify({
    mission:"GXEON16_PROJECT_BILLING_PREFLIGHT",
    status:"BLOCKED_ADMIN_READ_DISABLED",
    adminRequestSent:false,
    paidInferenceCalls:0,
    realSpendNotVerified:true,
    finalGoReceived:false,
  })+"\n");
}else{
  try{
    const receipt=await checkOpenAIProjectSpendLimit(config);
    process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
  }catch{
    // Do not disclose token, provider error body or project configuration.
    process.stderr.write("GXEON16_ADMIN_READ_FAILED_OR_UNAUTHORIZED\n");
    process.exitCode=1;
  }
}
