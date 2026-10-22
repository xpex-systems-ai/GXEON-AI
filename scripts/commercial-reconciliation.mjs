/**
 * GXEON × OMNIX — read-only commercial reconciliation core.
 * No provider access, checkout, signing, external contact or persistence.
 * All amounts are integer minor units and currency-specific.
 */
export const REVENUE_STATES = Object.freeze([
  "DISCOVERED", "VERIFIED", "QUALIFIED", "PROPOSED",
  "ACCEPTED", "DELIVERED", "INVOICED", "SETTLED_VERIFIED",
]);

export function classifyPayment(input) {
  if (!input || typeof input !== "object") return { verified: false, reason: "INVALID_INPUT" };
  const { invoice, event } = input;
  if (!invoice || !event) return { verified: false, reason: "MISSING_EVIDENCE" };
  if (invoice.isSample || event.isSample) return { verified: false, reason: "SAMPLE_DATA" };
  if (!invoice.id || !event.providerEventId || !event.provider || !event.externalEvidenceUrl)
    return { verified: false, reason: "UNTRACEABLE_EVENT" };
  if (invoice.status !== "ISSUED" || event.status !== "SETTLED" || event.providerVerified !== true)
    return { verified: false, reason: "NOT_EXTERNALLY_SETTLED" };
  if (invoice.id !== event.invoiceId) return { verified: false, reason: "INVOICE_MISMATCH" };
  if (typeof invoice.currency !== "string" || invoice.currency !== event.currency)
    return { verified: false, reason: "CURRENCY_MISMATCH" };
  if (!Number.isSafeInteger(invoice.amountMinor) || invoice.amountMinor <= 0 ||
      !Number.isSafeInteger(event.amountMinor) || event.amountMinor <= 0 ||
      invoice.amountMinor !== event.amountMinor)
    return { verified: false, reason: "AMOUNT_MISMATCH" };
  return {
    verified: true, reason: "SETTLED_VERIFIED",
    reconciliationKey: `${event.provider}:${event.providerEventId}`,
    invoiceId: invoice.id, currency: invoice.currency,
    amountMinor: invoice.amountMinor,
  };
}

export function reconcilePayments(entries) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const seen = new Set();
  const accepted = [];
  const rejected = [];
  for (const entry of entries) {
    const result = classifyPayment(entry);
    if (!result.verified) { rejected.push(result); continue; }
    if (seen.has(result.reconciliationKey)) {
      rejected.push({ verified: false, reason: "DUPLICATE_PROVIDER_EVENT" });
      continue;
    }
    seen.add(result.reconciliationKey);
    accepted.push(result);
  }
  return { accepted, rejected };
}
