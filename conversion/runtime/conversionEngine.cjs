const fs = require('fs');
const path = require('path');
const { saveEvent } = require('../../runtime/persistence/store.cjs');
const { intentLevelFromSignals } = require('../models/behaviorScoring.cjs');

const EVT = path.join(process.cwd(), '.gxeon_runtime', 'events.jsonl');
const CONV = path.join(process.cwd(), '.gxeon_runtime', 'conversion.jsonl');

function ensure(){ const dir = path.dirname(EVT); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); if(!fs.existsSync(CONV)) fs.writeFileSync(CONV,''); }
function append(file,obj){ ensure(); fs.appendFileSync(file, JSON.stringify(obj)+'\n'); }
function readEvents(){ if(!fs.existsSync(EVT)) return []; return fs.readFileSync(EVT,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)); }

function computeConversionSnapshot(){
  const ev = readEvents();
  const wfState = ev.filter(e=>e.type==='WORKFLOW_STATE_CHANGED');
  const completed = wfState.filter(e=>e.state==='COMPLETED').length;
  const dead = wfState.filter(e=>e.state==='DEAD_LETTERED').length;
  const queueEnq = ev.filter(e=>e.type==='QUEUE_ENQUEUED').length;
  const queueDis = ev.filter(e=>e.type==='QUEUE_DISPATCHED').length;

  const activationRate = queueEnq ? completed / queueEnq : 0;
  const retentionRate = completed ? Math.max(0, (completed - dead) / completed) : 0;
  const revenueVelocity = completed;
  const ltvProxy = Number((revenueVelocity * (1 + retentionRate)).toFixed(4));

  return {
    generated_at: new Date().toISOString(),
    activation_rate: Number(activationRate.toFixed(4)),
    retention_rate: Number(retentionRate.toFixed(4)),
    workflow_completion: completed,
    revenue_velocity: revenueVelocity,
    ltv_proxy: ltvProxy,
    session_value_index: Number(((activationRate*0.6)+(retentionRate*0.4)).toFixed(4)),
    queue_balance: queueEnq - queueDis
  };
}

function emitConversionEvent(channel, payload){
  const evt = { event_id:`conv_${Date.now()}`, type:'CONVERSION_SIGNAL', channel, at:new Date().toISOString(), payload };
  saveEvent(evt); append(CONV, evt); return evt;
}

function routeIntent(intent){
  if (intent==='HOT') return 'AUTO_CTA_SEQUENCE';
  if (intent==='BUYER') return 'DIRECT_CHECKOUT';
  if (intent==='HYPER_BUYER') return 'INSTANT_ACTIVATION_FLOW';
  return 'NURTURE_SEQUENCE';
}

function evaluateSignal(signal){
  const { heat, intent } = intentLevelFromSignals(signal);
  const route = routeIntent(intent);
  const event = emitConversionEvent('intent_routing', { heat, intent, route, signal });
  return { heat, intent, route, event_id: event.event_id };
}

function runConversionTick(){
  const snap = computeConversionSnapshot();
  emitConversionEvent('runtime_achievements', { activation_rate: snap.activation_rate, retention_rate: snap.retention_rate, revenue_velocity: snap.revenue_velocity });
  return snap;
}

module.exports = { computeConversionSnapshot, emitConversionEvent, runConversionTick, evaluateSignal };
