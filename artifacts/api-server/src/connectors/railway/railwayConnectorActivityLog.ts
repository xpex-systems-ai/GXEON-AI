export type RailwayConnectorActivityEventType =
  | "diagnostics_checked"
  | "snapshot_requested"
  | "projects_read"
  | "services_read"
  | "deployments_read"
  | "env_presence_read"
  | "logs_metadata_read"
  | "snapshot_success"
  | "snapshot_failed";

export type RailwayConnectorActivityStatus = "success" | "failed" | "info";

export type RailwayConnectorActivityEvent = {
  timestamp: string;
  eventType: RailwayConnectorActivityEventType;
  status: RailwayConnectorActivityStatus;
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

const MAX_EVENTS = 50;
const events: RailwayConnectorActivityEvent[] = [];
const forbiddenMetadataPattern =
  /(token|secret|authorization|bearer|cookie|password|envValue|rawLog|header|credential)/i;

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataPattern.test(key))
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function recordRailwayConnectorActivity(event: {
  eventType: RailwayConnectorActivityEventType;
  status: RailwayConnectorActivityStatus;
  code?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): RailwayConnectorActivityEvent {
  const safeEvent = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    status: event.status,
    code: event.code ?? null,
    metadata: sanitizeMetadata(event.metadata ?? {}),
  } satisfies RailwayConnectorActivityEvent;
  events.unshift(safeEvent);
  events.splice(MAX_EVENTS);
  return safeEvent;
}

export function getRailwayConnectorActivity(): RailwayConnectorActivityEvent[] {
  return [...events];
}
