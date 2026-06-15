import type { R100PersistenceMode } from "./r100DurableStateTypes";

export type R100DurabilityLevel = "MEMORY_ONLY" | "SERVER_LOCAL_JSON" | "UNHEALTHY_FALLBACK";
export type R100OperatorTrustLevel = "LOW" | "MEDIUM" | "HIGH";

export type R100DurableCollectionCounts = {
  manualProspects: number;
  clientOfferSendPacks: number;
  manualPaymentRequests: number;
  revenueCloseLoops: number;
  operatorConfirmedRevenue: number;
  ledgerPreviews: number;
  operatorWorkflowHandoffs: number;
  durabilityProbes: number;
};

export type R100DurableVerificationSafety = {
  manualFirst: true;
  previewOnly: true;
  noPaymentProviderApi: true;
  noAutoSend: true;
  noGithubWrite: true;
  noExternalContact: true;
  noScraping: true;
  providerVerifiedRevenueBrl: 0;
  realRevenueClaimedAutomatically: false;
};

export type R100DurableVerificationSummary = {
  status: "R100_DURABLE_STATE_VERIFICATION_P1_READY";
  mode: "MANUAL_FIRST";
  persistenceMode: R100PersistenceMode;
  healthy: boolean;
  fallbackUsed: boolean;
  durabilityLevel: R100DurabilityLevel;
  operatorTrustLevel: R100OperatorTrustLevel;
  safeToProceed: boolean;
  needsDatabaseBeforeScale: boolean;
  lastLoadedAt: string | null;
  lastSavedAt: string | null;
  collectionCounts: R100DurableCollectionCounts;
  restoredCollections: string[];
  warnings: string[];
  nextManualAction: string;
  safety: R100DurableVerificationSafety;
};

export type R100DurabilityProbeRecord = R100DurableVerificationSafety & {
  id: string;
  source: "R100_DURABILITY_PROBE_P1";
  createdAt: string;
  nonce: string;
  syntheticOnly: true;
  businessRecordCreated: false;
  amountBrl: 0;
  providerVerifiedRevenueBrl: 0;
};

export type R100DurabilityProbeResult = {
  status: "R100_DURABILITY_PROBE_ROUNDTRIP_OK" | "R100_DURABILITY_PROBE_ROUNDTRIP_FAILED";
  mode: "MANUAL_FIRST";
  probeId: string;
  persistenceMode: R100PersistenceMode;
  saved: boolean;
  reloaded: boolean;
  roundtripOk: boolean;
  durabilityProbeCount: number;
  createdBusinessRecords: false;
  safety: R100DurableVerificationSafety;
};
