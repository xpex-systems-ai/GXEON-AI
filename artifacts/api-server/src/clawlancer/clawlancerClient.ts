const DEFAULT_BASE_URL = "https://clawlancer.ai/api";

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

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function usdcFromWei(value: unknown): number {
  const parsed = asNumber(value);
  return parsed === null ? 0 : parsed / 1_000_000;
}

function getConfig() {
  return {
    baseUrl: (process.env.CLAWLANCER_API_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey: process.env.CLAWLANCER_API_KEY || "",
    agentId: process.env.CLAWLANCER_AGENT_ID || "",
  };
}

export function getClawlancerConfiguration() {
  const { baseUrl, apiKey, agentId } = getConfig();
  return {
    baseUrl,
    apiKeyConfigured: apiKey.length > 0,
    agentIdConfigured: agentId.length > 0,
    authenticatedOperationsReady: apiKey.length > 0 && agentId.length > 0,
    secretExposure: false,
  };
}

async function requestJson(
  path: string,
  options: { method?: string; body?: unknown; authenticated?: boolean } = {},
): Promise<unknown> {
  const { baseUrl, apiKey } = getConfig();
  if (options.authenticated && !apiKey) {
    throw new Error("CLAWLANCER_API_KEY_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.authenticated ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      const object = asObject(payload);
      const message = asString(object.message) || asString(object.error) || `CLAWLANCER_HTTP_${response.status}`;
      throw new Error(message);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOpportunity(rawValue: unknown): ClawlancerOpportunity {
  const raw = asObject(rawValue);
  const agent = asObject(raw.agent);
  const reputation = asObject(raw.buyer_reputation);
  const title = asString(raw.title, "Untitled bounty");
  const priceUsdc = asNumber(raw.price_usdc);
  const rewardUsdc = priceUsdc === null ? usdcFromWei(raw.price_wei) : priceUsdc;
  const reputationTier = asNullableString(agent.reputation_tier);
  const paymentRate = asNumber(reputation.payment_rate);
  const isGxeonWelcome = title.toLowerCase().includes("introduce yourself, gxeon");

  let fitScore = 45;
  if (["coding", "research", "analysis", "writing", "data"].includes(asString(raw.category).toLowerCase())) fitScore += 15;
  if (reputationTier === "TRUSTED") fitScore += 15;
  if (paymentRate !== null && paymentRate >= 95) fitScore += 10;
  if (rewardUsdc > 0) fitScore += 5;
  if (isGxeonWelcome) fitScore += 10;

  return {
    id: asString(raw.id),
    title,
    description: asString(raw.description),
    category: asString(raw.category, "other"),
    currency: asString(raw.currency, "USDC"),
    rewardUsdc,
    createdAt: asNullableString(raw.created_at),
    isActive: raw.is_active !== false,
    status: asString(raw.status, "unknown"),
    poster: {
      id: asNullableString(agent.id),
      name: asString(agent.name, "Unknown"),
      reputationTier,
      transactionCount: asNumber(agent.transaction_count),
      walletAddress: asNullableString(agent.wallet_address),
    },
    buyerReputation: {
      paymentRate,
      released: asNumber(reputation.released),
      disputes: asNumber(reputation.dispute_count),
      tier: asNullableString(reputation.tier),
    },
    gxeonWelcomeTarget: isGxeonWelcome,
    fitScore: Math.min(100, fitScore),
    source: "CLAWLANCER",
  };
}

function normalizeTransaction(rawValue: unknown): ClawlancerTransaction {
  const raw = asObject(rawValue);
  const state = asString(raw.state || raw.status, "UNKNOWN").toUpperCase();
  const amountWei = raw.amount_wei ?? raw.price_wei ?? raw.amount;
  const txHash =
    asNullableString(raw.tx_hash) ||
    asNullableString(raw.transaction_hash) ||
    asNullableString(raw.release_tx_hash) ||
    asNullableString(raw.payment_tx_hash);
  const terminalPaid = ["RELEASED", "PAID", "COMPLETED", "SETTLED"].includes(state);

  return {
    id: asString(raw.id || raw.transaction_id),
    listingId: asNullableString(raw.listing_id),
    state,
    amountUsdc: amountWei === undefined ? null : usdcFromWei(amountWei),
    currency: asNullableString(raw.currency),
    txHash,
    createdAt: asNullableString(raw.created_at),
    updatedAt: asNullableString(raw.updated_at),
    payoutVerified: terminalPaid && Boolean(txHash),
  };
}

export async function getClawlancerPlatformInfo() {
  return asObject(await requestJson("/info"));
}

export async function listClawlancerBounties(): Promise<ClawlancerOpportunity[]> {
  const payload = asObject(await requestJson("/listings?listing_type=BOUNTY"));
  const listings = Array.isArray(payload.listings) ? payload.listings : [];
  return listings.map(normalizeOpportunity).filter((item) => item.id && item.isActive);
}

export async function listClawlancerTransactions(): Promise<ClawlancerTransaction[]> {
  const { agentId } = getConfig();
  if (!agentId) throw new Error("CLAWLANCER_AGENT_ID_NOT_CONFIGURED");
  const payload = await requestJson(`/transactions?agent_id=${encodeURIComponent(agentId)}`, { authenticated: true });
  const object = asObject(payload);
  const values = Array.isArray(payload)
    ? payload
    : Array.isArray(object.transactions)
      ? object.transactions
      : Array.isArray(object.data)
        ? object.data
        : [];
  return values.map(normalizeTransaction);
}

export async function getClawlancerWalletBalance() {
  const { agentId } = getConfig();
  if (!agentId) throw new Error("CLAWLANCER_AGENT_ID_NOT_CONFIGURED");
  const payload = asObject(
    await requestJson(`/wallet/balance?agent_id=${encodeURIComponent(agentId)}`, { authenticated: true }),
  );
  return {
    walletAddress: asNullableString(payload.wallet_address),
    usdcBalanceWei: asNullableString(payload.usdc_balance),
    usdcBalance: usdcFromWei(payload.usdc_balance),
    usdcFormatted: asNullableString(payload.usdc_balance_formatted),
    ethBalanceWei: asNullableString(payload.eth_balance),
  };
}

export async function claimClawlancerBounty(listingId: string) {
  const { agentId } = getConfig();
  if (!agentId) throw new Error("CLAWLANCER_AGENT_ID_NOT_CONFIGURED");
  return asObject(
    await requestJson(`/listings/${encodeURIComponent(listingId)}/claim`, {
      method: "POST",
      authenticated: true,
      body: { agent_id: agentId },
    }),
  );
}

export async function deliverClawlancerTransaction(transactionId: string, deliverable: string) {
  if (!deliverable.trim()) throw new Error("DELIVERABLE_REQUIRED");
  return asObject(
    await requestJson(`/transactions/${encodeURIComponent(transactionId)}/deliver`, {
      method: "POST",
      authenticated: true,
      body: { deliverable: deliverable.trim() },
    }),
  );
}
