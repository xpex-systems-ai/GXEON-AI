const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const EVT_FILE = path.join(process.cwd(), '.gxeon_runtime', 'events.jsonl');
const HEARTBEAT_MS = 15000;

function parseQuery(url='') { const q = new URL(url, 'http://x').searchParams; return { workflow_id:q.get('workflow_id'), type:q.get('type'), operator:q.get('operator') }; }
function matchFilter(evt, f){ if(f.workflow_id && evt.workflow_id!==f.workflow_id) return false; if(f.type && evt.type!==f.type) return false; return true; }

class RealtimeGateway {
  constructor() {
    this.wss = null;
    this.server = http.createServer((req, res) => {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (req.method === 'GET' && (pathname === '/healthz' || pathname === '/api/healthz')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'gxeon-realtime-gateway' }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND' }));
    });
    this.clients = new Set();
    this.cursor = 0;
  }
  start(port=Number(process.env.PORT || process.env.GXEON_WS_PORT || 8790)){
    this.wss = new WebSocket.Server({ server: this.server });
    this.wss.on('connection', (ws, req)=>{
      ws.isAlive = true; ws.filter = parseQuery(req.url);
      ws.on('pong', ()=> ws.isAlive = true);
      ws.on('message', (raw)=>{ try { const msg=JSON.parse(raw.toString()); if(msg.type==='subscribe') ws.filter={...ws.filter,...msg.filter}; } catch {} });
      this.clients.add(ws);
      ws.send(JSON.stringify({type:'SYSTEM_CONNECTED', at:new Date().toISOString()}));
      ws.on('close', ()=>this.clients.delete(ws));
    });
    this.server.listen(port);
    this.watchLoop();
    this.heartbeatLoop();
    return this.server;
  }
  heartbeatLoop(){ setInterval(()=>{ for(const ws of this.clients){ if(!ws.isAlive){ ws.terminate(); continue; } ws.isAlive=false; ws.ping(); } }, HEARTBEAT_MS); }
  watchLoop(){ setInterval(()=>{ const events = this.readNewEvents(); for(const e of events) this.broadcast(e); }, 500); }
  readNewEvents(){ if(!fs.existsSync(EVT_FILE)) return []; const txt=fs.readFileSync(EVT_FILE,'utf8'); const lines=txt.split('\n').filter(Boolean); const slice=lines.slice(this.cursor); this.cursor=lines.length; return slice.map(l=>JSON.parse(l)); }
  broadcast(evt){ const payload = JSON.stringify({channel:'runtime.events', event:evt}); for(const ws of this.clients){ if(ws.readyState===WebSocket.OPEN && matchFilter(evt, ws.filter||{})) ws.send(payload); } }
}
module.exports = { RealtimeGateway };
if(require.main===module){ const g=new RealtimeGateway(); const port=Number(process.env.PORT||process.env.GXEON_WS_PORT||8790); g.start(port); console.log(`WS gateway on ${port}`); }
