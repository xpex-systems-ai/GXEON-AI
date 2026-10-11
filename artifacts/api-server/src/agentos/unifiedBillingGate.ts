/**
 * GXEON 17 — unified provider-cost and project hard-limit preflight.
 * No paid inference in this module. All external requests are GET, must be
 * explicitly operator-enabled and use a private admin credential.
 *
 * A provider project can have delayed cost aggregation and lagging hard-limit
 * enforcement: success means "read checks matched", never a guaranteed cap.
 */
import { createHash } from "node:crypto";
import {
  checkOpenAIProjectSpendLimit,
  type ReadOnlyAdminConfig,
  type ReadOnlyFetch,
} from "./projectBillingPreflight.ts";

const ID = /^proj_[A-Za-z0-9_-]{6,120}$/;
const READ_CONSENT = "GXEON16_READ_PROJECT_HARD_SPEND_LIMIT_ONLY";
export const GXEON17_READINESS = Object.freeze({
  mode: "OPERATOR_ONLY_PRIVATE_CLI",
  allowedCostEndpoint: "https://api.openai.com/v1/organization/costs",
  maxProjectMonthlyCostUsd: 0,
  maxFinalCallAuthorizationUsd: 0.01,
  providerHardLimitCents: 1,
  maxJsonBytes: 32768,
  timeoutMs: 8000,
  noPaidInference: true,
  noProjectMutations: true,
  providerLimitCanOvershoot: true,
  billingAggregationCanLag: true,
} as const);
export type PrivateBillingConfig = ReadOnlyAdminConfig & {
  approvedCapUsd: number;
  operatorFinalGo: string;
};
export type BillingReadiness = {
  status: "PROVIDER_READ_CHECKS_MATCHED_NOT_FINANCIAL_GUARANTEE";
  projectFingerprint: string;
  hardLimitEnforcing: true;
  monthlyCostUsdReported: 0;
  providerCostAggregationMayLag: true;
  providerLimitMayOvershoot: true;
  finalGoSelfAttested: true;
  paymentRequestPerformed: false;
  adminReadRequests: 2;
};
export type AdminFetch = ReadOnlyFetch;
function fail(message: string): never { throw new Error(message); }
export function evaluateProjectCostReport(projectId: string, raw: unknown, expectedStartSeconds: number, expectedEndSeconds: number): 0 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("GXEON17_COSTS_UNVERIFIED");
  const obj = raw as Record<string, any>;
  if (obj.object !== "page" || obj.has_more !== false || obj.next_page != null ||
      !Array.isArray(obj.data) || obj.data.length === 0 || obj.data.length > 31) fail("GXEON17_COSTS_UNVERIFIED");
  let verified=0;
  for (const day of obj.data) {
    if (!day || day.object !== "bucket" || !Number.isSafeInteger(day.start_time) ||
      !Number.isSafeInteger(day.end_time) || day.start_time < expectedStartSeconds ||
      day.end_time > expectedEndSeconds + 86400 ||
      day.end_time <= day.start_time || !Array.isArray(day.results)) fail("GXEON17_COSTS_UNVERIFIED");
    for(const entry of day.results) {
      if (!entry || entry.object !== "organization.costs.result" ||
        entry.project_id !== projectId || !entry.amount ||
        entry.amount.currency !== "usd" || !Number.isFinite(entry.amount.value) ||
        entry.amount.value !== 0) fail("GXEON17_COSTS_UNVERIFIED");
      verified++;
    }
  }
  // Empty results are allowed for a new project only when the provider
  // returns a valid empty daily bucket (the monthly bucket is still checked).
  if (!verified && !obj.data.some((b:any)=>Array.isArray(b.results) && b.results.length===0)) {
    fail("GXEON17_COSTS_UNVERIFIED");
  }
  return 0;
}
export function monthCostWindow(nowMs: number) {
  if (!Number.isFinite(nowMs) || nowMs <= 0) fail("GXEON17_CLOCK_INVALID");
  const now=new Date(nowMs);
  const first=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  return {
    startSeconds:Math.floor(first.getTime()/1000),
    endSeconds:Math.floor(nowMs/1000),
  };
}

/** Run only after operator provides separate final GO and private project credentials. */
export async function verifyProjectBillingBeforePaidCall(
  config: PrivateBillingConfig,
  fetchImpl: AdminFetch = fetch,
  nowMs: number = Date.now(),
): Promise<BillingReadiness> {
  if (!config || !ID.test(config.projectId??"") ||
    config.enabled !== true || config.environment !== "synthetic-only" ||
    config.explicitReadCheck !== READ_CONSENT ||
    config.operatorFinalGo !== "I_CONFIRM_ONE_PAID_SYNTHETIC_CALL_NOW" ||
    config.approvedCapUsd !== GXEON17_READINESS.maxFinalCallAuthorizationUsd ||
    typeof config.adminKey !== "string" || !/^sk-[^\s]{16,}$/.test(config.adminKey)) {
      fail("GXEON17_FINAL_APPROVAL_AND_READ_CREDENTIALS_REQUIRED");
  }
  const {startSeconds,endSeconds}=monthCostWindow(nowMs);
  if (endSeconds <= startSeconds) fail("GXEON17_CLOCK_INVALID");
  const hard=await checkOpenAIProjectSpendLimit(config,fetchImpl);
  if (hard.hardLimitGate !== "HARD_LIMIT_ENFORCING_USD_0_01" ||
    hard.observedLimitCents !== GXEON17_READINESS.providerHardLimitCents ||
    hard.readOnlyAdminRequestSent !== true) fail("GXEON17_HARD_LIMIT_NOT_ENFORCING");
  const query = new URLSearchParams();
  query.append("start_time",String(startSeconds));
  query.append("end_time",String(endSeconds));
  query.append("bucket_width","1d");
  query.append("limit","31");
  query.append("project_ids[]",config.projectId);
  const url=GXEON17_READINESS.allowedCostEndpoint+"?"+query.toString();
  const response=await fetchImpl(url,{
    method:"GET",redirect:"error",
    signal:AbortSignal.timeout(GXEON17_READINESS.timeoutMs),
    headers:{Authorization:"Bearer "+config.adminKey,Accept:"application/json"},
  });
  if(!response.ok) fail("GXEON17_PROVIDER_COSTS_READ_FAILED");
  const text=await response.text();
  if(Buffer.byteLength(text,"utf8")>GXEON17_READINESS.maxJsonBytes) fail("GXEON17_COSTS_RESPONSE_TOO_LARGE");
  let json:unknown;
  try {json=JSON.parse(text);}catch{fail("GXEON17_COSTS_RESPONSE_INVALID");}
  evaluateProjectCostReport(config.projectId,json,startSeconds,endSeconds);
  return {
    status:"PROVIDER_READ_CHECKS_MATCHED_NOT_FINANCIAL_GUARANTEE",
    projectFingerprint:createHash("sha256").update(config.projectId).digest("hex").slice(0,12),
    hardLimitEnforcing:true,
    monthlyCostUsdReported:0,
    providerCostAggregationMayLag:true,
    providerLimitMayOvershoot:true,
    finalGoSelfAttested:true,
    paymentRequestPerformed:false,
    adminReadRequests:2,
  };
}
