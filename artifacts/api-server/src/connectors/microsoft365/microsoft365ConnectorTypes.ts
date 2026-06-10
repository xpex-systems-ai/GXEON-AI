export type Microsoft365ConnectorStatus =
  | "NOT_CONFIGURED"
  | "READY_FOR_CONSENT"
  | "CONNECTED_READONLY"
  | "FAILED";

export type Microsoft365SubsystemStatus =
  | "NOT_CONFIGURED"
  | "READY_AFTER_CONSENT"
  | "READY_MANUAL_FIRST"
  | "CONNECTED_READONLY"
  | "FAILED";

export type Microsoft365ConnectorErrorCode =
  | "NONE"
  | "MISSING_MICROSOFT365_CONFIG"
  | "INVALID_REDIRECT_URI"
  | "FORBIDDEN_SCOPE_REQUESTED"
  | "MICROSOFT365_400"
  | "MICROSOFT365_404"
  | "MICROSOFT365_401"
  | "MICROSOFT365_403"
  | "RATE_LIMITED"
  | "MICROSOFT365_5XX"
  | "NETWORK_ERROR"
  | "TENANT_METADATA_UNREACHABLE"
  | "MICROSOFT365_READINESS_FAILED";

export type Microsoft365SafeConfig = {
  tenantIdPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  scopesPresent: boolean;
  configured: boolean;
  safeScopes: string[];
  forbiddenScopesRequested: string[];
  missing: Microsoft365ConnectorErrorCode[];
};

export type Microsoft365ConnectorConfig = Microsoft365SafeConfig & {
  tenantId: string | null;
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  scopes: string[];
};

export type Microsoft365ScopePolicy = {
  safe: boolean;
  recommendedScopes: string[];
  futureReadonlyScopesRequiresApproval: string[];
  forbiddenScopes: string[];
  safeScopes: string[];
  forbiddenScopesRequested: string[];
};

export type Microsoft365TenantProbe = {
  attempted: boolean;
  ok: boolean;
  status: number | null;
  code: Microsoft365ConnectorErrorCode | null;
  safeMessage: string | null;
  authorizationEndpointReady: boolean;
  tokenEndpointReady: boolean;
};

export type Microsoft365OAuthReadiness = {
  provider: "microsoft365";
  status: Microsoft365ConnectorStatus;
  configured: boolean;
  tenantReachable: boolean;
  connectUrlReady: boolean;
  consentReady: boolean;
  redirectUriValid: boolean;
  scopePolicySafe: boolean;
  authorizeUrl: string | null;
  tenantProbe: Microsoft365TenantProbe;
  lastErrorCode: Microsoft365ConnectorErrorCode;
};

export type Microsoft365ConnectorRuntimeDiagnostics = {
  provider: "microsoft365";
  routeStatus: "ONLINE";
  configured: boolean;
  tenantIdPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  scopesPresent: boolean;
  safeScopes: string[];
  forbiddenScopesRequested: string[];
  scopePolicy: Microsoft365ScopePolicy;
  redirectUriValid: boolean;
  runtimeServiceName: string | null;
  nodeEnv: string | null;
  tenantProbe: Microsoft365TenantProbe | null;
  timestamp: string;
};

export type Microsoft365SubsystemReadiness = {
  id: "outlook" | "calendar" | "contacts" | "onedrive" | "proposalCenter";
  label: string;
  status: Microsoft365SubsystemStatus;
  detail: string;
};

export type Microsoft365ReadonlyEvidence = {
  id: string;
  type: "OAUTH" | "TENANT" | "SCOPE_POLICY" | "SUBSYSTEM" | "HEALTH";
  title: string;
  description: string;
  occurredAt: string;
  source: string;
};

export type Microsoft365ReadonlySnapshot = {
  provider: "microsoft365";
  status: Microsoft365ConnectorStatus;
  statusLabel: string;
  configured: boolean;
  lastErrorCode: Microsoft365ConnectorErrorCode;
  tenantIdPresent: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  scopesPresent: boolean;
  safeScopes: string[];
  forbiddenScopesRequested: string[];
  tenantReachable: boolean;
  consentReady: boolean;
  connectUrlReady: boolean;
  scopePolicySafe: boolean;
  redirectUriValid: boolean;
  subsystems: Microsoft365SubsystemReadiness[];
  evidenceTimeline: Microsoft365ReadonlyEvidence[];
  health: {
    connectorGateway: "READY";
    microsoft365Connector:
      | "NOT_CONFIGURED"
      | "READY_FOR_CONSENT"
      | "CONNECTED_READONLY"
      | "FAILED";
    healthScore: number;
    lastSyncAt: string | null;
    lastErrorCode: Microsoft365ConnectorErrorCode;
    frontendTokenStorage: false;
    clientSecretExposure: false;
    graphWrites: false;
    mailSend: false;
    calendarWrites: false;
    fileWrites: false;
    personalDataPersistence: false;
  };
};
