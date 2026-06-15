export const r100CollectionNames = [
  "manualProspects",
  "clientOfferSendPacks",
  "manualPaymentRequests",
  "revenueCloseLoops",
  "operatorConfirmedRevenue",
  "ledgerPreviews",
  "operatorWorkflowHandoffs",
] as const;

export type R100DurableCollectionName = (typeof r100CollectionNames)[number];
export type R100PersistenceMode = "SAFE_MEMORY_FALLBACK" | "SERVER_LOCAL_JSON";
export type R100SnapshotMode = "SAFE_REDACTED";

export type R100DurableStateStatus = {
  status: "R100_DURABLE_STATE_ADAPTER_P1_READY";
  mode: "MANUAL_FIRST";
  persistenceMode: R100PersistenceMode;
  healthy: boolean;
  fallbackUsed: boolean;
  collections: R100DurableCollectionName[];
  restoredCollections: R100DurableCollectionName[];
  lastLoadedAt: string | null;
  lastSavedAt: string | null;
  safety: R100DurableSafetyMetadata;
};

export type R100DurableSafetyMetadata = {
  manualFirst: true;
  previewOnly: true;
  noPaymentProviderApi: true;
  noAutoSend: true;
  noGithubWrite: true;
  providerVerifiedRevenueBrl: 0;
};

export type R100DurableAuditEvent = {
  id: string;
  at: string;
  type: string;
  collection?: R100DurableCollectionName;
  metadata?: Record<string, unknown>;
};

export type R100DurableSnapshot = {
  snapshotMode: R100SnapshotMode;
  collections: Record<R100DurableCollectionName, unknown[]>;
  safety: R100DurableSafetyMetadata & { redacted: true; noSecrets: true };
};

export const r100DurableSafety: R100DurableSafetyMetadata = {
  manualFirst: true,
  previewOnly: true,
  noPaymentProviderApi: true,
  noAutoSend: true,
  noGithubWrite: true,
  providerVerifiedRevenueBrl: 0,
};
