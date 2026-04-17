const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL || 'https://telxvphgrsvsnxvmjkce.supabase.co';
// 🌑 SOVEREIGN TOKEN FALLBACK — Apenas para emergência se env vars falharem
const SOVEREIGN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHh2cGhncnN2c254dm1qa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNjMzMSwiZXhwIjoyMDkwMTAyMzMxfQ.297P1WLrSDqiRWtyUk5OuLoLvAU99zy53_HodleZQkA';
// ⚡ PRIORIDADE: ENV vars primeiro (boa prática de produção)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || SOVEREIGN_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing environment variables. Client will be null.');
  module.exports = null;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[🔥 SOVEREIGN] Supabase client initialized with JWT Token');
  console.log('[🔥 SOVEREIGN] Project:', supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown');
  module.exports = supabase;
}
