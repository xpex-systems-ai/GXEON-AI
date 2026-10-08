/**
 * Read-only x402 Bazaar opportunity normalizer for GXEON.
 * A catalog item is a seller listing, NEVER an assigned or funded job.
 * No payments, signing, or remote calls.
 */
export type Opportunity = {
  id: string; endpoint: string; category: "SELLER_API";
  status: "CAPABILITY_GAP" | "GXEON_COMPATIBLE";
  priceUsdc: string | null; network: string | null;
  fundedJobVerified: false; capabilityMatch: boolean;
  calls30d: number | null; payers30d: number | null;
};
const BASE_USDC = "0x833589fcD6edb6e08f4c7c32d4f71b54bdA02913".toLowerCase();
function nonnegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function normalizeBazaarItem(input: Record<string, unknown>, capabilities: string[] = []): Opportunity {
  const endpoint = String(input.resource ?? "");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid resource protocol");
  const accepts = Array.isArray(input.accepts) ? input.accepts : [];
  const payment = accepts.find((p: any) => p?.network === "eip155:8453" && String(p.asset ?? "").toLowerCase() === BASE_USDC);
  const amount = payment?.amount ?? payment?.maxAmountRequired;
  const priceUsdc = typeof amount === "string" && /^\d+$/.test(amount)
    ? (Number(amount) / 1_000_000).toFixed(6) : null;
  const tags = Array.isArray(input.tags) ? input.tags.filter((x): x is string => typeof x === "string") : [];
  const capabilityMatch = tags.some(t => capabilities.some(c => c.toLowerCase() === t.toLowerCase()));
  const q = input.quality && typeof input.quality === "object" ? input.quality as Record<string, unknown> : {};
  return {
    id: endpoint, endpoint, category: "SELLER_API",
    status: capabilityMatch ? "GXEON_COMPATIBLE" : "CAPABILITY_GAP",
    priceUsdc, network: payment ? "eip155:8453" : null,
    fundedJobVerified: false, capabilityMatch,
    calls30d: nonnegativeInt(q.l30DaysTotalCalls ?? q.calls30d),
    payers30d: nonnegativeInt(q.l30DaysUniquePayers ?? q.uniquePayers30d)
  };
}
