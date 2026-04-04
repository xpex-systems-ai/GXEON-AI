require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function publishTaskToMarketplace(taskData) {
  const { data, error } = await supabase
    .from('task_marketplace')
    .insert([taskData])
    .select();

  if (error) throw new Error(error.message);

  return data[0];
}

async function fetchOpenMarketplaceTasks(limit = 5) {
  const { data, error } = await supabase
    .from('task_marketplace')
    .select('*')
    .eq('status', 'open')
    .limit(limit);

  if (error) throw new Error(error.message);

  return data || [];
}

async function convertMarketplaceTaskToExecution(task) {
  const { error } = await supabase.from('tasks').insert([
    {
      type: 'generic',
      payload: { source: 'marketplace', ref: task.id },
      status: 'pending',
      marketplace_id: task.id
    }
  ]);

  if (error) throw new Error(error.message);

  await supabase
    .from('task_marketplace')
    .update({ status: 'processing' })
    .eq('id', task.id);
}

module.exports = {
  publishTaskToMarketplace,
  fetchOpenMarketplaceTasks,
  convertMarketplaceTaskToExecution
};
