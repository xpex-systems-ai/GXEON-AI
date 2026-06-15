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
