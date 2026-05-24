const http = require('http');
const fs = require('fs');
const path = require('path');
const { summarize } = require('../../analytics/runtime/metricsKernel.cjs');
const { getOperatorView } = require('../../analytics/operators/controlPlane.cjs');

const DB_DIR = path.join(process.cwd(), '.gxeon_runtime');
const WF_FILE = path.join(DB_DIR, 'workflows.jsonl');
const EVT_FILE = path.join(DB_DIR, 'events.jsonl');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function filterFeed(events, q) {
  let out = events;
  if (q.type) out = out.filter((e) => e.type === q.type);
  if (q.workflow_id) out = out.filter((e) => e.workflow_id === q.workflow_id);
  const offset = Math.max(parseInt(q.offset || '0', 10), 0);
  const limit = Math.min(Math.max(parseInt(q.limit || '50', 10), 1), 500);
  return { total: out.length, items: out.slice(offset, offset + limit), offset, limit };
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && parsed.pathname === '/api/runtime/snapshot') return json(res, 200, summarize());
  if (req.method === 'GET' && parsed.pathname === '/api/operators/control-plane') return json(res, 200, getOperatorView());
  if (req.method === 'GET' && parsed.pathname === '/api/runtime/events') return json(res, 200, filterFeed(readJsonl(EVT_FILE), Object.fromEntries(parsed.searchParams)));
  if (req.method === 'GET' && parsed.pathname === '/api/workflows/history') {
    const wf = readJsonl(WF_FILE);
    const filtered = Object.fromEntries(parsed.searchParams).workflow_id ? wf.filter((w) => w.workflow_id === Object.fromEntries(parsed.searchParams).workflow_id) : wf;
    return json(res, 200, filterFeed(filtered, Object.fromEntries(parsed.searchParams)));
  }
  json(res, 404, { error: 'NOT_FOUND' });
});

if (require.main === module) {
  const port = Number(process.env.GXEON_OPERATOR_API_PORT || 8787);
  server.listen(port, () => console.log(`[GXEON_OPERATOR_API] listening on ${port}`));
}

module.exports = { server };
