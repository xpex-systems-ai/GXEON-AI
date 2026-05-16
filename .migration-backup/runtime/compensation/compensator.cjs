async function compensate(workflow) {
  return { compensated: true, workflow_id: workflow.workflow_id, at: new Date().toISOString() };
}
module.exports = { compensate };
