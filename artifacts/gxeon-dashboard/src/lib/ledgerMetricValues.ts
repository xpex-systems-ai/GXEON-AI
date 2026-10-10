import type { LedgerSummary } from "../data/financial-ledger";
import type { LedgerStatusSummary } from "../services/ledgerService";

/**
 * Normalize only display metrics shared by an empty local ledger and the
 * provider-unverified P0 ledger service. Never equate an operator's approval
 * or a forecast with provider-verified settlement.
 */
type BaseLedgerMetricSummary = Pick<
  LedgerSummary,
  "estimated_revenue_brl" | "pending_revenue_brl" | "lost_revenue_brl"
> & Partial<
  Pick<LedgerStatusSummary, "operatorConfirmedRevenueBrl" | "providerVerifiedRevenueBrl">
>;

export function ledgerMetricValues(summary: BaseLedgerMetricSummary) {
  return {
    estimated_revenue_brl: summary.estimated_revenue_brl,
    operatorConfirmedRevenueBrl: summary.operatorConfirmedRevenueBrl ?? 0,
    pending_revenue_brl: summary.pending_revenue_brl,
    providerVerifiedRevenueBrl: summary.providerVerifiedRevenueBrl ?? 0,
    lost_revenue_brl: summary.lost_revenue_brl,
  };
}
