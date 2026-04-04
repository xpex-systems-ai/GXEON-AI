/**
 * GXEON Railway Startup Validator
 * Validates environment, dependencies, and database connection before starting
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

const { createClient } = require('@supabase/supabase-js');

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WEB3_WALLET_ADDRESS'
];

const OPTIONAL_ENV_VARS = [
  'OPENROUTER_API_KEY',
  'HUGGINGFACE_API_KEY',
  'GROK_API_KEY',
  'DEEPSEEK_API_KEY',
  'CHATGPT_API_KEY',
  'BITENSOR_API_KEY'
];

async function validateEnvironment() {
  console.log('\n🔍 [GXEON] Railway Startup Validation\n');
  
  const missing = [];
  const present = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    } else {
      present.push(envVar);
    }
  }
  
  console.log('✅ Required env vars present:', present.length);
  present.forEach(v => console.log(`   ✓ ${v}`));
  
  if (missing.length > 0) {
    console.error('\n❌ Missing required env vars:');
    missing.forEach(v => console.error(`   ✗ ${v}`));
    console.error('\n📝 Set these in Railway Dashboard → Variables');
    process.exit(1);
  }
  
  // Check optional vars
  const optionalPresent = OPTIONAL_ENV_VARS.filter(v => process.env[v]);
  console.log(`\nℹ️  Optional AI APIs configured: ${optionalPresent.length}/${OPTIONAL_ENV_VARS.length}`);
  
  return true;
}

async function validateDatabase() {
  console.log('\n🔌 Testing Supabase connection...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data, error } = await supabase.from('tasks').select('count', { count: 'exact' });
    
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    console.log(`   📊 Tasks table accessible`);
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  }
}

async function validateModules() {
  console.log('\n📦 Loading core modules...');
  
  const modules = [
    'execution_agent.js',
    'reward_engine.js',
    'payment_engine.js',
    'marketplace_engine.js',
    'ai_decision_engine.js',
    'task_generator_ai.js',
    'agent_orchestrator.js'
  ];
  
  for (const mod of modules) {
    try {
      require(`./${mod}`);
      console.log(`   ✓ ${mod}`);
    } catch (err) {
      console.error(`   ✗ ${mod}: ${err.message}`);
      process.exit(1);
    }
  }
  
  console.log(`\n✅ All ${modules.length} modules loaded successfully`);
  return true;
}

async function runValidation() {
  try {
    await validateEnvironment();
    await validateDatabase();
    await validateModules();
    
    console.log('\n🚀 [GXEON] Railway startup validation complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Validation failed:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { validateEnvironment, validateDatabase, validateModules };
