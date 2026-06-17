export type AuditOsSafetyFlags = {
  manualFirst: true;
  previewOnly: true;
  noAutoSend: true;
  noExternalContact: true;
  noScraping: true;
  noPaymentApi: true;
  noCheckout: true;
  noInvoice: true;
  noGithubWrite: true;
  noProviderVerifiedRevenue: true;
  noSecretFrontend: true;
  noDatabaseWriteRequiredForP0: true;
  operatorApprovalRequired: true;
  safeCopyOnlyOutputs: true;
};

export type AuditCategory = { id: string; label: string; pain: string; deliverable: string; safeInputs: string[] };
export type AuditOsMonetizationTier = { tier: string; name: string; promise: string; deliveryMode: string; safetyNote: string };
export type AuditOsPreviewRequest = { categoryId?: string; targetLabel?: string; pain?: string; operatorConfirmedContext?: boolean };
export type AuditOsOfferPreview = {
  mode: "P0_SAFE_PREVIEW_ONLY";
  product: "GXEON Audit OS";
  category: AuditCategory;
  targetLabel: string;
  pain: string;
  diagnosticFrame: string[];
  dashboardSections: string[];
  suggestedOffer: AuditOsMonetizationTier;
  copyOnlyOffer: string;
  nextManualAction: string;
  safetyFlags: AuditOsSafetyFlags;
  externalExecution: "DISABLED";
  persistence: "LOCAL_IN_MEMORY_RESPONSE_ONLY";
};
