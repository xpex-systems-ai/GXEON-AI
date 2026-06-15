import type { R100DurableCollectionName, R100DurableSafetyMetadata } from "./r100DurableStateTypes";

export type R100DatabaseMirrorStatusCode = "R100_DB_MIRROR_P2_READY" | "R100_DB_MIRROR_DISABLED" | "R100_DB_NOT_CONFIGURED" | "R100_DB_MIRROR_UNHEALTHY";

export type R100DatabaseMirrorStatus = {
  status: R100DatabaseMirrorStatusCode;
  mode: "MANUAL_FIRST";
  databaseConfigured: boolean;
  mirrorEnabled: boolean;
  safeToWrite: boolean;
  safeToProceed: boolean;
  providerVerifiedRevenueBrl: 0;
  realRevenueClaimedAutomatically: false;
  latestSnapshotAt: string | null;
  snapshotCount: number;
  warnings: string[];
  safety: R100DurableSafetyMetadata & { previewOnly: true; noSecrets: true; dbMirrorOnly: true; notPaymentSettlement: true };
};

export type R100DatabaseMirrorSnapshot = {
  snapshotId: string | null;
  snapshotMode: "SAFE_REDACTED";
  source: "R100_DURABLE_STATE_MIRROR_P2";
  collectionCounts: Record<R100DurableCollectionName, number>;
  collections: Partial<Record<R100DurableCollectionName, unknown[]>>;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorWriteResult = {
  status: "R100_DB_MIRROR_PROBE_WRITTEN" | "R100_DB_MIRROR_SNAPSHOT_EXPORTED";
  eventId?: string;
  snapshotId?: string;
  wroteToDatabase: true;
  providerVerifiedRevenueBrl: 0;
  realRevenueClaimedAutomatically: false;
  safety: R100DatabaseMirrorStatus["safety"];
};

export type R100DatabaseMirrorReadiness = {
  status: "R100_DB_MIRROR_SCHEMA_READINESS_P2";
  mode: "MANUAL_FIRST";
  databaseConfigured: boolean;
  schemaReady: boolean;
  snapshotsTableReady: boolean;
  auditEventsTableReady: boolean;
  mirrorEnabled: boolean;
  safeToWrite: boolean;
  nextManualAction: string;
  warnings: string[];
  safety: R100DatabaseMirrorStatus["safety"] & { manualFirst: true; previewOnly: true; dbMirrorOnly: true; notPaymentSettlement: true; providerVerifiedRevenueBrl: 0; realRevenueClaimedAutomatically: false };
};

export type R100DatabaseMirrorActivationPlan = {
  status: "R100_DB_MIRROR_ACTIVATION_PLAN_P2";
  mode: "MANUAL_FIRST";
  currentReadiness: R100DatabaseMirrorReadiness;
  checklist: string[];
  rollback: string[];
  warnings: string[];
  safety: R100DatabaseMirrorReadiness["safety"];
};
