export type PaymentProviderStatus = {
  provider: "mercado_pago" | "stripe";
  label: string;
  status: "NOT_CONNECTED" | "CONNECTED_READONLY" | "READY_FOR_TEST";
  captureEnabled: false;
  checkoutSessionCreationEnabled: false;
  nextStep: string;
};

export type CheckoutReadiness = {
  status: "NOT_CONNECTED";
  captureEnabled: false;
  checkoutSessionCreationEnabled: false;
  boundary: string;
  providers: PaymentProviderStatus[];
};

export type OfferTemplate = {
  id: string;
  title: string;
  category: string;
  priceRange: { min: number; max: number; currency: "BRL" | "USD" };
  deliveryWindow: string;
  evidenceRequirements: string[];
  manualApprovalRequired: true;
  status: "TEMPLATE_READY_NO_CLIENT";
};

export type MonetizationRuntimeStatus = {
  status: "MONETIZATION_RUNTIME_READY";
  payments: "NOT_CONNECTED";
  offers: "TEMPLATE_READY_NO_CLIENTS";
  radar: "MANUAL_INTAKE_PREVIEW_READY";
  checkoutReadiness: CheckoutReadiness;
  counts: { offers: number; clients: number; revenue: number; ledgerPreviewEvents: number };
  opportunityPipeline?: { new: number; review: number; qualified: number; proposalDrafted: number; taskReady: number; evidenceReady: number };
  firstRevenuePath: string[];
};

export type MonetizationOffersResponse = {
  registeredOffers: unknown[];
  templates: OfferTemplate[];
  checkoutReadiness: CheckoutReadiness;
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

async function jsonGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { Accept: "application/json" }, signal });
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
