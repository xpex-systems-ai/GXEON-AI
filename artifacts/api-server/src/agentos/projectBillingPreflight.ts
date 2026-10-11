/**
 * GXEON 16 — OFFLINE-BY-DEFAULT read-only project billing preflight.
 *
 * Implements the documented GET project spend limit API only when manually
 * invoked with a separate administration key in an isolated operator process.
 * Does NOT issue Responses API calls, modify provider settings, expose admin
 * credentials, approve funds or authorize a commercial release.
 */
import { createHash } from "node:crypto";
import { REAL_SANDBOX_GUARD, calculatePreflightReservationUsd } from "./realModelSandbox.ts";

export const BILLING_PREFLIGHT_POLICY = Object.freeze({
  state: "DISABLED_UNLESS_EXPLICIT_OPERATOR_READ_CHECK",
  expectedProviderObject: "project.spend_limit",
  expectedCurrency: "USD",
  expectedInterval: "month",
  expectedEnforcementStatus: "enforcing",
  maximumApprovedUsd: 0.01,
  expectedHardLimitCents: 1,
  requestMethod: "GET",
  maxResponseBytes: 4096,
  timeoutMs: 8000,
  noProviderWrites: true,
  noPaidInference: true,
  noCredentialDisplay: true,
  finalGoReceived: false,
  independentReviewerSignedOff: false,
  verifiedCurrentMonthlySpend: false,
  verifiedFundedProviderAccount: false,
  verifiedDedicatedSingleProcessEnvironment: false,
} as const);

export type ProviderSpendLimit = {
  object: "project.spend_limit";
  threshold_amount: number;
  currency: "USD";
  interval: "month";
  enforcement: { status: "enforcing" | "inactive" };
};
export type SpendingGate =
  | "HARD_LIMIT_ENFORCING_USD_0_01"
  | "HARD_LIMIT_NOT_VERIFIED";

export type PreflightResult = {
  mission: "GXEON16_PROJECT_BILLING_PREFLIGHT";
  status: "BLOCKED_PENDING_OPERATOR_REVIEW";
  hardLimitGate: SpendingGate;
  observedLimitCents: number | null;
  projectIdFingerprint: string;
  readOnlyAdminRequestSent: boolean;
  realInferenceCalls: 0;
  paidModelBudgetAuthorizedUsd: 0.01;
  providerBillingVerified: false;
  currentMonthlySpendVerified: false;
  currentCreditsVerified: false;
  isolatedRuntimeVerified: false;
  independentReviewVerified: false;
  finalGoReceived: false;
  apiKeySafeToDisplay: false;
  readyForPaidInference: false;
  remainingGates: readonly string[];
};
const PROJECT_ID = /^proj_[A-Za-z0-9_-]{6,120}$/;
const REQ_INTENT = "GXEON16_READ_PROJECT_HARD_SPEND_LIMIT_ONLY";
const fingerprint = (v: string) => createHash("sha256").update(v).digest("hex").slice(0, 12);

export function evaluateProviderSpendLimit(raw: unknown): {
  hardLimitGate: SpendingGate;
  observedLimitCents: number | null;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { hardLimitGate: "HARD_LIMIT_NOT_VERIFIED", observedLimitCents: null };
  }
  const limit = raw as Partial<ProviderSpendLimit>;
  const cents = Number.isSafeInteger(limit.threshold_amount) && (limit.threshold_amount as number) >= 0
    ? (limit.threshold_amount as number)
    : null;
  const valid =
    limit.object === "project.spend_limit" &&
    limit.currency === "USD" &&
    limit.interval === "month" &&
    cents === BILLING_PREFLIGHT_POLICY.expectedHardLimitCents &&
    limit.enforcement != null &&
    typeof limit.enforcement === "object" &&
    !Array.isArray(limit.enforcement) &&
    limit.enforcement.status === "enforcing" &&
    REAL_SANDBOX_GUARD.maximumOperatorAuthorizationUsd === BILLING_PREFLIGHT_POLICY.maximumApprovedUsd &&
    calculatePreflightReservationUsd() <= BILLING_PREFLIGHT_POLICY.maximumApprovedUsd;
  return {
    hardLimitGate: valid ? "HARD_LIMIT_ENFORCING_USD_0_01" : "HARD_LIMIT_NOT_VERIFIED",
    observedLimitCents: cents,
  };
}

export function buildBlockedPreflightReceipt(
  projectId: string,
  readOnlyAdminRequestSent: boolean,
  rawSpendLimit?: unknown,
): PreflightResult {
  if (typeof projectId !== "string" || !PROJECT_ID.test(projectId)) throw new Error("GXEON16_INVALID_PROJECT_ID");
  const gate = evaluateProviderSpendLimit(rawSpendLimit);
  return {
    mission: "GXEON16_PROJECT_BILLING_PREFLIGHT",
    status: "BLOCKED_PENDING_OPERATOR_REVIEW",
    ...gate,
    projectIdFingerprint: fingerprint(projectId),
    readOnlyAdminRequestSent,
    realInferenceCalls: 0,
    paidModelBudgetAuthorizedUsd: 0.01,
    providerBillingVerified: false,
    currentMonthlySpendVerified: false,
    currentCreditsVerified: false,
    isolatedRuntimeVerified: false,
    independentReviewVerified: false,
    finalGoReceived: false,
    apiKeySafeToDisplay: false,
    readyForPaidInference: false,
    remainingGates: [
      "CURRENT_PROVIDER_USAGE_AND_FUNDS",
      "DEDICATED_RESTRICTED_API_KEY",
      "ISOLATED_ONE_SHOT_RUNTIME",
      "INDEPENDENT_SECURITY_REVIEW",
      "ACTUAL_SPEND_LIMIT_PROPAGATION_RISK",
      "USER_FINAL_GO_BEFORE_CHARGE",
    ],
  };
}

export type ReadOnlyAdminConfig = {
  projectId: string;
  adminKey: string;
  environment: "synthetic-only";
  enabled: boolean;
  explicitReadCheck: string;
};
export type ReadOnlyFetch = (url: string, init: RequestInit) => Promise<Response>;

/** Requests only one fixed-allowlisted GET. A failure does NOT imply no billing. */
export async function checkOpenAIProjectSpendLimit(
  config: ReadOnlyAdminConfig,
  fetchImpl: ReadOnlyFetch = fetch,
): Promise<PreflightResult> {
  if (!config || config.enabled !== true ||
    config.environment !== "synthetic-only" ||
    config.explicitReadCheck !== REQ_INTENT ||
    typeof config.projectId !== "string" || !PROJECT_ID.test(config.projectId) ||
    typeof config.adminKey !== "string" || !/^sk-[^\s]{16,}$/.test(config.adminKey)) {
    throw new Error("GXEON16_ADMIN_READ_NOT_AUTHORIZED");
  }
  const endpoint = "https://api.openai.com/v1/organization/projects/" +
    encodeURIComponent(config.projectId) + "/spend_limit";
  const response = await fetchImpl(endpoint, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(BILLING_PREFLIGHT_POLICY.timeoutMs),
    headers: {
      Authorization: "Bearer " + config.adminKey,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("GXEON16_ADMIN_READ_FAILED");
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > BILLING_PREFLIGHT_POLICY.maxResponseBytes) {
    throw new Error("GXEON16_ADMIN_RESPONSE_TOO_LARGE");
  }
  let data: unknown;
  try { data = JSON.parse(body); } catch { throw new Error("GXEON16_ADMIN_RESPONSE_INVALID"); }
  return buildBlockedPreflightReceipt(config.projectId, true, data);
}

export const GXEON16_READ_INTENT = REQ_INTENT;
