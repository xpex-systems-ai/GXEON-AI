const { fetchOpenMarketplaceTasks, convertMarketplaceTaskToExecution } = require('./marketplace_engine');

(async () => {
  const tasks = await fetchOpenMarketplaceTasks();

  for (const task of tasks) {
    await convertMarketplaceTaskToExecution(task);
  }

  console.log('[GX_MARKETPLACE]: Tasks injected into execution pipeline');
})();
