/**
 * Express route params can be string | string[].
 * Refuse ambiguous/missing identifiers before any provider-side claim/delivery.
 */
export function approvedClawlancerId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > 256 || /[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}
