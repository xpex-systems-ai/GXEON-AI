'use strict';

const { readMemory, writeMemory } = require('./runtimeMemory.cjs');

function getRadarStatus() {
  const mem = readMemory();
  const trackedPools = mem.tracked_pools || 29;
  const lastScan = mem.radar_last_scan || new Date().toISOString();
  writeMemory({ radar_state: 'ACTIVE', radar_last_scan: lastScan, tracked_pools: trackedPools, smart_tracking: true });
  return {
    radar: 'ACTIVE',
    tracked_pools: trackedPools,
    smart_tracking: true,
    heartbeat: 'ONLINE',
    scan_rate: 'STABLE',
    prevent_duplicate_scans: true,
    last_scan: lastScan,
  };
}

module.exports = { getRadarStatus };
