'use strict';

const { getRuntimeSyncStatus } = require('./runtimeHeartbeat.cjs');
const { getRecoveryStatus } = require('./runtimeRecovery.cjs');

function getProductionRuntimeStatus() {
  const sync = getRuntimeSyncStatus();
  const recovery = getRecoveryStatus();
  const supabase = process.env.SUPABASE_URL ? 'CONFIGURED' : 'DEGRADED';

  return {
    production_runtime: 'ACTIVE',
    runtime: 'LIVE',
    heartbeat: sync.github_sync,
    recovery: recovery.status,
    governance: 'ACTIVE',
    telemetry: 'ACTIVE',
    conversion_runtime: 'ACTIVE',
    swarm_monitoring: 'ACTIVE',
    dashboard_runtime: 'ACTIVE',
    supabase_validation: supabase,
    deployment_sync: sync.github_sync,
    last_commit: sync.last_commit,
    last_sync: sync.last_sync,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getProductionRuntimeStatus };
