async function executeTask(input) {
  if (input.should_fail) throw new Error('DEMO_FAILURE');
  await new Promise((r)=>setTimeout(r, 50));
  return { ok: true, output: input.payload || null };
}
module.exports = { executeTask };
