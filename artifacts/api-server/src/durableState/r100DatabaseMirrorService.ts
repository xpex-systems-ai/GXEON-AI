import { desc } from "drizzle-orm";
import { getDb, isDatabaseConfigured, r100StateAuditEvents, r100StateSnapshots } from "@workspace/db";
import { listClientOfferSendPacks } from "../clientOffer/clientOfferSendStore";
import { listLedgerPreviews } from "../ledger/ledgerStore";
import { listManualPaymentRequests } from "../manualPayment/manualPaymentRequestStore";
import { listOperatorWorkflowHandoffs } from "../operatorWorkflow/operatorWorkflowStore";
import { listManualProspects } from "../prospect/manualProspectStore";
import { listOperatorConfirmedRevenue, listRevenueCloseLoops } from "../revenueCloseLoop/revenueCloseLoopStore";
import { r100CollectionNames, r100DurableSafety, type R100DurableCollectionName } from "./r100DurableStateTypes";
import { listR100DurabilityProbes } from "./r100DurabilityProbeStore";
import type { R100DatabaseMirrorSnapshot, R100DatabaseMirrorStatus, R100DatabaseMirrorWriteResult } from "./r100DatabaseMirrorTypes";

const source = "R100_DURABLE_STATE_MIRROR_P2" as const;
const redactKeys = new Set(["manualPaymentLink", "pixKeyLabel", "email", "phone", "whatsapp", "privateNotes", "notes", "token", "apiKey", "secret", "credential", "databaseUrl", "DATABASE_URL"]);

const mirrorEnabled = () => process.env.GXEON_R100_DB_MIRROR_ENABLED === "true";
const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const r100DatabaseMirrorSafety = { ...r100DurableSafety, previewOnly: true, noSecrets: true, dbMirrorOnly: true, notPaymentSettlement: true } as const;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, redactKeys.has(key) ? "REDACTED_SAFE_DB_MIRROR" : redact(nested)]));
  }
  return value;
}

function safeCount(fn: () => unknown[]): number { try { return fn().length; } catch { return 0; } }

function getR100MirrorCollectionCounts(): Record<R100DurableCollectionName, number> {
  return {
    manualProspects: safeCount(listManualProspects),
    clientOfferSendPacks: safeCount(listClientOfferSendPacks),
    manualPaymentRequests: safeCount(listManualPaymentRequests),
    revenueCloseLoops: safeCount(listRevenueCloseLoops),
    operatorConfirmedRevenue: safeCount(listOperatorConfirmedRevenue),
    ledgerPreviews: safeCount(listLedgerPreviews),
    operatorWorkflowHandoffs: safeCount(listOperatorWorkflowHandoffs),
    durabilityProbes: safeCount(listR100DurabilityProbes),
  };
}

function currentCollections(): Record<R100DurableCollectionName, unknown[]> {
  return {
    manualProspects: listManualProspects(),
    clientOfferSendPacks: listClientOfferSendPacks(),
    manualPaymentRequests: listManualPaymentRequests(),
    revenueCloseLoops: listRevenueCloseLoops(),
    operatorConfirmedRevenue: listOperatorConfirmedRevenue(),
    ledgerPreviews: listLedgerPreviews(),
    operatorWorkflowHandoffs: listOperatorWorkflowHandoffs(),
    durabilityProbes: listR100DurabilityProbes(),
  };
}

export function getR100DatabaseMirrorStatus(): R100DatabaseMirrorStatus {
  const databaseConfigured = isDatabaseConfigured();
  const enabled = mirrorEnabled();
  const status = !databaseConfigured ? "R100_DB_NOT_CONFIGURED" : !enabled ? "R100_DB_MIRROR_DISABLED" : "R100_DB_MIRROR_P2_READY";
  return {
    status,
    mode: "MANUAL_FIRST",
    databaseConfigured,
    mirrorEnabled: enabled,
    safeToWrite: databaseConfigured && enabled,
    safeToProceed: databaseConfigured && enabled,
    providerVerifiedRevenueBrl: 0,
    realRevenueClaimedAutomatically: false,
    latestSnapshotAt: null,
    snapshotCount: 0,
    warnings: ["DB mirror P2 is readiness only, not payment settlement.", "No payment provider API, checkout, invoice, webhook, or external contact is used.", ...(databaseConfigured ? [] : ["DATABASE_URL is not configured; database writes stay disabled."]), ...(enabled ? [] : ["GXEON_R100_DB_MIRROR_ENABLED=true is required before writes."])],
    safety: r100DatabaseMirrorSafety,
  };
}

export async function getLatestR100DatabaseMirrorSnapshot(): Promise<R100DatabaseMirrorSnapshot> {
  const status = getR100DatabaseMirrorStatus();
  if (!status.safeToWrite) return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { fallback: status.status }, createdAt: null, safety: r100DatabaseMirrorSafety };
  try {
    const rows = await getDb().select().from(r100StateSnapshots).orderBy(desc(r100StateSnapshots.createdAt)).limit(1);
    const row = rows[0];
    if (!row) return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { empty: true }, createdAt: null, safety: r100DatabaseMirrorSafety };
    return { snapshotId: row.snapshotId, snapshotMode: "SAFE_REDACTED", source, collectionCounts: row.collectionCounts as Record<R100DurableCollectionName, number>, collections: row.collections as Partial<Record<R100DurableCollectionName, unknown[]>>, metadata: row.metadata as Record<string, unknown>, createdAt: row.createdAt.toISOString(), safety: r100DatabaseMirrorSafety };
  } catch {
    return { snapshotId: null, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections: {}, metadata: { fallback: "R100_DB_MIRROR_UNHEALTHY" }, createdAt: null, safety: r100DatabaseMirrorSafety };
  }
}

function assertWritable() { const status = getR100DatabaseMirrorStatus(); if (!status.safeToWrite) throw new Error(status.status); }

export async function createR100DatabaseMirrorProbe(): Promise<R100DatabaseMirrorWriteResult> {
  assertWritable();
  const eventId = nowId("r100_db_probe");
  await getDb().insert(r100StateAuditEvents).values({ eventId, eventType: "CREATE_SAFE_R100_DB_MIRROR_PROBE", source: "R100_DB_MIRROR", payload: { harmlessProbe: true, businessRecordCreated: false }, safety: r100DatabaseMirrorSafety });
  return { status: "R100_DB_MIRROR_PROBE_WRITTEN", eventId, wroteToDatabase: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, safety: r100DatabaseMirrorSafety };
}

export async function exportSafeR100SnapshotToDatabaseMirror(): Promise<R100DatabaseMirrorWriteResult> {
  assertWritable();
  const snapshotId = nowId("r100_safe_snapshot");
  const collections = Object.fromEntries(r100CollectionNames.map((name) => [name, redact(currentCollections()[name])]));
  await getDb().insert(r100StateSnapshots).values({ snapshotId, snapshotMode: "SAFE_REDACTED", source, collectionCounts: getR100MirrorCollectionCounts(), collections, safety: r100DatabaseMirrorSafety, metadata: { manualFirst: true, previewOnly: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false } });
  return { status: "R100_DB_MIRROR_SNAPSHOT_EXPORTED", snapshotId, wroteToDatabase: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false, safety: r100DatabaseMirrorSafety };
}
