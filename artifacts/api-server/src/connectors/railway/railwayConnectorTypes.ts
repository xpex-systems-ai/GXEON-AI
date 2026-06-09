export type RailwayConnectorStatus =
  | "READY"
  | "CONNECTED_READONLY"
  | "PARTIAL_READONLY"
  | "FAILED";

export type RailwayConnectorErrorCode =
  | "NONE"
  | "MISSING_RAILWAY_TOKEN"
  | "RAILWAY_401"
  | "RAILWAY_403"
  | "RAILWAY_404"
  | "RATE_LIMITED"
  | "RAILWAY_5XX"
  | "RAILWAY_GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "RAILWAY_READ_FAILED";

export type RailwayConnectorSectionError = {
  code: RailwayConnectorErrorCode;
  message: string;
  hint: string | null;
};

export type RailwayConnectorConfig = {
  apiBaseUrl: string;
  teamId: string | null;
  projectId: string | null;
  environmentId: string | null;
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  projectIdPresent: boolean;
  environmentIdPresent: boolean;
  missing: RailwayConnectorErrorCode[];
};

export type RailwayConnectorRuntimeDiagnostics = {
  provider: "railway";
  routeStatus: "ONLINE";
  configured: boolean;
  tokenPresent: boolean;
  teamIdPresent: boolean;
  projectIdPresent: boolean;
  environmentIdPresent: boolean;
  apiBaseUrlConfigured: boolean;
  apiBaseUrl: string;
  missing: RailwayConnectorErrorCode[];
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  readProbe: {
    attempted: boolean;
    ok: boolean;
    status: number | null;
    code: RailwayConnectorErrorCode | null;
    projectCount: number | null;
    hint: string | null;
  } | null;
  timestamp: string;
};

export type RailwayRawProject = {
  id?: string;
  name?: string;
  description?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  services?: { edges?: Array<{ node?: RailwayRawService }> };
  environments?: { edges?: Array<{ node?: RailwayRawEnvironment }> };
};

export type RailwayRawEnvironment = {
  id?: string;
  name?: string;
};

export type RailwayRawService = {
  id?: string;
  name?: string;
  icon?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deployments?: { edges?: Array<{ node?: RailwayRawDeployment }> };
  domains?: { serviceDomains?: RailwayRawDomain[]; customDomains?: RailwayRawDomain[] };
};

export type RailwayRawDeployment = {
  id?: string;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  url?: string | null;
  serviceId?: string | null;
};

export type RailwayRawDomain = {
  id?: string;
  domain?: string | null;
  targetPort?: number | null;
};

export type RailwayReadonlyRawSnapshot = {
  readAt: string;
  selectedProjectConfigured: boolean;
  viewerName: string | null;
  projects: RailwayRawProject[];
  selectedProject: RailwayRawProject | null;
  services: RailwayRawService[];
  deploymentsByService: Record<string, RailwayRawDeployment[]>;
  domainsByService: Record<string, RailwayRawDomain[]>;
  variableNamesByService: Record<string, string[]>;
  sectionErrors: {
    viewerError: RailwayConnectorSectionError | null;
    projectsError: RailwayConnectorSectionError | null;
    servicesError: RailwayConnectorSectionError | null;
    deploymentsError: RailwayConnectorSectionError | null;
    domainsError: RailwayConnectorSectionError | null;
    envPresenceError: RailwayConnectorSectionError | null;
  };
};

export type RailwayReadonlyProject = {
  id: string;
  name: string;
  updatedAt: string | null;
};

export type RailwayReadonlyService = {
  id: string;
  name: string;
  status: string;
  latestDeploymentStatus: string;
  domainCount: number;
  publicUrl: string | null;
  updatedAt: string | null;
};

export type RailwayReadonlyDeployment = {
  id: string;
  serviceId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RailwayReadonlyEvidence = {
  id: string;
  type: "PROJECT" | "SERVICE" | "DEPLOYMENT" | "DOMAIN" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type RailwayReadonlyHealth = {
  connectorGateway: "READY";
  railwayConnector:
    | "READY_FOR_CONNECTION"
    | "CONNECTED_READONLY"
    | "PARTIAL_READONLY"
    | "FAILED";
  healthScore: number;
  lastSyncAt: string | null;
  lastErrorCode: RailwayConnectorErrorCode;
  frontendTokenStorage: false;
  providerWrites: false;
  secretExposure: false;
  commandExecution: false;
};

export type RailwayReadonlySnapshot = {
  provider: "railway";
  status: RailwayConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: RailwayConnectorErrorCode;
  viewerError: RailwayConnectorSectionError | null;
  projectsError: RailwayConnectorSectionError | null;
  servicesError: RailwayConnectorSectionError | null;
  deploymentsError: RailwayConnectorSectionError | null;
  domainsError: RailwayConnectorSectionError | null;
  envPresenceError: RailwayConnectorSectionError | null;
  projectCount: number;
  serviceCount: number;
  deploymentCount: number;
  failedDeployments: number;
  runningServices: number;
  domainCount: number;
  selectedProject: RailwayReadonlyProject | null;
  services: RailwayReadonlyService[];
  deployments: RailwayReadonlyDeployment[];
  evidenceTimeline: RailwayReadonlyEvidence[];
  health: RailwayReadonlyHealth;
};
