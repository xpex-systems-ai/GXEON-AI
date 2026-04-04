// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');

// Validate env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[GX_REWARD] ❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function processRewards(limit = 10) {
  console.log('[GX]: Reward Engine Running...');

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'completed')
    .is('rewarded_at', null)
    .limit(limit);

  if (error) throw new Error(error.message);

  if (!tasks.length) {
    return { status: 'NO_REWARDS' };
  }

  const results = [];

  for (const task of tasks) {
    try {
      const reward = calculateReward(task);

      await supabase.from('rewards').insert([
        {
          task_id: task.id,
          amount: reward,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);

      await supabase
        .from('tasks')
        .update({ rewarded_at: new Date().toISOString() })
        .eq('id', task.id);

      results.push({ id: task.id, reward });

    } catch (err) {
      results.push({ id: task.id, error: err.message });
    }
  }

  return {
    status: 'REWARDS_PROCESSED',
    count: results.length,
    results
  };
}

function calculateReward(task) {
  switch (task.task_name) {
    case 'scrape_page':
      return 0.01;
    case 'api_call':
      return 0.02;
    default:
      return 0.005;
  }
}

module.exports = {
  processRewards
};
