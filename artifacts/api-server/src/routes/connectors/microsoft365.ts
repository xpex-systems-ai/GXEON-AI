import { Router } from "express";
import {
  getMicrosoft365ConnectorConfig,
  toMicrosoft365ConnectorDiagnostics,
} from "../../connectors/microsoft365/microsoft365ConnectorConfig";
import {
  getMicrosoft365ConnectorActivity,
  recordMicrosoft365ConnectorActivity,
} from "../../connectors/microsoft365/microsoft365ConnectorActivityLog";
import {
  createMicrosoft365AuthorizeUrl,
  getMicrosoft365OAuthReadiness,
  probeMicrosoft365TenantMetadata,
} from "../../connectors/microsoft365/microsoft365ReadonlyClient";
import {
  createMicrosoft365ReadonlyFailedSnapshot,
  createMicrosoft365ReadonlyNotConfiguredSnapshot,
  normalizeMicrosoft365ReadonlySnapshot,
} from "../../connectors/microsoft365/microsoft365ReadonlyNormalizer";
import type { Microsoft365ConnectorErrorCode } from "../../connectors/microsoft365/microsoft365ConnectorTypes";

const router = Router();
const diagnosticsCacheHeader = "no-store";
const snapshotCacheHeader = "private, max-age=15, stale-while-revalidate=15";

router.get("/connectors/microsoft365/diagnostics", async (_req, res) => {
  const config = getMicrosoft365ConnectorConfig();
  const probe = config.tenantIdPresent ? await probeMicrosoft365TenantMetadata() : null;
  const diagnostics = toMicrosoft365ConnectorDiagnostics(probe);
  recordMicrosoft365ConnectorActivity({
    eventType: "diagnostics_checked",
    status: !config.configured || probe?.ok ? "success" : "failed",
    code: probe?.code,
    metadata: {
      configured: diagnostics.configured,
      tenantIdPresent: diagnostics.tenantIdPresent,
      clientIdPresent: diagnostics.clientIdPresent,
      redirectUriPresent: diagnostics.redirectUriPresent,
      scopesPresent: diagnostics.scopesPresent,
      redirectUriValid: diagnostics.redirectUriValid,
      scopePolicySafe: diagnostics.scopePolicy.safe,
      tenantReachable: probe?.ok ?? false,
    },
  });
  recordMicrosoft365ConnectorActivity({
    eventType: "scope_policy_checked",
    status: diagnostics.scopePolicy.safe ? "success" : "failed",
    code: diagnostics.scopePolicy.safe ? null : "FORBIDDEN_SCOPE_REQUESTED",
    metadata: {
      safe: diagnostics.scopePolicy.safe,
      safeScopeCount: diagnostics.safeScopes.length,
      forbiddenScopeCount: diagnostics.forbiddenScopesRequested.length,
    },
  });
  if (probe?.attempted) {
    recordMicrosoft365ConnectorActivity({
      eventType: "tenant_metadata_read",
      status: probe.ok ? "success" : "failed",
      code: probe.code,
      metadata: {
        ok: probe.ok,
        httpStatus: probe.status,
        authorizationEndpointReady: probe.authorizationEndpointReady,
        tokenEndpointReady: probe.tokenEndpointReady,
      },
    });
  }
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json(diagnostics);
});

router.get("/connectors/microsoft365/activity", (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  res.json({ provider: "microsoft365", events: getMicrosoft365ConnectorActivity() });
});

router.get("/connectors/microsoft365/connect-url", async (_req, res) => {
  res.setHeader("Cache-Control", diagnosticsCacheHeader);
  try {
    const readiness = await getMicrosoft365OAuthReadiness();
    const connectUrl = readiness.connectUrlReady ? createMicrosoft365AuthorizeUrl() : null;
    recordMicrosoft365ConnectorActivity({
      eventType: "oauth_url_generated",
      status: connectUrl ? "success" : "failed",
      code: connectUrl ? null : readiness.lastErrorCode,
      metadata: {
        configured: readiness.configured,
        tenantReachable: readiness.tenantReachable,
        consentReady: readiness.consentReady,
        connectUrlReady: Boolean(connectUrl),
      },
    });
    res.json({
      provider: "microsoft365",
      status: readiness.status,
      connectUrlReady: Boolean(connectUrl),
      connectUrl,
      lastErrorCode: readiness.lastErrorCode,
    });
  } catch {
    recordMicrosoft365ConnectorActivity({
      eventType: "oauth_url_generated",
      status: "failed",
      code: "MICROSOFT365_READINESS_FAILED",
      metadata: { connectUrlReady: false },
    });
    res.status(200).json({
      provider: "microsoft365",
      status: "FAILED",
      connectUrlReady: false,
      connectUrl: null,
      lastErrorCode: "MICROSOFT365_READINESS_FAILED",
    });
  }
});

router.get("/connectors/microsoft365/snapshot", async (_req, res) => {
  const config = getMicrosoft365ConnectorConfig();
  res.setHeader("Cache-Control", snapshotCacheHeader);
  recordMicrosoft365ConnectorActivity({
    eventType: "snapshot_requested",
    status: "info",
    metadata: {
      configured: config.configured,
      tenantIdPresent: config.tenantIdPresent,
      clientIdPresent: config.clientIdPresent,
      redirectUriPresent: config.redirectUriPresent,
      scopesPresent: config.scopesPresent,
    },
  });

  if (!config.tenantIdPresent || !config.clientIdPresent || !config.clientSecretPresent || !config.redirectUriPresent || !config.scopesPresent) {
    const snapshot = createMicrosoft365ReadonlyNotConfiguredSnapshot("MISSING_MICROSOFT365_CONFIG");
    recordMicrosoft365ConnectorActivity({
      eventType: "snapshot_success",
      status: "success",
      code: snapshot.lastErrorCode,
      metadata: { status: snapshot.status, healthScore: snapshot.health.healthScore },
    });
    res.json(snapshot);
    return;
  }

  try {
    const readiness = await getMicrosoft365OAuthReadiness();
    const snapshot = normalizeMicrosoft365ReadonlySnapshot(readiness);
    recordMicrosoft365ConnectorActivity({
      eventType: snapshot.status === "FAILED" ? "snapshot_failed" : "snapshot_success",
      status: snapshot.status === "FAILED" ? "failed" : "success",
      code: snapshot.lastErrorCode === "NONE" ? null : snapshot.lastErrorCode,
      metadata: {
        status: snapshot.status,
        healthScore: snapshot.health.healthScore,
        tenantReachable: snapshot.tenantReachable,
        consentReady: snapshot.consentReady,
        connectUrlReady: snapshot.connectUrlReady,
        scopePolicySafe: snapshot.scopePolicySafe,
      },
    });
    res.json(snapshot);
  } catch (error) {
    const code: Microsoft365ConnectorErrorCode = "MICROSOFT365_READINESS_FAILED";
    const reason = error instanceof Error ? error.message : "Microsoft 365 readiness snapshot failed.";
    recordMicrosoft365ConnectorActivity({
      eventType: "snapshot_failed",
      status: "failed",
      code,
      metadata: { configured: true },
    });
    res.status(200).json(createMicrosoft365ReadonlyFailedSnapshot(reason, code));
  }
});

export default router;
