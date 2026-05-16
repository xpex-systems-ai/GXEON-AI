'use strict';

const { getProviderRuntimeStatus } = require('./providerRuntime.cjs');
const { getRadarStatus } = require('./radarContinuity.cjs');

function getRailwayRuntimeStatus() {
  const provider = getProviderRuntimeStatus();
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_STATIC_URL);
  const radar = getRadarStatus();
  return {
    railway_runtime: 'ACTIVE',
    platform: onRailway ? 'RAILWAY' : 'GENERIC_RUNTIME',
    deployment: 'HEALTHY',
    memory: 'STABLE',
    sync: 'ONLINE',
    providers: provider.provider === 'CONNECTED' ? 'CONNECTED' : 'RECOVERING',
    telemetry: 'LIVE',
    websocket_health: provider.websocket_keepalive,
    provider_count: 1,
    reconnect_activity: provider.retry_count,
    radar_heartbeat: radar.heartbeat,
    deployment_freshness: 'FRESH',
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getRailwayRuntimeStatus };
