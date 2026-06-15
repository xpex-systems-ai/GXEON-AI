import { r100DurableStateRegistry } from "./r100DurableStateRegistry";
import type { R100DurabilityProbeRecord, R100DurabilityProbeResult } from "./r100DurableVerificationTypes";

const collection = "durabilityProbes";
const r100DurableVerificationSafety = { manualFirst: true, previewOnly: true, noPaymentProviderApi: true, noAutoSend: true, noGithubWrite: true, noExternalContact: true, noScraping: true, providerVerifiedRevenueBrl: 0, realRevenueClaimedAutomatically: false } as const;

export function listR100DurabilityProbes(): R100DurabilityProbeRecord[] {
  return r100DurableStateRegistry.loadCollection<R100DurabilityProbeRecord>(collection);
}

export function createR100DurabilityProbe(): R100DurabilityProbeResult {
  const statusBefore = r100DurableStateRegistry.getStatus();
  const existing = listR100DurabilityProbes();
  const now = new Date().toISOString();
  const record: R100DurabilityProbeRecord = {
    ...r100DurableVerificationSafety,
    id: `r100_probe_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    source: "R100_DURABILITY_PROBE_P1",
    createdAt: now,
    nonce: Math.random().toString(36).slice(2, 12),
    syntheticOnly: true,
    businessRecordCreated: false,
    amountBrl: 0,
    providerVerifiedRevenueBrl: 0,
  };
  r100DurableStateRegistry.saveCollection(collection, [record, ...existing].slice(0, 25));
  const reloaded = listR100DurabilityProbes();
  const roundtripOk = reloaded.some((probe) => probe.id === record.id && probe.nonce === record.nonce);
  r100DurableStateRegistry.appendEvent({ type: "SAFE_DURABILITY_PROBE", collection, metadata: { probeId: record.id, roundtripOk, syntheticOnly: true } });
  return {
    status: roundtripOk ? "R100_DURABILITY_PROBE_ROUNDTRIP_OK" : "R100_DURABILITY_PROBE_ROUNDTRIP_FAILED",
    mode: "MANUAL_FIRST",
    probeId: record.id,
    persistenceMode: statusBefore.persistenceMode,
    saved: true,
    reloaded: roundtripOk,
    roundtripOk,
    durabilityProbeCount: reloaded.length,
    createdBusinessRecords: false,
    safety: r100DurableVerificationSafety,
  };
}
