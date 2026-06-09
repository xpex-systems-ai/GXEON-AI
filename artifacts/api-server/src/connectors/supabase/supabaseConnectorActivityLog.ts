import type { SupabaseConnectorErrorCode } from "./supabaseConnectorTypes";

export type SupabaseConnectorActivityEvent = {
  timestamp: string;
  eventType:
    | "diagnostics_checked"
    | "snapshot_requested"
    | "project_read"
    | "rest_probe_read"
    | "storage_metadata_read"
    | "database_metadata_read"
    | "rls_metadata_read"
    | "snapshot_success"
    | "snapshot_failed";
  status: "success" | "failed" | "info";
  code: SupabaseConnectorErrorCode | null;
  metadata: Record<string, string | number | boolean | null>;
};

const MAX_EVENTS = 80;
const activity: SupabaseConnectorActivityEvent[] = [];

export function recordSupabaseConnectorActivity(
  event: Omit<SupabaseConnectorActivityEvent, "timestamp" | "code" | "metadata"> & {
    code?: SupabaseConnectorErrorCode | null;
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  activity.unshift({
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    status: event.status,
    code: event.code ?? null,
    metadata: event.metadata ?? {},
  });
  if (activity.length > MAX_EVENTS) activity.pop();
}

export function getSupabaseConnectorActivity(): SupabaseConnectorActivityEvent[] {
  return [...activity];
}
