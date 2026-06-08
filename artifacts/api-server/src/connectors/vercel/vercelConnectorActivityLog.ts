export type VercelConnectorActivityEventType =
  | "diagnostics_checked"
  | "snapshot_requested"
  | "projects_read"
  | "deployments_read"
  | "domains_read"
  | "snapshot_success"
  | "snapshot_failed";

export type VercelConnectorActivityStatus = "success" | "failed" | "info";

export type VercelConnectorActivityEvent = {
  timestamp: string;
  eventType: VercelConnectorActivityEventType;
  status: VercelConnectorActivityStatus;
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

const MAX_EVENTS = 50;
const events: VercelConnectorActivityEvent[] = [];
const forbiddenMetadataPattern =
  /(token|secret|authorization|bearer|cookie|password|env|buildLog|log)/i;

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataPattern.test(key))
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function recordVercelConnectorActivity(event: {
  eventType: VercelConnectorActivityEventType;
  status: VercelConnectorActivityStatus;
  code?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): VercelConnectorActivityEvent {
  const safeEvent = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    status: event.status,
    code: event.code ?? null,
    metadata: sanitizeMetadata(event.metadata ?? {}),
  } satisfies VercelConnectorActivityEvent;
  events.unshift(safeEvent);
  events.splice(MAX_EVENTS);
  return safeEvent;
}

export function getVercelConnectorActivity(): VercelConnectorActivityEvent[] {
  return [...events];
}
