import type { CheckoutReadiness } from "./monetizationTypes";
import { getCheckoutReadiness as getRuntimeCheckoutReadiness, getMonetizationOffersResponse, getMonetizationRuntimeStatus } from "./monetizationRuntime";

export { getMonetizationOffersResponse, getMonetizationRuntimeStatus };
export { listOfferTemplates, monetizationSafetyBoundary } from "./offerTemplateRegistry";

export const offerTemplates = [
  { id: "landing_page", title: "Landing page conversion sprint", priceRange: { min: 600, max: 1800, currency: "BRL" as const }, deliveryWindow: "2-5 business days after operator approval" },
  { id: "deploy_fix", title: "Deploy or production fix", priceRange: { min: 400, max: 1500, currency: "BRL" as const }, deliveryWindow: "1-3 business days after scoped access is approved" },
  { id: "analytics_setup", title: "Analytics setup", priceRange: { min: 500, max: 1600, currency: "BRL" as const }, deliveryWindow: "2-4 business days after tracking plan approval" },
  { id: "checkout_setup", title: "Checkout setup readiness", priceRange: { min: 700, max: 2200, currency: "BRL" as const }, deliveryWindow: "3-6 business days after provider account is supplied by operator" },
  { id: "simple_dashboard", title: "Simple operational dashboard", priceRange: { min: 900, max: 2800, currency: "BRL" as const }, deliveryWindow: "4-8 business days after data shape approval" },
  { id: "automation_flow", title: "Manual-safe automation flow", priceRange: { min: 800, max: 2600, currency: "BRL" as const }, deliveryWindow: "3-7 business days after trigger and approval gates are defined" },
] as const;

export function listRegisteredOffers(): [] {
  return [];
}

export function getCheckoutReadiness(): CheckoutReadiness {
  return getRuntimeCheckoutReadiness();
}
