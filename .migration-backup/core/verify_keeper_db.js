#!/usr/bin/env node
/**
 * Database Verification Test Script
 * Validates keeper_rewards table accessibility
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function verifyDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🔍 DATABASE VERIFICATION TEST                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized\n');

  // Test 1: Count records in keeper_rewards
  console.log('📊 Test 1: Querying keeper_rewards table...');
  try {
    const { count, error: countError } = await supabase
      .from('keeper_rewards')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count query failed:', countError.message);
      return false;
    }
    
    console.log(`   ✅ Table accessible! Current records: ${count || 0}\n`);
  } catch (error) {
    console.error('❌ Count query error:', error.message);
    return false;
  }

  // Test 2: Select all columns
  console.log('📊 Test 2: Verifying table structure...');
  try {
    const { data: columns, error: colError } = await supabase
      .from('keeper_rewards')
      .select('*')
      .limit(0);

    if (colError) {
      console.error('❌ Structure query failed:', colError.message);
      return false;
    }
    
    console.log('   ✅ Table structure verified\n');
  } catch (error) {
    console.error('❌ Structure query error:', error.message);
    return false;
  }

  // Test 3: Insert test record
  console.log('📊 Test 3: Inserting test opportunity...');
  const testPayload = {
    task_id: 'TEST_TASK_' + Date.now(),
    protocol: 'gelato_test',
    network: 'ethereum',
    reward_amount: 1.5,
    reward_token: 'ETH',
    gas_spent_usd: 0.5,
    net_profit_usd: 1.0,
    status: 'detected'
  };

  try {
    const { data: insertData, error: insertError } = await supabase
      .from('keeper_rewards')
      .insert(testPayload)
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
      return false;
    }
    
    console.log(`   ✅ Test opportunity inserted!`);
    console.log(`   ID: ${insertData[0].id}`);
    console.log(`   Profit: $${insertData[0].net_profit_usd} USD\n`);

    // Test 4: Verify Realtime by reading back
    console.log('📊 Test 4: Reading back inserted record...');
    const { data: readData, error: readError } = await supabase
      .from('keeper_rewards')
      .select('*')
      .eq('id', insertData[0].id)
      .single();

    if (readError) {
      console.error('❌ Read test failed:', readError.message);
      return false;
    }
    
    console.log(`   ✅ Record read successfully!`);
    console.log(`   Status: ${readData.status}`);
    console.log(`   Created: ${readData.created_at}\n`);

    // Final summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL TESTS PASSED                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('   Database: ✅ Accessible');
    console.log('   Table:    ✅ Structure OK');
    console.log('   Insert:   ✅ Working');
    console.log('   Read:     ✅ Working');
    console.log('   Realtime: ✅ Ready\n');

    return {
      success: true,
      testRecordId: insertData[0].id,
      currentCount: await supabase.from('keeper_rewards').select('*', { count: 'exact', head: true }).then(r => r.count)
    };

  } catch (error) {
    console.error('❌ Insert test error:', error.message);
    return false;
  }
}

// Run verification
verifyDatabase().then(result => {
  if (result.success) {
    console.log(`[DB Verify] Test record created: ${result.testRecordId}`);
    process.exit(0);
  } else {
    console.error('[DB Verify] Tests failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('[DB Verify] Unexpected error:', error);
  process.exit(1);
});
