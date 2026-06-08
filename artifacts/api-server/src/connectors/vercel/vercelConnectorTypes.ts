export type VercelConnectorStatus = "READY" | "CONNECTED_READONLY" | "FAILED";

export type VercelConnectorErrorCode =
  | "NONE"
  | "MISSING_VERCEL_TOKEN"
  | "VERCEL_401"
  | "VERCEL_403"
  | "VERCEL_404"
  | "RATE_LIMITED"
  | "VERCEL_5XX"
  | "NETWORK_ERROR"
  | "VERCEL_READ_FAILED";

export type VercelConnectorConfig = {
  apiBaseUrl: string;
  teamId: string | null;
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  missing: VercelConnectorErrorCode[];
};

export type VercelConnectorRuntimeDiagnostics = {
  provider: "vercel";
  routeStatus: "ONLINE";
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  apiBaseUrlConfigured: boolean;
  missing: VercelConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  timestamp: string;
};

export type VercelRawProject = {
  id?: string;
  name?: string;
  accountId?: string;
  framework?: string | null;
  latestDeployments?: VercelRawDeployment[];
  targets?: { production?: { alias?: string[]; url?: string } };
};

export type VercelRawDeployment = {
  uid?: string;
  id?: string;
  name?: string;
  url?: string;
  state?: string;
  target?: string | null;
  createdAt?: number;
  readyState?: string;
  meta?: Record<string, string | undefined>;
  projectId?: string;
};

export type VercelRawDomain = {
  name?: string;
  apexName?: string;
  projectId?: string;
  verified?: boolean;
};

export type VercelRawAlias = {
  alias?: string;
  deploymentId?: string;
  projectId?: string;
  target?: string | null;
};

export type VercelReadonlyRawSnapshot = {
  readAt: string;
  projects: VercelRawProject[];
  deploymentsByProject: Record<string, VercelRawDeployment[]>;
  domainsByProject: Record<string, VercelRawDomain[]>;
  aliases: VercelRawAlias[];
};

export type VercelReadonlyProject = {
  id: string;
  name: string;
  framework: string | null;
  productionUrl: string | null;
  latestDeploymentState: string;
  lastReadAt: string;
};

export type VercelReadonlyDeployment = {
  id: string;
  projectId: string;
  name: string;
  url: string | null;
  state: string;
  target: string | null;
  createdAt: string | null;
};

export type VercelReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "DEPLOYMENT" | "DOMAIN" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type VercelReadonlyHealth = {
  connectorGateway: "READY";
  vercelConnector: "READY_FOR_CONNECTION" | "CONNECTED_READONLY" | "FAILED";
  healthScore: number;
  lastSyncAt: string | null;
  lastErrorCode: VercelConnectorErrorCode;
  frontendTokenStorage: false;
  providerWrites: false;
  secretExposure: false;
};

export type VercelReadonlySnapshot = {
  provider: "vercel";
  status: VercelConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: VercelConnectorErrorCode;
  totalProjects: number;
  productionReady: number;
  failedLast24h: number;
  domainsConfigured: number;
  previewCount: number;
  projects: VercelReadonlyProject[];
  latestDeployments: VercelReadonlyDeployment[];
  evidenceTimeline: VercelReadonlyEvidence[];
  health: VercelReadonlyHealth;
};
