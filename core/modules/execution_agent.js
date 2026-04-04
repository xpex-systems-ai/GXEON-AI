/**
 * GXEON_MODULE_02: Execution Agent v1.2 (Railway Ready)
 */

// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Validate env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[GX_EXECUTION] ❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('[GX_EXECUTION] Railway: Add env vars in Railway Dashboard → Variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * FETCH + LOCK TASKS
 */
async function fetchAndLockTasks(limit = 5) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .limit(limit);

  if (error) throw new Error(error.message);

  // LOCK (marca como processing)
  const ids = tasks.map(t => t.id);

  if (ids.length > 0) {
    await supabase
      .from('tasks')
      .update({ status: 'processing' })
      .in('id', ids);
  }

  return tasks;
}

/**
 * EXECUTE TASK
 */
async function executeTask(task) {
  const { task_name, payload } = task;

  switch (task_name) {
    case 'scrape_page':
      const res = await axios.get(payload.url);
      return {
        length: res.data.length,
        preview: res.data.substring(0, 300)
      };

    case 'api_call':
      const api = await axios({
        method: payload.method || 'GET',
        url: payload.endpoint,
        data: payload.body || {}
      });
      return api.data;

    default:
      return {
        execution: "generic_success",
        timestamp: new Date().toISOString()
      };
  }
}

/**
 * UPDATE TASK
 */
async function updateTask(taskId, status, result) {
  await supabase
    .from('tasks')
    .update({
      status,
      result,
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId);
}

/**
 * LOG EXECUTION
 */
async function logExecution(taskId, status) {
  await supabase.from('logs').insert([
    {
      type: "execution",
      status,
      task_id: taskId,
      created_at: new Date().toISOString()
    }
  ]);
}

/**
 * MAIN RUNNER
 */
async function runExecutionAgent() {
  console.log("[GX]: Execution Agent Running...");

  const tasks = await fetchAndLockTasks(5);

  if (!tasks.length) {
    return { status: "IDLE" };
  }

  const results = [];

  for (const task of tasks) {
    try {
      const result = await executeTask(task);

      await updateTask(task.id, 'completed', result);
      await logExecution(task.id, 'completed');

      results.push({ id: task.id, status: 'completed' });

    } catch (err) {
      await updateTask(task.id, 'failed', { error: err.message });
      await logExecution(task.id, 'failed');

      results.push({ id: task.id, status: 'failed' });
    }
  }

  return {
    status: "DONE",
    processed: results.length,
    results
  };
}

module.exports = {
  runExecutionAgent
};
