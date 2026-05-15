import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import telemetry from '../observability/runtimeTelemetry.js';

const CRASH_DIR = 'logs/crash';
mkdirSync(CRASH_DIR, { recursive: true });

export function writeCrashReport(error, context = {}) {
  const report = {
    ts: new Date().toISOString(),
    pid: process.pid,
    node: process.version,
    runtime_mode: process.env.GXEON_RUNTIME_MODE || 'SAFE_AUTONOMOUS_PRODUCTION',
    error: {
      name: error?.name || 'Error',
      message: error?.message || String(error),
      stack: error?.stack || null
    },
    context,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  const path = join(CRASH_DIR, `crash-${Date.now()}.json`);
  try {
    writeFileSync(path, JSON.stringify(report, null, 2));
  } catch (writeError) {
    console.error('[GXEON_SHIELD] Failed to write crash report:', writeError.message);
  }

  telemetry.captureError(error, { ...context, crash_report: path });
  return { path, report };
}

export default writeCrashReport;
