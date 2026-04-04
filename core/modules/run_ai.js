const { prioritizeTasks } = require('./ai_decision_engine');

(async () => {
  const result = await prioritizeTasks();
  console.log('[GX_AI_RESULT]:', result);
})();
