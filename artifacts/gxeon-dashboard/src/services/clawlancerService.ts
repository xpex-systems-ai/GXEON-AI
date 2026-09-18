import { apiUrl } from "./apiBase";

export type ClawlancerOpportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  currency: string;
  rewardUsdc: number;
  createdAt: string | null;
  isActive: boolean;
  status: string;
  poster: {
    id: string | null;
    name: string;
    reputationTier: string | null;
    transactionCount: number | null;
    walletAddress: string | null;
  };
  buyerReputation: {
    paymentRate: number | null;
    released: number | null;
    disputes: number | null;
    tier: string | null;
  };
  gxeonWelcomeTarget: boolean;
  fitScore: number;
  source: "CLAWLANCER";
};

export type ClawlancerTransaction = {
  id: string;
  listingId: string | null;
  state: string;
  amountUsdc: number | null;
  currency: string | null;
  txHash: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  payoutVerified: boolean;
};

export type ClawlancerSnapshot = {
  generatedAt: string;
  provider: "CLAWLANCER";
  chain: "Base";
  settlementAsset: "USDC";
  mode: "LIVE" | "LIVE_PUBLIC_READONLY";
  configuration: {
    baseUrl: string;
    apiKeyConfigured: boolean;
    agentIdConfigured: boolean;
    agentId: string;
    authenticatedOperationsReady: boolean;
    secretExposure: false;
  };
  agent: {
    id: string;
    name: string;
    walletAddress: string | null;
    active: boolean;
    paused: boolean;
    reputationTier: string | null;
    transactionCount: number | null;
    totalEarnedUsdc: number;
    bio: string | null;
  };
  authenticatedReadError: string | null;
  target: ClawlancerOpportunity | null;
  opportunities: ClawlancerOpportunity[];
  transactions: ClawlancerTransaction[];
  wallet: null | {
    walletAddress: string | null;
    usdcBalanceWei: string | null;
    usdcBalance: number;
    usdcFormatted: string | null;
    ethBalanceWei: string | null;
  };
  revenue: {
    verifiedUsdc: number;
    verifiedCount: number;
    rule: string;
  };
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || payload.error || "CLAWLANCER_REQUEST_FAILED");
  }
  return payload.data as T;
}

export const fetchClawlancerSnapshot = (signal?: AbortSignal) =>
  json<ClawlancerSnapshot>("/api/clawlancer/snapshot", { signal });

export const claimClawlancerListing = (listingId: string) =>
  json<{ listingId: string; result: Record<string, unknown> }>(
    `/api/clawlancer/listings/${encodeURIComponent(listingId)}/claim`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GXEON-Operator-Approval": "approved",
      },
      body: JSON.stringify({ confirm: true }),
    },
  );

export const deliverClawlancerWork = (transactionId: string, deliverable: string) =>
  json<{ transactionId: string; result: Record<string, unknown> }>(
    `/api/clawlancer/transactions/${encodeURIComponent(transactionId)}/deliver`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GXEON-Operator-Approval": "approved",
      },
      body: JSON.stringify({ confirm: true, deliverable }),
    },
  );
