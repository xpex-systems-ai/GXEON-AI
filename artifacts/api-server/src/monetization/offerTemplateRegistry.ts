import type { MonetizationSafetyBoundary, OfferTemplate } from "./monetizationTypes";

export const monetizationSafetyBoundary: MonetizationSafetyBoundary = {
  mode: "PREVIEW_ONLY",
  paymentProvidersConnected: false,
  captureEnabled: false,
  checkoutSessionCreationEnabled: false,
  invoiceDisabled: true,
  realRevenueClaimed: false,
  approvalRequired: true,
};

export const offerTemplates: OfferTemplate[] = [
  {
    ...monetizationSafetyBoundary,
    id: "repo_audit_basic",
    title: "GitHub Repository Audit",
    category: "GitHub Ops",
    priceRange: { min: 49, max: 149, currency: "USD" },
    deliveryWindow: "24-48h",
    evidenceRequirements: ["Repository health report", "Risk summary", "Recommended fixes"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
    internalPreviewOnly: true,
    customerContactEnabled: false,
    paymentLink: null,
    checkoutUrl: null,
  },
  {
    ...monetizationSafetyBoundary,
    id: "deploy_rescue",
    title: "Vercel/Railway Deploy Rescue",
    category: "Deployment Ops",
    priceRange: { min: 99, max: 299, currency: "USD" },
    deliveryWindow: "24-72h",
    evidenceRequirements: ["Before/after deploy status", "Root-cause notes", "Rollback notes"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
    internalPreviewOnly: true,
    customerContactEnabled: false,
    paymentLink: null,
    checkoutUrl: null,
  },
  {
    ...monetizationSafetyBoundary,
    id: "supabase_rls_audit",
    title: "Supabase RLS Safety Audit",
    category: "Database Safety",
    priceRange: { min: 149, max: 499, currency: "USD" },
    deliveryWindow: "2-5 days",
    evidenceRequirements: ["RLS checklist", "Policy risk notes", "Manual fix plan"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
    internalPreviewOnly: true,
    customerContactEnabled: false,
    paymentLink: null,
    checkoutUrl: null,
  },
  {
    ...monetizationSafetyBoundary,
    id: "agent_ops_setup",
    title: "AI Ops Agent Workflow Setup",
    category: "AI Ops",
    priceRange: { min: 299, max: 1500, currency: "USD" },
    deliveryWindow: "3-10 days",
    evidenceRequirements: ["Workflow blueprint", "Operational dashboard", "Manual runbook"],
    manualApprovalRequired: true,
    status: "TEMPLATE_READY_NO_CLIENT",
    internalPreviewOnly: true,
    customerContactEnabled: false,
    paymentLink: null,
    checkoutUrl: null,
  },
];

export function listOfferTemplates(): OfferTemplate[] {
  return offerTemplates.map((template) => ({ ...template, priceRange: { ...template.priceRange }, evidenceRequirements: [...template.evidenceRequirements] }));
}
