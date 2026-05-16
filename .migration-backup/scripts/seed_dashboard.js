#!/usr/bin/env node
/**
 * Dashboard Demo Data Seeder
 * 
 * Injects high-quality mock data into Supabase for UI testing
 * Run: node scripts/seed_dashboard.js
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_PROJECT_URL;
                     
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                          
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key if available, otherwise use anon key
const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !apiKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.log('\n💡 Configure seu arquivo .env com:');
  console.log('   SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  console.log('\n   OU para acesso somente leitura:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, apiKey);

// Generate random profit between min and max
function randomProfit(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(4));
}

// Generate random task ID
function generateTaskId() {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

async function seedGelatoTasks() {
  const tasks = [
    {
      task_id: generateTaskId(),
      network: 'polygon',
      reward_amount: randomProfit(1.50, 4.00),
      reward_token: 'MATIC',
      gas_spent_usd: 0,
      net_profit_usd: randomProfit(1.50, 4.00),
      status: 'executed',
      protocol: 'gelato',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
      metadata: {
        gasSponsored: true,
        executorProfit: randomProfit(1.50, 4.00)
      }
    },
    {
      task_id: generateTaskId(),
      network: 'arbitrum',
      reward_amount: randomProfit(2.00, 3.50),
      reward_token: 'ETH',
      gas_spent_usd: 0,
      net_profit_usd: randomProfit(2.00, 3.50),
      status: 'executed',
      protocol: 'gelato',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
      metadata: {
        gasSponsored: true,
        executorProfit: randomProfit(2.00, 3.50)
      }
    }
  ];

  console.log('\n🎯 Injetando tarefas Gelato...');
  
  for (const task of tasks) {
    const { data, error } = await supabase
      .from('keeper_rewards')
      .upsert(task, { onConflict: 'task_id' });

    if (error) {
      console.error(`   ❌ Erro Gelato (${task.network}):`, error.message);
    } else {
      console.log(`   ✅ Gelato ${task.network}: +$${task.net_profit_usd.toFixed(4)}`);
    }
  }
}

async function seedAutonolasTasks() {
  const tasks = [
    {
      task_id: generateTaskId(),
      network: 'base',
      reward_amount: 5.00,
      reward_token: 'ETH',
      gas_spent_usd: 0.50,
      net_profit_usd: 4.50,
      status: 'AI_TASK_DETECTED',
      source: 'Autonolas',
      protocol: 'autonolas',
      created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 min ago
      metadata: {
        ai_capability: 'NLP',
        task_prompt: 'Analise sentimento de tweets sobre criptomoedas e classifique como Bullish ou Bearish'
      },
      resolved_answer: 'Simulação de Inteligência Artificial: Análise de sentimento concluída com viés de alta (Bullish). 78% dos tweets analisados mostram otimismo sobre o mercado crypto nas próximas 24h.'
    },
    {
      task_id: generateTaskId(),
      network: 'gnosis',
      reward_amount: 12.00,
      reward_token: 'xDAI',
      gas_spent_usd: 1.20,
      net_profit_usd: 10.80,
      status: 'AI_TASK_DETECTED',
      source: 'Autonolas',
      protocol: 'autonolas',
      created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 min ago
      metadata: {
        ai_capability: 'PREDICTION',
        task_prompt: 'Preveja o preço do ETH para as próximas 4 horas usando dados on-chain'
      },
      resolved_answer: 'Simulação de Inteligência Artificial: Previsão de preço concluída. Modelo indica alta de 2.3% no ETH nas próximas 4 horas com 67% de confiança. Recomendação: Hold com possível entry em pullback.'
    }
  ];

  console.log('\n🧠 Injetando tarefas Autonolas (AI)...');
  
  for (const task of tasks) {
    const { data, error } = await supabase
      .from('keeper_rewards')
      .upsert(task, { onConflict: 'task_id' });

    if (error) {
      console.error(`   ❌ Erro Autonolas (${task.network}):`, error.message);
    } else {
      console.log(`   ✅ Autonolas ${task.network}: +$${task.net_profit_usd.toFixed(4)} (AI: ${task.metadata.ai_capability})`);
    }
  }
}

async function createTableIfNotExists() {
  console.log('📋 Verificando/criando tabela keeper_rewards...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.keeper_rewards (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      task_id TEXT,
      protocol TEXT,
      network TEXT,
      reward_amount NUMERIC,
      reward_token TEXT,
      gas_spent_usd NUMERIC,
      net_profit_usd NUMERIC,
      tx_hash TEXT,
      status TEXT DEFAULT 'detected',
      source TEXT,
      metadata JSONB DEFAULT '{}',
      resolved_answer TEXT
    );
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      // Try direct query as fallback
      const { error: directError } = await supabase.from('keeper_rewards').select('id').limit(1);
      if (directError && directError.message.includes('does not exist')) {
        console.log('   ⚠️ Tabela não existe. Criando via SQL direto...');
        // Execute raw SQL
        await supabase.sql(createTableSQL);
      }
    }
    console.log('   ✅ Tabela pronta\n');
  } catch (err) {
    console.log('   ⚠️ Verificação de tabela:', err.message);
    // Continue anyway - table might already exist
  }
}

async function seedDashboard() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🌐 GXEON DASHBOARD DEMO DATA SEEDER                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('🔌 Conectando ao Supabase...');
  
  try {
    // Test connection
    const { error: connError } = await supabase.auth.getSession();
    if (connError) {
      console.error('❌ Falha na conexão:', connError.message);
      process.exit(1);
    }
    console.log('✅ Conexão estabelecida com sucesso\n');
    
    // Ensure table exists
    await createTableIfNotExists();

    // Seed data
    await seedGelatoTasks();
    await seedAutonolasTasks();

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ SEED COMPLETO                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Dados injetados:                                          ║');
    console.log('║  • 2 tarefas Gelato (Zero-Gas)                            ║');
    console.log('║  • 2 tarefas Autonolas (AI Processed)                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Acesse: https://gxeon-ai.vercel.app                       ║');
    console.log('║  Navegue: Command Center → Gelato → Autonolas → Logs       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Run seeder
seedDashboard();
