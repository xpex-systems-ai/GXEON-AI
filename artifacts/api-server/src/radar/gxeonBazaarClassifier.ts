/** GXEON — Bazaar seller catalog classification (no paid API invocation).
 *
 * CDP Bazaar entries advertise APIs for sale. Even real historical payers are
 * NOT buyer demand, funded bounties, orders, completed jobs or GXEON revenue.
 * Safe for both server and browser; no network calls or wallet effects.
 */
export const X402_BASE_NETWORK = "eip155:8453";
export const X402_BASE_USDC = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913";
export const MAX_BAZAAR_PREVIEW_ITEMS = 25;

export type BazaarSellerCandidate = {
  resource: string;
  title: string;
  category: "SELLER_API";
  status: "GXEON_COMPATIBLE_TAG_SIGNAL" | "CAPABILITY_GAP";
  priceUsdc: string | null;
  network: "eip155:8453" | null;
  historicCalls30d: number | null;
  historicPayers30d: number | null;
  tags: string[];
  capabilityMatch: boolean;
  fundedJobVerified: false;
  gxRevenueVerified: false;
  eligibleToClaim: false;
  evidenceStatus: "SOURCE_UNVERIFIED";
  reason: string;
};

function map(v: unknown): Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown> : {};
}
function count(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
}
function atomicUsdc(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  if (!/^\d{1,30}$/.test(raw)) return null;
  const n = BigInt(raw);
  const integer = n / 1_000_000n;
  const fraction = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer.toString();
}
export function normalizeBazaarSeller(value: unknown, capabilities: readonly string[] = []): BazaarSellerCandidate {
  const raw = map(value);
  if (typeof raw.resource !== "string" || raw.resource.length > 2048) throw new Error("BAZAAR_RESOURCE_URL_INVALID");
  let url: URL;
  try { url = new URL(raw.resource); }
  catch { throw new Error("BAZAAR_RESOURCE_URL_INVALID"); }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error("BAZAAR_RESOURCE_URL_INVALID");
  }
  const accepts = Array.isArray(raw.accepts) ? raw.accepts.slice(0, 16).map(map) : [];
  const acceptedBase = accepts.find(p => p.network === X402_BASE_NETWORK
    && typeof p.asset === "string" && p.asset.toLowerCase() === X402_BASE_USDC.toLowerCase());
  const quality = map(raw.quality);
  const tags = (Array.isArray(raw.tags) ? raw.tags : [])
    .filter((s): s is string => typeof s === "string").slice(0, 20)
    .map(s => s.toLowerCase().slice(0, 64));
  const capabilitySet = new Set(capabilities.map(s => s.toLowerCase()));
  const capabilityMatch = tags.some(s => capabilitySet.has(s));
  const price = acceptedBase ? atomicUsdc(acceptedBase.amount ?? acceptedBase.maxAmountRequired) : null;
  return {
    resource: raw.resource, title: String(raw.serviceName || raw.description || url.hostname).slice(0, 150),
    category: "SELLER_API", status: capabilityMatch ? "GXEON_COMPATIBLE_TAG_SIGNAL" : "CAPABILITY_GAP",
    priceUsdc: price,
    network: acceptedBase ? X402_BASE_NETWORK : null,
    historicCalls30d: count(quality.l30DaysTotalCalls ?? quality.calls30d),
    historicPayers30d: count(quality.l30DaysUniquePayers ?? quality.uniquePayers30d),
    tags, capabilityMatch, fundedJobVerified: false, gxRevenueVerified: false,
    eligibleToClaim: false, evidenceStatus: "SOURCE_UNVERIFIED",
    reason: "Seller API discovery record only; not a request to GXEON or independently verified USDC revenue.",
  };
}

export function classifyBazaarPreview(payload: unknown, capabilities: readonly string[] = []) {
  const input = map(payload);
  const items = input.items ?? input.resources;
  if (!Array.isArray(items)) throw new Error("BAZAAR_ARRAY_REQUIRED");
  if (items.length > MAX_BAZAAR_PREVIEW_ITEMS) throw new Error("BAZAAR_PREVIEW_TOO_LARGE");
  const normalized = items.map((x, i) => {
    try { return normalizeBazaarSeller(x, capabilities); }
    catch { throw new Error(`BAZAAR_INVALID_ITEM_${i}`); }
  });
  return {
    mode: "READ_ONLY_PREVIEW" as const,
    catalogSourceVerified: false as const,
    count: normalized.length,
    matchedTagSignals: normalized.filter(x => x.capabilityMatch).length,
    buyerDemandsVerified: 0 as const, fundedBountiesVerified: 0 as const,
    paymentConfirmed: false as const, revenueUsdc: null,
    items: normalized,
  };
}
