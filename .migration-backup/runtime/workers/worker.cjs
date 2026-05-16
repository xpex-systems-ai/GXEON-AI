const { QueueDispatcher } = require('../dispatcher/queueDispatcher.cjs');

async function runOnce(jobs = []) {
  const d = new QueueDispatcher();
  for (const j of jobs) d.enqueue(j.queue || 'execution', j);
  return d.drain('execution');
}

module.exports = { runOnce };
