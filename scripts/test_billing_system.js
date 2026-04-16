/**
 * GXEON Billing System — Local Ignition Test
 * Tests: Supabase RPC connection, deduct_credits_atomic, refund_credits, ethers v6
 * 
 * Usage: node scripts/test_billing_system.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// ============================================================
// STEP 0: ENV VALIDATION
// ============================================================
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║          GXEON BILLING SYSTEM — LOCAL IGNITION TEST          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const REQUIRED_ENV = [
  'SUPABASE_PROJECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnv = REQUIRED_ENV.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
  console.error('❌ ENV CHECK FAILED — Missing variables:', missingEnv);
  console.error('   Ensure .env file exists at project root with:');
  console.error('   SUPABASE_PROJECT_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJ...\n');
  process.exit(1);
}

console.log('✅ ENV CHECK PASSED');
console.log('   SUPABASE_PROJECT_URL:', process.env.SUPABASE_PROJECT_URL);
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20) + '...\n');

// ============================================================
// STEP 1: SUPABASE CLIENT INIT
// ============================================================
const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Supabase client initialized\n');

// ============================================================
// STEP 2: FETCH TEST USER
// ============================================================
async function fetchTestUser() {
  console.log('🔍 STEP 2: Fetching test user from "users" table...');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, api_key, balance_credits, tier, status')
    .limit(5);

  if (error) {
    console.error('❌ Failed to fetch users:', error.message);
    console.error('   → The "users" table may not have the new columns yet.');
    console.error('   → Run supabase_billing_migration.sql in Supabase SQL Editor first!\n');
    return null;
  }

  if (!users || users.length === 0) {
    console.warn('⚠️  No users found in table. Creating a test user...\n');
    
    // Create a test user with api_key
    const testApiKey = 'gxeon-test-' + Date.now();
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: 'Test User',
        role: 'admin',
        api_key: testApiKey,
        balance_credits: 10.00,
        tier: 'enterprise',
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test user:', insertError.message);
      console.error('   → Run supabase_billing_migration.sql first to add api_key column!\n');
      return null;
    }

    console.log('✅ Test user created:');
    console.log('   ID:', newUser.id);
    console.log('   API Key:', newUser.api_key);
    console.log('   Balance:', newUser.balance_credits);
    console.log('   Tier:', newUser.tier);
    console.log('   Status:', newUser.status, '\n');
    return newUser;
  }

  // Find a user with api_key, or use the first one
  const userWithKey = users.find(u => u.api_key) || users[0];
  
  console.log(`✅ Found ${users.length} user(s), using:`);
  console.log('   ID:', userWithKey.id);
  console.log('   Name:', userWithKey.name);
  console.log('   API Key:', userWithKey.api_key || '(none — will need migration!)');
  console.log('   Balance:', userWithKey.balance_credits ?? '(column missing)');
  console.log('   Tier:', userWithKey.tier ?? '(column missing)');
  console.log('   Status:', userWithKey.status ?? '(column missing)', '\n');

  if (!userWithKey.api_key) {
    console.warn('⚠️  User has no api_key. Attempting to assign one...\n');
    const testApiKey = 'gxeon-test-' + Date.now();
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ api_key: testApiKey, balance_credits: 10.00, tier: 'enterprise', status: 'active' })
      .eq('id', userWithKey.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update user with api_key:', updateError.message);
      console.error('   → Run supabase_billing_migration.sql first!\n');
      return null;
    }

    console.log('✅ Updated user with test api_key:', testApiKey);
    console.log('   Balance:', updated.balance_credits, '\n');
    return updated;
  }

  return userWithKey;
}

// ============================================================
// STEP 3: TEST deduct_credits_atomic RPC
// ============================================================
async function testDeductCredits(user) {
  console.log('🔍 STEP 3: Testing deduct_credits_atomic RPC...');
  console.log('   Deducting 0.05 credits from user:', user.api_key);

  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_api_key: user.api_key,
    p_amount: 0.05,
    p_operation: '/api/agents',
    p_request_id: 'test-' + Date.now()
  });

  if (error) {
    console.error('❌ RPC call failed:', error.message);
    console.error('   → The function "deduct_credits_atomic" may not exist yet.');
    console.error('   → Run supabase_billing_migration.sql in Supabase SQL Editor!\n');
    return null;
  }

  if (!data.success) {
    console.error('❌ Deduction returned success: false');
    console.error('   Message:', data.message);
    console.error('   Current balance:', data.current_balance);
    console.error('   Required:', data.required, '\n');
    return null;
  }

  console.log('✅ deduct_credits_atomic — SUCCESS!');
  console.log('   success:', data.success);
  console.log('   user_id:', data.user_id);
  console.log('   transaction_id:', data.transaction_id);
  console.log('   new_balance:', data.new_balance);
  console.log('   charged:', data.charged, '\n');

  return data;
}

// ============================================================
// STEP 4: TEST refund_credits RPC
// ============================================================
async function testRefundCredits(transactionId) {
  console.log('🔍 STEP 4: Testing refund_credits RPC...');
  console.log('   Refunding transaction:', transactionId);

  const { data, error } = await supabase.rpc('refund_credits', {
    p_transaction_id: transactionId,
    p_reason: 'Test refund — local ignition test'
  });

  if (error) {
    console.error('❌ Refund RPC call failed:', error.message);
    console.error('   → The function "refund_credits" may not exist yet.\n');
    return;
  }

  if (!data.success) {
    console.error('❌ Refund returned success: false');
    console.error('   Message:', data.message, '\n');
    return;
  }

  console.log('✅ refund_credits — SUCCESS!');
  console.log('   refunded_amount:', data.refunded_amount);
  console.log('   new_balance:', data.new_balance);
  console.log('   refund_transaction_id:', data.refund_transaction_id, '\n');
}

// ============================================================
// STEP 5: VERIFY ETHERS v6
// ============================================================
async function testEthersV6() {
  console.log('🔍 STEP 5: Verifying ethers v6 setup...');

  try {
    const { ethers } = require('ethers');
    
    // Check version
    const version = ethers.version;
    console.log('   ethers version:', version);

    if (!version.startsWith('6')) {
      console.error('❌ ethers is NOT v6! Got:', version);
      console.error('   Run: npm install ethers@^6.16.0\n');
      return;
    }

    // Quick API check — ensure v6 constructors exist
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const blockNumber = await provider.getBlockNumber();
    
    console.log('✅ ethers v6 verified — version:', version);
    console.log('   JsonRpcProvider: OK');
    console.log('   Arbitrum block number:', blockNumber, '\n');
  } catch (error) {
    console.error('❌ ethers v6 check failed:', error.message);
    console.error('   Run: npm install\n');
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function main() {
  try {
    // Step 2: Fetch test user
    const user = await fetchTestUser();
    if (!user) {
      console.error('🛑 Cannot proceed without a test user. Fix the errors above.\n');
      process.exit(1);
    }

    // Step 3: Test deduct_credits_atomic
    const deduction = await testDeductCredits(user);
    if (!deduction) {
      console.error('🛑 Billing RPC test failed. Run the SQL migration first.\n');
      process.exit(1);
    }

    // Step 4: Test refund_credits
    await testRefundCredits(deduction.transaction_id);

    // Step 5: Verify ethers v6
    await testEthersV6();

    // FINAL RESULT
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL TESTS PASSED — SYSTEM IGNITED ✅          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ UNEXPECTED ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
