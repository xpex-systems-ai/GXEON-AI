// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');

// Validate env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[GX_MARKETPLACE] ❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
