import { apiUrl } from "./apiBase";

export type PaidWorkProviderId = "basedagents" | "basebounty" | "project-room";
type JsonRecord = Record<string, unknown>;

export type PaidWorkProviderSnapshot = {
  id: PaidWorkProviderId;
  label: string;
  endpoint: string;
  reachable: boolean;
  openRecords: number;
  advertisedUsd: number;
  fundedRecords: number;
  claimReadyRecords: number;
  testRecords: number;
  note: string;
  error?: string;
};

export type PaidWorkRadarSnapshot = {
  generatedAt: string;
  mode: "READ_ONLY";
  providerReadsArePublicGetOnly: true;
  autoClaimDisabled: true;
  walletWritesDisabled: true;
  revenueRecognitionRequiresSettlement: true;
  githubDemandBackendReachable: boolean;
  providers: PaidWorkProviderSnapshot[];
};

const SOURCES: Array<{ id: PaidWorkProviderId; label: string; endpoint: string }> = [
  { id: "basedagents", label: "BasedAgents", endpoint: "https://api.basedagents.ai/v1/tasks?status=open" },
  { id: "basebounty", label: "BaseBounty", endpoint: "https://www.basebounty.app/api/v1/bounties?status=open" },
  { id: "project-room", label: "Project Room", endpoint: "https://room.trydemigod.com/api/project-offers" },
];

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

function asArray(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.filter((item): item is JsonRecord => !!item && typeof item === "object");
  const root = asRecord(payload);
  for (const key of ["tasks", "bounties", "offers", "items", "results", "data"]) {
    const value = root[key];
    if (Array.isArray(value)) return value.filter((item): item is JsonRecord => !!item && typeof item === "object");
    if (value && typeof value === "object") {
      const nested = asRecord(value);
      for (const nestedKey of ["tasks", "bounties", "offers", "items", "results"]) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) return nestedValue.filter((item): item is JsonRecord => !!item && typeof item === "object");
      }
    }
  }
  return [];
}

function firstString(record: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumber(record: JsonRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function recordText(record: JsonRecord): string {
  return [
    firstString(record, ["title", "name", "description", "summary"]),
    firstString(record, ["status", "state", "fundingStatus", "paymentStatus", "escrowStatus"]),
  ].join(" ").toLowerCase();
}

function rewardUsd(record: JsonRecord): number {
  const direct = firstNumber(record, [
    "rewardUsd", "reward_usd", "amountUsd", "amount_usd", "budgetUsd", "budget_usd",
    "reward", "amount", "budget", "price",
  ]);
  if (direct > 0) return direct;
  const text = recordText(record);
  const match = text.match(/(?:\$|usdc?\s*)(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}

function isTest(record: JsonRecord): boolean {
  const text = recordText(record);
  return /\btest\b|ignore|cancel(?:led|ation)?|sandbox|demo/.test(text);
}

function isOpen(record: JsonRecord): boolean {
  const status = firstString(record, ["status", "state", "taskStatus", "offerStatus"]).toLowerCase();
  return !/(closed|cancelled|canceled|completed|expired|rejected|settled)/.test(status);
}

function isFunded(record: JsonRecord): boolean {
  if (record["funded"] === true || record["escrowFunded"] === true || record["escrow_funded"] === true) return true;
  const status = firstString(record, ["fundingStatus", "funding_status", "escrowStatus", "escrow_status"]).toLowerCase();
  return /funded|escrowed|deposited|locked|secured|confirmed/.test(status) && !/not[_ -]?configured|unfunded|pending/.test(status);
}

function isPaymentReady(record: JsonRecord): boolean {
  if (record["paymentConfigured"] === true || record["paymentReady"] === true || record["payoutReady"] === true) return true;
  const status = firstString(record, ["paymentStatus", "payment_status", "payoutStatus", "payout_status"]).toLowerCase();
  return /configured|ready|funded|escrowed|active/.test(status) && !/not[_ -]?configured|disabled|missing|pending/.test(status);
}

async function readProvider(
  source: { id: PaidWorkProviderId; label: string; endpoint: string },
  signal?: AbortSignal,
): Promise<PaidWorkProviderSnapshot> {
  try {
    const response = await fetch(source.endpoint, { method: "GET", headers: { Accept: "application/json" }, signal });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const payload = await response.json() as unknown;
    const records = asArray(payload).filter(isOpen);
    const testRecords = records.filter(isTest).length;
    const fundedRecords = records.filter((record) => !isTest(record) && isFunded(record)).length;
    const claimReadyRecords = records.filter((record) =>
      !isTest(record) && rewardUsd(record) >= 100 && isFunded(record) && isPaymentReady(record)
    ).length;
    const advertisedUsd = records
      .filter((record) => !isTest(record))
      .reduce((sum, record) => sum + rewardUsd(record), 0);
    return {
      id: source.id,
      label: source.label,
      endpoint: source.endpoint,
      reachable: true,
      openRecords: records.length,
      advertisedUsd,
      fundedRecords,
      claimReadyRecords,
      testRecords,
      note: claimReadyRecords > 0
        ? "Candidate(s) passed conservative read-only funding/payment heuristics; operator verification still required before claim."
        : "No record passed all conservative claim-readiness gates in this browser read.",
    };
  } catch (error) {
    return {
      id: source.id,
      label: source.label,
      endpoint: source.endpoint,
      reachable: false,
      openRecords: 0,
      advertisedUsd: 0,
      fundedRecords: 0,
      claimReadyRecords: 0,
      testRecords: 0,
      note: "Public endpoint unavailable from this browser context. No economic conclusion inferred.",
      error: error instanceof Error ? error.message : "READ_FAILED",
    };
  }
}

export async function fetchPaidWorkRadar(signal?: AbortSignal): Promise<PaidWorkRadarSnapshot> {
  const providers = await Promise.all(SOURCES.map((source) => readProvider(source, signal)));
  let githubDemandBackendReachable = false;
  try {
    const response = await fetch(apiUrl("/api/github-demand/status"), {
      headers: { Accept: "application/json" },
      signal,
    });
    githubDemandBackendReachable = response.ok;
  } catch {
    githubDemandBackendReachable = false;
  }
  return {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY",
    providerReadsArePublicGetOnly: true,
    autoClaimDisabled: true,
    walletWritesDisabled: true,
    revenueRecognitionRequiresSettlement: true,
    githubDemandBackendReachable,
    providers,
  };
}
