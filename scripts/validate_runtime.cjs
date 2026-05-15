'use strict';

const assert = require('assert/strict');
const { spawn } = require('child_process');

const PORT = Number(process.env.RUNTIME_VALIDATE_PORT || 18180);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ENDPOINTS = [
  '/api/v1/core/boot',
  '/api/v1/providers/status',
  '/api/v1/system/metrics',
  '/api/v1/system/runtime',
  '/api/v1/system/errors',
  '/api/v1/system/readiness',
  '/api/v1/system/supabase/health'
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.json();
  return { status: response.status, body };
}

async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 7000) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch (_error) {
      // keep polling
    }
    await wait(250);
  }
  throw new Error('server did not become healthy in time');
}

async function main() {
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      DISABLE_GUARDIAN: 'true',
      DISABLE_RADAR: 'true',
      SWARM_AUTOSTART: 'false',
      GXEON_RUNTIME_MODE: 'SAFE_AUTONOMOUS_PRODUCTION'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await waitForServer(child);
    await wait(750);

    const results = {};
    for (const endpoint of ENDPOINTS) {
      results[endpoint] = await fetchJson(endpoint);
    }

    assert.equal(results['/api/v1/core/boot'].body.core.version, 'v1.0.0');
    assert.equal(results['/api/v1/core/boot'].body.runtime_mode, 'SAFE_AUTONOMOUS_PRODUCTION');
    assert.ok(results['/api/v1/core/boot'].body.provider_health);
    assert.ok(results['/api/v1/providers/status'].body.summary);
    assert.ok(results['/api/v1/system/metrics'].body.memory);
    assert.ok(results['/api/v1/system/runtime'].body.deployment_target);
    assert.ok(Array.isArray(results['/api/v1/system/errors'].body.recent));
    assert.equal(results['/api/v1/system/readiness'].body.boot, 'ready');
    assert.ok(['healthy', 'missing_env', 'degraded'].includes(results['/api/v1/system/supabase/health'].body.runtime));

    const report = {
      status: 'validated',
      base_url: BASE_URL,
      endpoints: Object.fromEntries(
        Object.entries(results).map(([endpoint, result]) => [endpoint, {
          status: result.status,
          runtime: result.body.runtime || result.body.state || result.body.boot || 'ok'
        }])
      ),
      supabase_env_ready: results['/api/v1/system/supabase/health'].body.connected === true,
      readiness: results['/api/v1/system/readiness'].body,
      stdout_tail: stdout.split('\n').slice(-10).filter(Boolean),
      stderr_tail: stderr.split('\n').slice(-10).filter(Boolean)
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    child.kill('SIGTERM');
    await wait(250);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
