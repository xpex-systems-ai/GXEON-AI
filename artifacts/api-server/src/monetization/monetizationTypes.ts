export type MonetizationStatus =
  | "DRAFT"
  | "READY_TO_SELL"
  | "CHECKOUT_PENDING"
  | "PAYMENT_PENDING"
  | "PAID_CONFIRMED"
  | "DELIVERY_PENDING"
  | "LEDGER_READY";

export type PaymentProviderConnectionStatus = "NOT_CONNECTED" | "CONNECTED_READONLY" | "READY_FOR_TEST";

export type PaymentProviderStatus = {
  provider: "mercado_pago" | "stripe";
  label: string;
  status: PaymentProviderConnectionStatus;
  captureEnabled: false;
  checkoutSessionCreationEnabled: false;
  nextStep: string;
};

export type CheckoutReadiness = {
  status: "NOT_CONNECTED";
  captureEnabled: false;
  checkoutSessionCreationEnabled: false;
  providers: PaymentProviderStatus[];
  boundary: string;
};

export type OfferTemplateId =
  | "landing_page"
  | "deploy_fix"
  | "analytics_setup"
  | "checkout_setup"
  | "simple_dashboard"
  | "automation_flow";

export type OfferTemplate = {
  id: OfferTemplateId;
  title: string;
  category: string;
  priceRange: { min: number; max: number; currency: "BRL" | "USD" };
  deliveryWindow: string;
  evidenceRequirements: string[];
  manualApprovalRequired: true;
  status: "TEMPLATE_READY_NO_CLIENT";
};

export type Offer = {
  id: string;
  templateId: OfferTemplateId;
  status: MonetizationStatus;
  title: string;
  createdAt: string;
  approvedByOperatorAt: string | null;
};

export type Microtask = {
  id: string;
  offerId: string;
  status: MonetizationStatus;
  title: string;
  requiredEvidence: string[];
};

export type LedgerPreviewEvent = {
  id: string;
  status: "EMPTY_REAL_DATA" | "READY_FOR_CONFIRMED_PAYMENT";
  provider: PaymentProviderStatus["provider"] | null;
  amount: number | null;
  currency: "BRL" | "USD" | null;
  source: "confirmed_payment_webhook" | null;
  captureEnabled: false;
  note: string;
};

export type MonetizationRuntimeStatus = {
  status: "MONETIZATION_RUNTIME_READY";
  payments: "NOT_CONNECTED";
  offers: "TEMPLATE_READY_NO_CLIENTS";
  radar: "MANUAL_INTAKE_PREVIEW_READY";
  checkoutReadiness: CheckoutReadiness;
  counts: { offers: 0; clients: 0; revenue: 0; ledgerPreviewEvents: 0 };
  opportunityPipeline?: { new: number; review: number; qualified: number; proposalDrafted: number; taskReady: number; evidenceReady: number };
  firstRevenuePath: string[];
};
