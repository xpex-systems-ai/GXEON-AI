export const operatorAssistantSafety = {
  mode: "PREVIEW_ONLY", manualFirst: true, previewOnly: true, operatorApprovalRequired: true,
  externalContactDisabled: true, paymentProviderDisabled: true, githubWriteDisabled: true,
  realRevenueClaimed: false, rewardNotGuaranteed: true, autoSendDisabled: true, noScraping: true,
  checkoutDisabled: true, invoiceDisabled: true, webhookDisabled: true, walletActionDisabled: true,
} as const;
export type OperatorAssistantState = typeof operatorAssistantSafety & { safeFallbackUsed:boolean; currentOfficialStep:number; currentRoute:string; counts:{prospects:number;offers:number;manualPayments:number;closeLoops:number;ledgerPreviews:number;executionPacks:number;deliveryWorkspaces:number}; readiness:{hasHotProspect:boolean;hasOfferReady:boolean;hasPaymentRequestReady:boolean;hasCloseLoopActive:boolean;hasProofPending:boolean;hasLedgerPreview:boolean;hasConfirmedRevenue:boolean}; moduleFallbacks:Record<string,boolean> };
export type OperatorActionType = "OPEN_PROSPECT_PIPELINE"|"CREATE_CLIENT_OFFER_PREVIEW"|"CREATE_MANUAL_PAYMENT_PREVIEW"|"COPY_AND_SEND_MANUALLY_OUTSIDE_GXEON"|"MARK_WAITING_RESPONSE"|"VERIFY_PROOF_MANUALLY"|"CREATE_CLOSE_LOOP_CONFIRMATION"|"CREATE_LEDGER_PREVIEW";
export type OperatorAssistantNextAction = typeof operatorAssistantSafety & { actionId:string; actionType:OperatorActionType; route:string; title:string; operatorInstruction:string; riskLevel:"LOW"|"MEDIUM"|"HIGH"; estimatedValueBRL:number; safetyFlags:string[]; blockedActions:string[]; manualChecklist:string[]; copyOnlyMessage:string; nextRouteLabel:string };
export type OperatorAssistantPreview = typeof operatorAssistantSafety & { id:string; createdAt:string; requestedAction:string; summary:string; whyNext:string; risk:string; copyOnlyMessage:string; doNotDo:string[]; manualChecklist:string[]; nextInternalRoute:string; safetyFlags:string[] };
export type OperatorAssistantHandoff = typeof operatorAssistantSafety & { id:string; createdAt:string; targetRoute:string; reason:string; note:string; safetyFlags:string[] };
