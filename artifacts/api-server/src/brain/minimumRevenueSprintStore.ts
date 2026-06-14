import { MinimumRevenueSprintInput, MinimumRevenueSprintRecord, RevenueSprintStatus, previewSafetyFlags } from "./commandBrainTypes";
import { planMinimumRevenueSprint } from "./minimumRevenueSprintPlanner";

const sprints = new Map<string, MinimumRevenueSprintRecord>();
const manualStatuses: RevenueSprintStatus[] = ["PLANNED", "ACTIVE_MANUAL", "WAITING_PAYMENT_MANUAL", "SUBMISSION_PREPARED", "BLOCKED", "COMPLETED_UNVERIFIED", "CANCELLED"];

export function createMinimumRevenueSprint(input: MinimumRevenueSprintInput = {}): MinimumRevenueSprintRecord {
  const now = new Date().toISOString();
  const id = `mrs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: MinimumRevenueSprintRecord = { id, createdAt: now, updatedAt: now, status: "PLANNED", ...planMinimumRevenueSprint(input), ledgerPreview: { ...planMinimumRevenueSprint(input).ledgerPreview, providerVerified: false, realRevenueClaimed: false } };
  sprints.set(id, record);
  return record;
}

export function listMinimumRevenueSprints(): MinimumRevenueSprintRecord[] {
  return [...sprints.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMinimumRevenueSprintById(id: string): MinimumRevenueSprintRecord | undefined {
  return sprints.get(id);
}

export function updateMinimumRevenueSprintStatus(id: string, status: RevenueSprintStatus): MinimumRevenueSprintRecord {
  if (!manualStatuses.includes(status)) throw new Error("INVALID_MANUAL_REVENUE_SPRINT_STATUS");
  const existing = sprints.get(id);
  if (!existing) throw new Error("MINIMUM_REVENUE_SPRINT_NOT_FOUND");
  const updated: MinimumRevenueSprintRecord = { ...existing, ...previewSafetyFlags, status, updatedAt: new Date().toISOString(), ledgerPreview: { ...existing.ledgerPreview, providerVerified: false, realRevenueClaimed: false, ledgerWriteDisabled: true } };
  sprints.set(id, updated);
  return updated;
}
