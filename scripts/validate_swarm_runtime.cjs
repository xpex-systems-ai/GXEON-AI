'use strict';

const assert = require('assert/strict');
const { spawn } = require('child_process');

const PORT = Number(process.env.SWARM_VALIDATE_PORT || 18280);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function json(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return { status: response.status, body: await response.json() };
}
async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 7000) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${child.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch (_error) {}
    await wait(250);
  }
  throw new Error('server did not become healthy');
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
      GXEON_RUNTIME_MODE: 'AUTONOMOUS_SWARM_RUNTIME'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await waitForServer(child);
    await wait(500);
    const boot = await json('/api/v1/core/boot');
    const agents = await json('/api/v1/swarm/agents');
    const created = await json('/api/v1/tasks/create', {
      method: 'POST',
      body: JSON.stringify({ type: 'report', source: 'internal', priority: 2, payload: { topic: 'swarm_validation' } })
    });
    const queue = await json('/api/v1/tasks/queue');
    const history = await json('/api/v1/tasks/history');
    const events = await json('/api/v1/swarm/events');
    const memory = await json('/api/v1/swarm/memory');
    const monetization = await json('/api/v1/monetization/status');
    const status = await json('/api/v1/swarm/status');

    assert.equal(boot.body.runtime_mode, 'AUTONOMOUS_SWARM_RUNTIME');
    assert.ok(agents.body.total >= 4);
    assert.equal(created.status, 201);
    assert.equal(created.body.accepted, true);
    assert.ok(created.body.execution?.executed);
    assert.ok(history.body.count >= 1);
    assert.ok(Array.isArray(events.body.recent));
    assert.ok(memory.body.tables.includes('swarm_tasks'));
    assert.ok(monetization.body.monetized_tasks >= 1);
    assert.ok(status.body.active_agents >= 1);
    assert.equal(queue.status, 200);

    console.log(JSON.stringify({
      status: 'validated',
      swarm_mode: boot.body.runtime_mode,
      agents: agents.body.total,
      task_id: created.body.task.id,
      execution: created.body.execution.receipt.id,
      monetized_tasks: monetization.body.monetized_tasks,
      queue_depth: queue.body.depth,
      events: events.body.event_count,
      stdout_tail: stdout.split('\n').slice(-8).filter(Boolean),
      stderr_tail: stderr.split('\n').slice(-8).filter(Boolean)
    }, null, 2));
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
