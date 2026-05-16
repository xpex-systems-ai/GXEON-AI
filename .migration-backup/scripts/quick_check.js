const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_PROJECT_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Test 1: Try the RPC directly
  console.log('--- Testing deduct_credits_atomic RPC ---');
  const rpcResult = await s.rpc('deduct_credits_atomic', {
    p_api_key: 'test-fake-key',
    p_amount: 0.01,
    p_operation: '/test'
  });
  console.log('RPC result:', JSON.stringify(rpcResult, null, 2));

  // Test 2: Try listing tables via raw query
  console.log('\n--- Testing users table directly ---');
  const { data, error } = await s.from('users').select('*').limit(1);
  console.log('Users query:', error ? 'ERROR: ' + error.message : 'OK, rows: ' + (data ? data.length : 0));
  if (data && data.length > 0) console.log('First row:', JSON.stringify(data[0], null, 2));
}

check().catch(e => console.error('Fatal:', e.message));
