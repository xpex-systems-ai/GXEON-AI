const { processRewards } = require('./reward_engine');

(async () => {
  const result = await processRewards();
  console.log('[GX_REWARD_RESULT]:', result);
})();
