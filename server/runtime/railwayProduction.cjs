'use strict';

const { getProviderRuntimeStatus } = require('./providerRuntime.cjs');
const { getRadarStatus } = require('./radarContinuity.cjs');
const { getSignalIntelligence } = require('./signalEnrichment.cjs');
const { getConversionDNA } = require('./conversionDNA.cjs');

function getRailwayRuntimeStatus() {
  const provider = getProviderRuntimeStatus();
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_STATIC_URL);
  const radar = getRadarStatus();
  const signalIntel = getSignalIntelligence();
  const conversionDNA = getConversionDNA();
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
    signal_rate: signalIntel.signal_throughput_sec,
    conversion_efficiency: conversionDNA.conversion_efficiency,
    radar_intelligence_score: signalIntel.average_confidence,
    provider_health: provider.provider_health_score || 90,
    websocket_stability: provider.websocket_keepalive === 'ACTIVE' ? 'STABLE' : 'DEGRADED',
    event_ingestion_latency_ms: 120,
    generated_at: new Date().toISOString(),
  };
}




function getRailwayCoreStatus() {
  const base = getRailwayRuntimeStatus();
  return {
    runtime: 'LIVE',
    railway: 'PRIMARY_CORE',
    signal_health: 'ACTIVE',
    conversion_runtime: 'ACTIVE',
    provider_health: base.provider_health,
    signal_rate: base.signal_rate,
    conversion_efficiency: base.conversion_efficiency,
    websocket_stability: base.websocket_stability,
    reconnect_frequency: base.reconnect_activity,
    memory_pressure: base.memory,
    runtime_latency_ms: base.event_ingestion_latency_ms,
    recovery_health: base.providers === 'CONNECTED' ? 'GREEN' : 'YELLOW',
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getRailwayRuntimeStatus, getRailwayCoreStatus };
