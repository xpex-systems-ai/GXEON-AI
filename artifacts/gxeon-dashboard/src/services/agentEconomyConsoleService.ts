import { apiUrl } from "./apiBase";

export type ConsoleStatus = {
  status: string;
  mode: "LIVE_READ_ONLY" | "LIVE_AUTHENTICATED";
  agentId: string;
  publicReadEnabled: boolean;
  authenticatedReadEnabled: boolean;
  claimEnabled: boolean;
  deliveryEnabled: boolean;
  withdrawalEnabled: false;
  privateKeysAccepted: false;
  revenueVerificationRule: string;
};

export type ConsoleOpportunity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  rewardUsdc: number;
  currency: string;
  active: boolean;
  status: string;
  createdAt: string | null;
  poster: null | { id: string | null; name: string | null; wallet: string | null; reputationTier: string | null; transactionCount: number | null };
  buyerReputation: unknown;
};

export type ConsoleSnapshot = {
  generatedAt: string;
  mode: "LIVE_READ_ONLY" | "LIVE_AUTHENTICATED";
  agent: {
    id: string;
    name: string;
    wallet_address?: string | null;
    total_earned_wei?: string | number | null;
    transaction_count?: number | null;
    reputation_tier?: string | null;
    reputation_score?: number | null;
    bio?: string | null;
  };
  opportunities: ConsoleOpportunity[];
  welcome: ConsoleOpportunity | null;
  transactions: unknown;
  balance: unknown;
  authenticatedError: string | null;
  verifiedRevenueUsdc: number;
  verifiedRevenueEvidence: unknown;
};

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { Accept: "application/json" }, signal });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || "AGENT_ECONOMY_CONSOLE_REQUEST_FAILED");
  return payload.data as T;
}

export const fetchAgentEconomyConsoleStatus = (signal?: AbortSignal) => get<ConsoleStatus>("/api/clawlancer/status", signal);
export const fetchAgentEconomyConsoleSnapshot = (signal?: AbortSignal) => get<ConsoleSnapshot>("/api/clawlancer/snapshot", signal);
