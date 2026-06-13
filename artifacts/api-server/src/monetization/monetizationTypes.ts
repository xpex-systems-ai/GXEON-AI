export type MonetizationMode = "PREVIEW_ONLY";

export type PaymentProviderConnectionStatus = "NOT_CONNECTED";

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
  status: PaymentProviderConnectionStatus;
  nextStep: string;
};

export type CheckoutReadiness = MonetizationSafetyBoundary & {
  status: "NOT_CONNECTED";
  boundary: string;
  providers: PaymentProviderStatus[];
};

export type OfferTemplateId = "repo_audit_basic" | "deploy_rescue" | "supabase_rls_audit" | "agent_ops_setup";

export type OfferTemplate = MonetizationSafetyBoundary & {
  id: OfferTemplateId;
  title: string;
  category: string;
  priceRange: { min: number; max: number; currency: "USD" };
  deliveryWindow: string;
  evidenceRequirements: string[];
  manualApprovalRequired: true;
  status: "TEMPLATE_READY_NO_CLIENT";
  internalPreviewOnly: true;
  customerContactEnabled: false;
  paymentLink: null;
  checkoutUrl: null;
};

export type MonetizationRuntimeStatus = MonetizationSafetyBoundary & {
  status: "MONETIZATION_RUNTIME_READY";
  payments: "NOT_CONNECTED";
  offers: "TEMPLATE_READY_NO_CLIENTS";
  radar: "MANUAL_INTAKE_PREVIEW_READY";
  checkoutReadiness: CheckoutReadiness;
  counts: { offers: number; clients: 0; revenue: 0; ledgerPreviewEvents: number };
  opportunityPipeline: { new: number; review: number; qualified: number; proposalDrafted: number; taskReady: number; evidenceReady: number };
  firstRevenuePath: ["Opportunity", "Proposal", "Task", "Evidence", "Ledger Preview", "Manual Payment Review"];
  ledgerPreviewReadiness: {
    status: "LEDGER_P0_READY" | "LEDGER_P0_UNAVAILABLE";
    previewEvents: number;
    receivedRevenue: 0;
    realRevenueClaimed: false;
  };
};

export type MonetizationOffersResponse = MonetizationSafetyBoundary & {
  registeredOffers: [];
  templates: OfferTemplate[];
  checkoutReadiness: CheckoutReadiness;
};
