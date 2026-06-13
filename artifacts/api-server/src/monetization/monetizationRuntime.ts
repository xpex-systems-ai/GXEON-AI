import { getLedgerStatusSummary } from "../ledger/ledgerStore";
import { getOpportunityPipelineCounts } from "../opportunities/opportunityInbox";
import { listOfferTemplates, monetizationSafetyBoundary } from "./offerTemplateRegistry";
import type { CheckoutReadiness, MonetizationOffersResponse, MonetizationRuntimeStatus, PaymentProviderStatus } from "./monetizationTypes";

function provider(provider: PaymentProviderStatus["provider"], label: string, nextStep: string): PaymentProviderStatus {
  return { ...monetizationSafetyBoundary, provider, label, status: "NOT_CONNECTED", nextStep };
}

export function getCheckoutReadiness(): CheckoutReadiness {
  return {
    ...monetizationSafetyBoundary,
    status: "NOT_CONNECTED",
    boundary: "PREVIEW_ONLY: payment providers are disconnected; checkout session creation, payment capture, invoices, receipts and customer contact are disabled.",
    providers: [
      provider("mercado_pago", "Mercado Pago", "Future stage only: connect backend credentials after explicit operator approval; no P0 provider calls."),
      provider("stripe", "Stripe", "Future stage only: connect backend credentials after explicit operator approval; no P0 provider calls."),
    ],
  };
}

export function getMonetizationRuntimeStatus(): MonetizationRuntimeStatus {
  const opportunityCounts = getOpportunityPipelineCounts();
  const ledgerSummary = getLedgerStatusSummary();
  const templates = listOfferTemplates();

  return {
    ...monetizationSafetyBoundary,
    status: "MONETIZATION_RUNTIME_READY",
    payments: "NOT_CONNECTED",
    offers: "TEMPLATE_READY_NO_CLIENTS",
    radar: "MANUAL_INTAKE_PREVIEW_READY",
    checkoutReadiness: getCheckoutReadiness(),
    counts: {
      offers: templates.length,
      clients: 0,
      revenue: 0,
      ledgerPreviewEvents: ledgerSummary.recordsInMemory,
    },
    opportunityPipeline: {
      new: opportunityCounts.new,
      review: opportunityCounts.review,
      qualified: opportunityCounts.qualified,
      proposalDrafted: opportunityCounts.proposalDrafted,
      taskReady: opportunityCounts.taskReady,
      evidenceReady: opportunityCounts.evidenceReady,
    },
    firstRevenuePath: ["Opportunity", "Proposal", "Task", "Evidence", "Ledger Preview", "Manual Payment Review"],
    ledgerPreviewReadiness: {
      status: ledgerSummary.status,
      previewEvents: ledgerSummary.recordsInMemory,
      receivedRevenue: 0,
      realRevenueClaimed: false,
    },
  };
}

export function getMonetizationOffersResponse(): MonetizationOffersResponse {
  return {
    ...monetizationSafetyBoundary,
    registeredOffers: [],
    templates: listOfferTemplates(),
    checkoutReadiness: getCheckoutReadiness(),
  };
}
