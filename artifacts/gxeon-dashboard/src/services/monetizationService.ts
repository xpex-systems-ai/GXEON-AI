export type MonetizationMode = "PREVIEW_ONLY";

export type MonetizationSafetyBoundary = {
  mode: MonetizationMode;
  paymentProvidersConnected: false;
  captureEnabled: false;
  checkoutSessionCreationEnabled: false;
  invoiceDisabled: true;
  realRevenueClaimed: false;
  approvalRequired: true;
};

export type PaymentProviderStatus = MonetizationSafetyBoundary & {
  provider: "mercado_pago" | "stripe";
  label: string;
  status: "NOT_CONNECTED";
  nextStep: string;
};

export type CheckoutReadiness = MonetizationSafetyBoundary & {
  status: "NOT_CONNECTED";
  boundary: string;
  providers: PaymentProviderStatus[];
};

export type OfferTemplate = MonetizationSafetyBoundary & {
  id: string;
  title: string;
  category: string;
  priceRange: { min: number; max: number; currency: "BRL" | "USD" };
  deliveryWindow: string;
  evidenceRequirements: string[];
  manualApprovalRequired: true;
  status: "TEMPLATE_READY_NO_CLIENT";
  internalPreviewOnly?: true;
  customerContactEnabled?: false;
  paymentLink?: null;
  checkoutUrl?: null;
};

export type MonetizationRuntimeStatus = MonetizationSafetyBoundary & {
  status: "MONETIZATION_RUNTIME_READY";
  payments: "NOT_CONNECTED";
  offers: "TEMPLATE_READY_NO_CLIENTS";
  radar: "MANUAL_INTAKE_PREVIEW_READY";
  checkoutReadiness: CheckoutReadiness;
  counts: { offers: number; clients: number; revenue: number; ledgerPreviewEvents: number };
  opportunityPipeline?: { new: number; review: number; qualified: number; proposalDrafted: number; taskReady: number; evidenceReady: number };
  /** Optional because older P0 runtimes do not expose the execution preview summary. */
  githubDemandExecution?: {
    mode: "PREVIEW_ONLY";
    readyCount: number;
    topRouteForR100Sprint: { route: string } | null;
    manualRevenueSource: true;
    revenueReceived: false;
    providerVerified: false;
    githubWriteDisabled: true;
    externalContactDisabled: true;
    paymentProviderDisabled: true;
  };
  firstRevenuePath: string[];
  ledgerPreviewReadiness?: { status: "LEDGER_P0_READY" | "LEDGER_P0_UNAVAILABLE"; previewEvents: number; receivedRevenue: 0; realRevenueClaimed: false };
};

export type MonetizationOffersResponse = MonetizationSafetyBoundary & {
  registeredOffers: unknown[];
  templates: OfferTemplate[];
  checkoutReadiness: CheckoutReadiness;
};

import { apiUrl } from "./apiBase";


async function jsonGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { Accept: "application/json" }, signal });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`MONETIZATION_RUNTIME_NON_JSON_RESPONSE_${response.status}`);
  }
  const payload = (await response.json()) as { success: boolean; data: T; error?: string };
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `REQUEST_FAILED_${response.status}`);
  }
  return payload.data;
}

export function fetchMonetizationStatus(signal?: AbortSignal) {
  return jsonGet<MonetizationRuntimeStatus>("/api/monetization/status", signal);
}

export function fetchMonetizationOffers(signal?: AbortSignal) {
  return jsonGet<MonetizationOffersResponse>("/api/monetization/offers", signal);
}
