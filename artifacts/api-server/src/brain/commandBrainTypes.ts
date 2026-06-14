export type BrainMode = "PREVIEW_ONLY";
export type RevenueSprintStatus = "PLANNED" | "ACTIVE_MANUAL" | "WAITING_PAYMENT_MANUAL" | "SUBMISSION_PREPARED" | "BLOCKED" | "COMPLETED_UNVERIFIED" | "CANCELLED";
export type RevenueRouteType = "DIRECT_PIX_OFFER" | "WEB3_TASK_ATTEMPT" | "AGENT_ECONOMY_AUDIT" | "MANUAL_OTHER";
export type PreferredPayoutMethod = "MERCADO_PAGO_PIX_MANUAL" | "PIX_MANUAL" | "MERCADO_PAGO_MANUAL" | "MANUAL_OTHER";

export interface SafetyBoundaryFlags {
  mode: BrainMode;
  manualExecutionRequired: true;
  paymentProviderApiDisabled: true;
  externalContactAutomationDisabled: true;
  realRevenueNotGuaranteed: true;
  operatorApprovalRequired: true;
}

export interface MinimumRevenueSprintInput {
  targetAmountBrl?: number;
  deadlineLabel?: string;
  preferredPayoutMethod?: PreferredPayoutMethod;
  operatorNotes?: string;
  mercadoPagoManualLink?: string;
  pixKeyLabel?: string;
}

export interface RevenueOfferPack {
  id: string;
  routeType: RevenueRouteType;
  title: string;
  priceBrl: number;
  targetSales: number;
  deliveryWindow: string;
  deliverables: string[];
  readyToCopyMessage: string;
  manualExecutionNotes: string[];
}

export interface ManualPaymentInstruction {
  preferredPayoutMethod: PreferredPayoutMethod;
  mercadoPagoManualLinkProvided: boolean;
  pixKeyLabelProvided: boolean;
  instructionText: string;
  boundaries: string[];
}

export interface RevenueActionPlan {
  rank: number;
  routeType: RevenueRouteType;
  label: string;
  description: string;
  target: string;
  estimatedSpeed: string;
  manualSteps: string[];
  riskNotes: string[];
}

export interface LedgerPreviewPayload extends SafetyBoundaryFlags {
  targetAmountBrl: number;
  expectedGrossBrl: number;
  providerVerified: false;
  realRevenueClaimed: false;
  ledgerWriteDisabled: true;
  previewNote: string;
}

export interface MinimumRevenueSprintRecord extends SafetyBoundaryFlags {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: RevenueSprintStatus;
  targetAmountBrl: number;
  deadlineLabel: string;
  preferredPayoutMethod: PreferredPayoutMethod;
  operatorNotes: string;
  actionPlan: RevenueActionPlan[];
  offerPacks: RevenueOfferPack[];
  paymentInstruction: ManualPaymentInstruction;
  evidenceChecklist: string[];
  ledgerPreview: LedgerPreviewPayload;
  nextBestAction: string;
}

export interface RevenueSprintSummary extends SafetyBoundaryFlags {
  status: "COMMAND_BRAIN_REVENUE_SPRINT_P0_PREVIEW_READY";
  sprintCount: number;
  activeSprintCount: number;
  targetAmountBrl: number;
  fastestRoute: RevenueRouteType;
  boundaries: string[];
}

export const previewSafetyFlags: SafetyBoundaryFlags = {
  mode: "PREVIEW_ONLY",
  manualExecutionRequired: true,
  paymentProviderApiDisabled: true,
  externalContactAutomationDisabled: true,
  realRevenueNotGuaranteed: true,
  operatorApprovalRequired: true,
};
