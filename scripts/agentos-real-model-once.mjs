/**
 * GXEON 15 operator-only, one-shot CLI. Not a web route or daemon.
 * NEVER invoke without an approved amount, recent provider pricing review
 * and an isolated synthetic-only runtime. Import alone does not make calls.
 */
import {
  createApprovedOneShotSandbox,
  calculatePreflightReservationUsd,
} from "../artifacts/api-server/src/agentos/realModelSandbox.ts";

const input=process.env;
const config={
  enabled:input.GXEON15_ENABLE_REAL_MODEL==="true",
  isolatedEnvironment:input.GXEON15_ENVIRONMENT,
  explicitApproval:input.GXEON15_APPROVAL_ACK ?? "",
  approvedCapUsd:Number(input.GXEON15_APPROVED_CAP_USD ?? "0"),
  priceReviewedAt:input.GXEON15_PRICING_REVIEWED_AT ?? "",
  projectId:input.GXEON15_OPENAI_PROJECT_ID ?? "",
  apiKey:input.OPENAI_API_KEY ?? "",
};
const controller=new AbortController();
process.once("SIGINT",()=>controller.abort());
process.once("SIGTERM",()=>controller.abort());

async function main(){
  if(config.enabled!==true || config.isolatedEnvironment!=="synthetic-only"){
    throw new Error("GXEON15_DISABLED_OR_NOT_ISOLATED");
  }
  // The earlier US$0.01 planning authorization is NOT final consent to
  // make a paid request. This phrase must be provided by the operator only
  // after separate project spending, key isolation and reviewer checks.
  // This self-attestation is NOT a cryptographic proof of those checks.
  if(input.GXEON15_FINAL_PAID_GO!=="I_CONFIRM_ONE_PAID_SYNTHETIC_CALL_NOW"){
    throw new Error("GXEON15_FINAL_USER_GO_REQUIRED");
  }
  // Config values are never printed, especially OPENAI_API_KEY.
  const report=await createApprovedOneShotSandbox(config).run(controller.signal);
  process.stdout.write(JSON.stringify({
    mission:"GXEON15_REAL_SANDBOX",
    status:report.status,
    providerCalls:report.providerCalls,
    providerUsage:report.providerUsage,
    estimatedCostUsd:report.estimatedCostUsd,
    providerInvoiceReconciled:report.providerInvoiceReconciled,
    preflightReservationUsd:report.preflightReservationUsd,
    approvalGranted:report.approvalsGranted,
    verifiedByIndependentLogic:report.verifiedByIndependentLogic,
    missionChainVerified:report.missionChainVerified,
    requestDigest:report.requestDigest,
    proposalDigest:report.proposalDigest,
    model:report.model,
    simulatedFixtureOnly:true,
  },null,2)+"\n");
}
main().catch(e=>{
  const codes=[
    "GXEON15_DISABLED_OR_NOT_ISOLATED",
    "GXEON15_FINAL_USER_GO_REQUIRED",
    "GXEON15_APPROVAL_OR_BUDGET_REQUIRED",
    "GXEON15_PRICE_ATTESTATION_EXPIRED",
    "GXEON15_PROVIDER_HTTP_FAILURE",
    "GXEON15_PROVIDER_RESPONSE_INVALID",
    "GXEON15_RESPONSE_TOO_LARGE",
    "GXEON15_ONE_SHOT_ALREADY_USED",
    "GXEON15_SYNTHETIC_INPUT_LIMIT",
    "GXEON15_REQUEST_LIMIT",
  ];
  const errCode=codes.includes(e?.message)?e.message:"GXEON15_UNKNOWN_OR_ABORTED_ERROR";
  // No provider error content, prompt, key or raw responses in logs.
  process.stderr.write(errCode+"\n");
  process.exitCode=1;
});
