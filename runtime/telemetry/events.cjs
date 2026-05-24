const { saveEvent } = require('../persistence/store.cjs');
function emitEvent(type, payload) {
  const evt = { event_id: `evt_${Date.now()}_${Math.random().toString(16).slice(2,8)}`, type, at: new Date().toISOString(), ...payload };
  saveEvent(evt);
  return evt;
}
module.exports = { emitEvent };
