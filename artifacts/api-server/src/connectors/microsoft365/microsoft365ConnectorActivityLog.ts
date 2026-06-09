export type Microsoft365ConnectorActivityEventType =
  | "diagnostics_checked"
  | "oauth_url_generated"
  | "tenant_metadata_read"
  | "scope_policy_checked"
  | "snapshot_requested"
  | "snapshot_success"
  | "snapshot_failed";

export type Microsoft365ConnectorActivityStatus = "success" | "failed" | "info";

export type Microsoft365ConnectorActivityEvent = {
  timestamp: string;
  eventType: Microsoft365ConnectorActivityEventType;
  status: Microsoft365ConnectorActivityStatus;
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

const MAX_EVENTS = 50;
const events: Microsoft365ConnectorActivityEvent[] = [];
const forbiddenMetadataPattern =
  /(token|secret|authorization|bearer|cookie|password|credential|authCode|code|mail|message|calendar|contact|fileName|driveItem)/i;

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataPattern.test(key))
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function recordMicrosoft365ConnectorActivity(event: {
  eventType: Microsoft365ConnectorActivityEventType;
  status: Microsoft365ConnectorActivityStatus;
  code?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): Microsoft365ConnectorActivityEvent {
  const safeEvent = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    status: event.status,
    code: event.code ?? null,
    metadata: sanitizeMetadata(event.metadata ?? {}),
  } satisfies Microsoft365ConnectorActivityEvent;
  events.unshift(safeEvent);
  events.splice(MAX_EVENTS);
  return safeEvent;
}

export function getMicrosoft365ConnectorActivity(): Microsoft365ConnectorActivityEvent[] {
  return [...events];
}
