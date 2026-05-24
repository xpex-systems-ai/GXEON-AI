const { runOnce } = require('../runtime/workers/worker.cjs');
(async () => {
  const jobs = [
    { workflow_id: 'wf_ok_1', payload: { task: 'health-check' } },
    { workflow_id: 'wf_fail_1', payload: { task: 'force-failure' }, should_fail: true }
  ];
  const result = await runOnce(jobs);
  console.log(JSON.stringify(result, null, 2));
})();
