const { runExecutionAgent } = require('./execution_agent');

(async () => {
  const result = await runExecutionAgent();
  console.log('[GX_EXECUTION_RESULT]:', result);
})();
