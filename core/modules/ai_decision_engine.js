// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');

// Validate env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[GX_AI_DECISION] ❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function prioritizeTasks(limit = 10) {
  console.log('[GX]: AI Decision Engine Running...');

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  if (!tasks.length) {
    return { status: 'NO_TASKS' };
  }

  const scored = tasks.map(task => ({
    ...task,
    score: calculateScore(task)
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, limit);

  for (const task of selected) {
    await supabase
      .from('tasks')
      .update({ priority_score: task.score })
      .eq('id', task.id);
  }

  return {
    status: 'PRIORITIZED',
    selected: selected.length,
    top: selected.map(t => ({ id: t.id, score: t.score }))
  };
}

function calculateScore(task) {
  let score = 0;

  if (task.marketplace_id) score += 2;
  if (task.type === 'api_call') score += 1.5;
  if (task.type === 'scrape') score += 1;

  score += Math.random(); // exploração

  return score;
}

module.exports = {
  prioritizeTasks
};
