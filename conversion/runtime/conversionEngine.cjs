const fs = require('fs');
const path = require('path');
const { saveEvent } = require('../../runtime/persistence/store.cjs');

const EVT = path.join(process.cwd(), '.gxeon_runtime', 'events.jsonl');

function readEvents(){ if(!fs.existsSync(EVT)) return []; return fs.readFileSync(EVT,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)); }

function computeConversionSnapshot(){
  const ev = readEvents();
  const wfState = ev.filter(e=>e.type==='WORKFLOW_STATE_CHANGED');
  const completed = wfState.filter(e=>e.state==='COMPLETED').length;
  const dead = wfState.filter(e=>e.state==='DEAD_LETTERED').length;
  const queueEnq = ev.filter(e=>e.type==='QUEUE_ENQUEUED').length;
  const queueDis = ev.filter(e=>e.type==='QUEUE_DISPATCHED').length;

  const activationRate = queueEnq ? completed / queueEnq : 0;
  const retentionProxy = completed ? Math.max(0, (completed - dead) / completed) : 0;
  const revenueVelocity = completed; // deterministic proxy until billing live feed integrated
  const heat = Math.min(100, Math.round((activationRate*50) + (retentionProxy*50)));

  return {
    generated_at: new Date().toISOString(),
    activation_rate: Number(activationRate.toFixed(4)),
    retention_rate: Number(retentionProxy.toFixed(4)),
    workflow_completion: completed,
    revenue_velocity: revenueVelocity,
    queue_balance: queueEnq - queueDis,
    conversion_heat_index: heat
  };
}

function emitConversionEvent(channel, payload){
  const evt = { event_id:`conv_${Date.now()}`, type:'CONVERSION_SIGNAL', channel, at:new Date().toISOString(), payload };
  saveEvent(evt);
  return evt;
}

function runConversionTick(){
  const snap = computeConversionSnapshot();
  emitConversionEvent('runtime_achievements', { conversion_heat_index: snap.conversion_heat_index, workflow_completion: snap.workflow_completion });
  return snap;
}

module.exports = { computeConversionSnapshot, emitConversionEvent, runConversionTick };
