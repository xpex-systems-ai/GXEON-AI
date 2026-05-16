'use strict';

/**
 * GXEON Core Boot profile.
 *
 * This file converts the operational boot payload into a deterministic,
 * read-only runtime profile. It intentionally does not execute external
 * integrations by itself; service modules can consume this profile and decide
 * which workers/routes should be activated from environment-specific secrets.
 */

const GXEON_CORE_BOOT = Object.freeze({
  version: 'v1.0.0',
  mode: 'AUTONOMOUS_PRODUCTION',
  environment: 'cloud',
  objective: 'Operar sistema autônomo de monitoramento, automação, inteligência operacional e monetização contínua',
  priority: 'MAXIMUM_STABILITY'
});

const INTEGRATIONS = Object.freeze({
  github: Object.freeze({
    enabled: true,
    mode: 'repository_sync',
    actions: Object.freeze([
      'commit',
      'push',
      'pull_request',
      'branch_management',
      'code_review'
    ])
  }),

  slack: Object.freeze({
    enabled: true,
    channels: Object.freeze([
      '#gx-alerts',
      '#gx-errors',
      '#gx-mev',
      '#gx-deploy',
      '#gx-whales',
      '#gx-finance',
      '#gx-heartbeat'
    ]),
    notifications: Object.freeze({
      deploy_success: true,
      deploy_fail: true,
      critical_error: true,
      whale_detected: true,
      mev_signal: true,
      profit_alert: true,
      database_error: true,
      heartbeat: true
    })
  }),

  linear: Object.freeze({
    enabled: true,
    auto_issue_creation: true,
    priorities: Object.freeze({
      P0: 'critical',
      P1: 'high',
      P2: 'normal',
      P3: 'low'
    }),
    auto_labels: Object.freeze([
      'bug',
      'security',
      'performance',
      'database',
      'signal_provider',
      'mev',
      'deploy'
    ])
  }),

  supabase: Object.freeze({
    enabled: true,
    mode: 'persistent_memory',
    tables: Object.freeze([
      'signals',
      'wallets',
      'mev_events',
      'trade_logs',
      'smart_wallets',
      'system_events',
      'fleet_heartbeat',
      'revenue_events',
      'api_usage_logs'
    ]),
    healthcheck: Object.freeze({
      enabled: true,
      interval_seconds: 60,
      alert_on_failure: true
    })
  })
});

const OPERATIONS = Object.freeze({
  monitoring: Object.freeze({
    enabled: true,
    cadence_seconds: 30,
    domains: Object.freeze([
      'system_health',
      'database',
      'deployments',
      'wallet_activity',
      'mev_signals',
      'profitability',
      'billing'
    ])
  }),
  automation: Object.freeze({
    enabled: true,
    max_parallel_jobs: 4,
    retry_policy: Object.freeze({
      max_attempts: 3,
      backoff_seconds: 15,
      alert_after_final_failure: true
    })
  }),
  monetization: Object.freeze({
    enabled: true,
    modes: Object.freeze([
      'signal_marketplace',
      'api_billing',
      'dataset_sales',
      'agent_execution'
    ]),
    require_billing_gate: true
  }),
  safety: Object.freeze({
    circuit_breaker_enabled: true,
    read_only_without_secrets: true,
    never_exit_on_transient_network_errors: true,
    require_explicit_live_mode_for_onchain_execution: true
  })
});

const RUNTIME_FLAGS = Object.freeze({
  heartbeat_enabled: true,
  autonomous_boot_enabled: true,
  degraded_mode_allowed: true,
  fail_closed_for_paid_routes: true,
  expose_public_boot_status: true
});

const CORE_BOOT_PROFILE = Object.freeze({
  GXEON_CORE_BOOT,
  INTEGRATIONS,
  OPERATIONS,
  RUNTIME_FLAGS
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCoreBootProfile() {
  return clone(CORE_BOOT_PROFILE);
}

function getPublicCoreBootStatus() {
  const profile = getCoreBootProfile();

  return {
    core: profile.GXEON_CORE_BOOT,
    integrations: Object.fromEntries(
      Object.entries(profile.INTEGRATIONS).map(([name, integration]) => [
        name,
        {
          enabled: Boolean(integration.enabled),
          mode: integration.mode || null,
          channels: integration.channels || undefined,
          notifications: integration.notifications
            ? Object.keys(integration.notifications).filter((key) => integration.notifications[key])
            : undefined,
          actions: integration.actions || undefined,
          priorities: integration.priorities || undefined,
          tables: integration.tables || undefined
        }
      ])
    ),
    operations: profile.OPERATIONS,
    runtime_flags: profile.RUNTIME_FLAGS,
    generated_at: new Date().toISOString()
  };
}

function summarizeCoreBoot() {
  const profile = getCoreBootProfile();

  return {
    version: profile.GXEON_CORE_BOOT.version,
    mode: profile.GXEON_CORE_BOOT.mode,
    priority: profile.GXEON_CORE_BOOT.priority,
    integrations_enabled: Object.entries(profile.INTEGRATIONS)
      .filter(([, integration]) => integration.enabled)
      .map(([name]) => name),
    heartbeat_enabled: profile.RUNTIME_FLAGS.heartbeat_enabled,
    degraded_mode_allowed: profile.RUNTIME_FLAGS.degraded_mode_allowed
  };
}

module.exports = {
  CORE_BOOT_PROFILE,
  getCoreBootProfile,
  getPublicCoreBootStatus,
  summarizeCoreBoot
};
