export type GitHubConnectorActivityEventType =
  | "diagnostics_checked"
  | "connect_url_generated"
  | "callback_received"
  | "installation_saved"
  | "installation_autodiscovered"
  | "installation_token_minted"
  | "repository_snapshot_read"
  | "snapshot_failed";

export type GitHubConnectorActivityStatus = "success" | "failed" | "info";

export type GitHubConnectorActivityEvent = {
  timestamp: string;
  eventType: GitHubConnectorActivityEventType;
  status: GitHubConnectorActivityStatus;
  code: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

const MAX_EVENTS = 50;
const events: GitHubConnectorActivityEvent[] = [];
const forbiddenMetadataPattern =
  /(token|secret|private|authorization|jwt|key|client_secret|password)/i;

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !forbiddenMetadataPattern.test(key))
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function recordGitHubConnectorActivity(event: {
  eventType: GitHubConnectorActivityEventType;
  status: GitHubConnectorActivityStatus;
  code?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): GitHubConnectorActivityEvent {
  const safeEvent: GitHubConnectorActivityEvent = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    status: event.status,
    code: event.code ?? null,
    metadata: sanitizeMetadata(event.metadata ?? {}),
  };

  events.unshift(safeEvent);
  events.splice(MAX_EVENTS);
  return safeEvent;
}

export function getGitHubConnectorActivity(): GitHubConnectorActivityEvent[] {
  return [...events];
}
