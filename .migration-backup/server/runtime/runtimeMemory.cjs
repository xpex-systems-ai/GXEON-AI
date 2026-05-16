'use strict';

const fs = require('node:fs');
const path = require('node:path');

const memFile = path.resolve(__dirname, '../../artifacts/runtime-memory.json');

function readMemory() {
  try { return JSON.parse(fs.readFileSync(memFile, 'utf8')); } catch { return {}; }
}

function writeMemory(patch) {
  const current = readMemory();
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(memFile), { recursive: true });
  fs.writeFileSync(memFile, JSON.stringify(next, null, 2) + '\n');
  return next;
}

function getRuntimeMemoryStatus() {
  const state = readMemory();
  return {
    storage_priority: process.env.SUPABASE_URL ? 'SUPABASE_THEN_LOCAL' : 'LOCAL_JSON_FALLBACK',
    runtime_health: state.runtime_health || 'GREEN',
    provider_state: state.provider_state || 'UNKNOWN',
    radar_state: state.radar_state || 'UNKNOWN',
    sync_state: state.sync_state || 'ACTIVE',
    deployment_state: state.deployment_state || 'HEALTHY',
    telemetry_counters: state.telemetry_counters || { events: 0 },
    reconnect_history: state.reconnect_history || [],
    generated_at: new Date().toISOString(),
  };
}

module.exports = { readMemory, writeMemory, getRuntimeMemoryStatus };
