import { getOpportunityPipelineCounts } from "../opportunities/opportunityInbox";
import type { CheckoutReadiness, LedgerPreviewEvent, MonetizationRuntimeStatus, Offer, OfferTemplate } from "./monetizationTypes";

export const offerTemplates: OfferTemplate[] = [
  {
    id: "landing_page",
    title: "Landing page conversion sprint",
    category: "microtask_web",
    priceRange: { min: 600, max: 1800, currency: "BRL" },
    deliveryWindow: "2-5 business days after operator approval",
    evidenceRequirements: ["approved brief", "published URL", "before/after screenshots", "handoff notes"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
  {
    id: "deploy_fix",
    title: "Deploy or production fix",
    category: "microtask_devops",
    priceRange: { min: 400, max: 1500, currency: "BRL" },
    deliveryWindow: "1-3 business days after scoped access is approved",
    evidenceRequirements: ["error evidence", "change summary", "deployment URL", "rollback note"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
  {
    id: "analytics_setup",
    title: "Analytics setup",
    category: "microtask_growth",
    priceRange: { min: 500, max: 1600, currency: "BRL" },
    deliveryWindow: "2-4 business days after tracking plan approval",
    evidenceRequirements: ["tracking plan", "event list", "validation screenshots", "dashboard link"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
  {
    id: "checkout_setup",
    title: "Checkout setup readiness",
    category: "microtask_payments",
    priceRange: { min: 700, max: 2200, currency: "BRL" },
    deliveryWindow: "3-6 business days after provider account is supplied by operator",
    evidenceRequirements: ["provider readiness checklist", "test-mode proof", "webhook plan", "no-capture confirmation"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
  {
    id: "simple_dashboard",
    title: "Simple operational dashboard",
    category: "microtask_dashboard",
    priceRange: { min: 900, max: 2800, currency: "BRL" },
    deliveryWindow: "4-8 business days after data shape approval",
    evidenceRequirements: ["data contract", "screen recording", "deployment URL", "operator acceptance note"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
  {
    id: "automation_flow",
    title: "Manual-safe automation flow",
    category: "microtask_automation",
    priceRange: { min: 800, max: 2600, currency: "BRL" },
    deliveryWindow: "3-7 business days after trigger and approval gates are defined",
    evidenceRequirements: ["flow diagram", "approval checkpoint", "test run evidence", "kill-switch note"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
  },
];

const registeredOffers: Offer[] = [];
const ledgerPreviewEvents: LedgerPreviewEvent[] = [];

export function listOfferTemplates(): OfferTemplate[] {
  return offerTemplates;
}

export function listRegisteredOffers(): Offer[] {
  return registeredOffers;
}

export function getCheckoutReadiness(): CheckoutReadiness {
  return {
    status: "NOT_CONNECTED",
    captureEnabled: false,
    checkoutSessionCreationEnabled: false,
    boundary: "P0 exposes readiness only. It does not create checkout sessions or capture payments.",
    providers: [
      {
        provider: "mercado_pago",
        label: "Mercado Pago",
        status: "NOT_CONNECTED",
        captureEnabled: false,
        checkoutSessionCreationEnabled: false,
        nextStep: "Add backend-only access token and webhook secret after operator approval.",
      },
      {
        provider: "stripe",
        label: "Stripe",
        status: "NOT_CONNECTED",
        captureEnabled: false,
        checkoutSessionCreationEnabled: false,
        nextStep: "Add backend-only secret key and webhook secret after operator approval.",
      },
    ],
  };
}

export function listLedgerPreviewEvents(): LedgerPreviewEvent[] {
  return ledgerPreviewEvents;
}

export function getMonetizationRuntimeStatus(): MonetizationRuntimeStatus {
  const opportunityCounts = getOpportunityPipelineCounts();
  return {
    status: "MONETIZATION_RUNTIME_READY",
    payments: "NOT_CONNECTED",
    offers: "TEMPLATE_READY_NO_CLIENTS",
    radar: "MANUAL_INTAKE_PREVIEW_READY",
    checkoutReadiness: getCheckoutReadiness(),
    counts: { offers: 0, clients: 0, revenue: 0, ledgerPreviewEvents: 0 },
    opportunityPipeline: {
      new: opportunityCounts.new,
      review: opportunityCounts.review,
      qualified: opportunityCounts.qualified,
      proposalDrafted: opportunityCounts.proposalDrafted,
      taskReady: opportunityCounts.taskReady,
      evidenceReady: opportunityCounts.evidenceReady,
    },
    firstRevenuePath: ["Opportunity", "Proposal", "Task", "Evidence", "Payment Pending"],
  };
}
