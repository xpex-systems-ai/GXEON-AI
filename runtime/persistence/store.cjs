const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(process.cwd(), '.gxeon_runtime');
const WF_FILE = path.join(DB_DIR, 'workflows.jsonl');
const EVT_FILE = path.join(DB_DIR, 'events.jsonl');

function ensure() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(WF_FILE)) fs.writeFileSync(WF_FILE, '');
  if (!fs.existsSync(EVT_FILE)) fs.writeFileSync(EVT_FILE, '');
}

function appendJsonl(file, row) { fs.appendFileSync(file, JSON.stringify(row) + '\n'); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l)=>JSON.parse(l)); }

function saveWorkflowState(state) { ensure(); appendJsonl(WF_FILE, state); }
function saveEvent(evt) { ensure(); appendJsonl(EVT_FILE, evt); }
function loadWorkflowHistory(id) { ensure(); return readJsonl(WF_FILE).filter((w)=>w.workflow_id===id); }
function loadLatestStates() {
  ensure();
  const m = new Map();
  for (const row of readJsonl(WF_FILE)) m.set(row.workflow_id, row);
  return Array.from(m.values());
}

module.exports = { saveWorkflowState, saveEvent, loadWorkflowHistory, loadLatestStates, ensure };
