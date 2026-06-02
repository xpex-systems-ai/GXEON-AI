const http = require('http');
const { server: dashApi } = require('../../api/dashboard/dashboardApiV2.cjs');
const { saveEvent } = require('../../runtime/persistence/store.cjs');

function resolveWsClient() {
  try {
    return require('ws');
  } catch {
    return globalThis.WebSocket || null;
  }
}

function hasWsServerDependency() {
  try {
    require.resolve('ws');
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const WebSocket = resolveWsClient();
  if (!WebSocket || !hasWsServerDependency()) {
    console.error(JSON.stringify({
      status: 'BLOCKED',
      reason: 'MISSING_WS_DEPENDENCY',
      detail: 'Install ws to run realtime gateway smoke test (client and server paths depend on it).'
    }));
    process.exit(2);
  }

  const { RealtimeGateway } = require('../../gateway/realtime/wsGateway.cjs');

  const gw = new RealtimeGateway();
  const gwServer = gw.start(8792);
  dashApi.listen(8793);
  const timeout = setTimeout(() => {
    console.error(JSON.stringify({ status: 'FAIL', reason: 'SMOKE_TIMEOUT' }));
    try { gwServer.close(); } catch {}
    try { dashApi.close(); } catch {}
    process.exit(1);
  }, 10000);

  const ws = new WebSocket('ws://127.0.0.1:8792/?type=WORKFLOW_STATE_CHANGED');
  ws.on('open', () =>
    saveEvent({ event_id: 'evt_test', type: 'WORKFLOW_STATE_CHANGED', workflow_id: 'wf_test', at: new Date().toISOString() })
  );
  ws.on('message', (m) => {
    const payload = m.toString();
    if (!payload.includes('"WORKFLOW_STATE_CHANGED"')) return;
    console.log('WS', payload.slice(0, 120));
    clearTimeout(timeout);
    ws.close();
    gwServer.close();
    dashApi.close();
    process.exit(0);
  });

  http.get('http://127.0.0.1:8793/api/dashboard/live-overview', (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => console.log('OVERVIEW', r.statusCode, d.slice(0, 120)));
  });
})();
