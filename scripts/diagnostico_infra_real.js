/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DIAGNÓSTICO DE INFRAESTRUTURA REAL
 * Verifica se os 3 pontos críticos estão online
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

console.clear();
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔍 DIAGNÓSTICO DE INFRAESTRUTURA — GXEON CORNIX');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
console.log('');

const diagnostico = {
  env: { status: 'CHECKING', errors: [] },
  supabase: { status: 'CHECKING', errors: [] },
  schema: { status: 'CHECKING', errors: [] },
  server: { status: 'CHECKING', errors: [] }
};

async function checkEnv() {
  console.log('🧪 CHECANDO VARIÁVEIS DE AMBIENTE...');
  console.log('───────────────────────────────────────────────────────────────────────────');
  
  const required = [
    'SUPABASE_PROJECT_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INTERNAL_API_KEY'
  ];
  
  let allPresent = true;
  
  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      console.log(`   ❌ ${key}: NÃO DEFINIDO`);
      diagnostico.env.errors.push(`${key} ausente`);
      allPresent = false;
    } else if (value.includes('your-') || value.includes('placeholder') || value.length < 20) {
      console.log(`   ⚠️  ${key}: PARECE PLACEHOLDER (${value.substring(0, 30)}...)`);
      diagnostico.env.errors.push(`${key} parece ser placeholder`);
      allPresent = false;
    } else {
      console.log(`   ✅ ${key}: OK (${value.substring(0, 25)}...)`);
    }
  }
  
  diagnostico.env.status = allPresent ? 'OK' : 'FAIL';
  console.log('');
}

async function checkSupabase() {
  console.log('🧪 CHECANDO CONEXÃO SUPABASE...');
  console.log('───────────────────────────────────────────────────────────────────────────');
  
  const url = process.env.SUPABASE_PROJECT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.log('   ❌ Credenciais não disponíveis');
    diagnostico.supabase.status = 'FAIL';
    diagnostico.supabase.errors.push('Credenciais ausentes');
    console.log('');
    return;
  }
  
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('cornix_signals').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Tabela cornix_signals NÃO EXISTE');
        console.log('   💀 SCHEMA SQL NÃO FOI EXECUTADO!');
        diagnostico.supabase.status = 'FAIL';
        diagnostico.schema.status = 'FAIL';
        diagnostico.supabase.errors.push('Tabela cornix_signals não existe');
        diagnostico.schema.errors.push('Schema SQL não executado');
      } else if (error.message.includes('fetch failed') || error.message.includes('Network')) {
        console.log('   ❌ Erro de rede/conexão');
        console.log(`   🔌 URL: ${url}`);
        diagnostico.supabase.status = 'FAIL';
        diagnostico.supabase.errors.push('Erro de conexão: ' + error.message);
      } else {
        console.log(`   ❌ Erro: ${error.message}`);
        diagnostico.supabase.status = 'FAIL';
        diagnostico.supabase.errors.push(error.message);
      }
    } else {
      console.log('   ✅ Conexão Supabase OK');
      console.log(`   📊 Tabela cornix_signals existe`);
      diagnostico.supabase.status = 'OK';
      
      // Verificar outras tabelas
      const tabelas = [
        'cornix_signal_access',
        'pix_payments',
        'cornix_performance',
        'cornix_leaderboard'
      ];
      
      for (const tabela of tabelas) {
        const { error: tableError } = await supabase.from(tabela).select('count', { count: 'exact', head: true });
        if (tableError) {
          console.log(`   ❌ Tabela ${tabela}: ${tableError.message}`);
          diagnostico.schema.errors.push(`${tabela} não existe`);
        } else {
          console.log(`   ✅ Tabela ${tabela}: OK`);
        }
      }
      
      diagnostico.schema.status = diagnostico.schema.errors.length === 0 ? 'OK' : 'PARTIAL';
    }
  } catch (error) {
    console.log(`   ❌ Erro crítico: ${error.message}`);
    diagnostico.supabase.status = 'FAIL';
    diagnostico.supabase.errors.push('Erro crítico: ' + error.message);
  }
  
  console.log('');
}

async function checkServer() {
  console.log('🧪 CHECANDO SERVIDOR LOCAL...');
  console.log('───────────────────────────────────────────────────────────────────────────');
  
  try {
    // Verificar se servidor responde
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://localhost:3000/v1/signals/health', {
      signal: controller.signal
    }).catch(() => null);
    
    clearTimeout(timeout);
    
    if (response && response.ok) {
      const data = await response.json();
      console.log('   ✅ Servidor respondendo em localhost:3000');
      console.log(`   📦 Status: ${data.status}`);
      console.log(`   🎯 Sinais ativos: ${data.active_signals || 'N/A'}`);
      diagnostico.server.status = 'OK';
    } else {
      console.log('   ❌ Servidor NÃO está rodando em localhost:3000');
      console.log('   📝 Execute: npm run dev');
      diagnostico.server.status = 'FAIL';
      diagnostico.server.errors.push('Servidor offline');
    }
  } catch (error) {
    console.log('   ❌ Servidor NÃO está rodando');
    console.log('   📝 Execute: npm run dev');
    diagnostico.server.status = 'FAIL';
    diagnostico.server.errors.push('Servidor offline ou inacessível');
  }
  
  console.log('');
}

async function runDiagnostico() {
  await checkEnv();
  await checkSupabase();
  await checkServer();
  
  // RESUMO
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMO DO DIAGNÓSTICO');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  const statusEmoji = {
    'OK': '✅',
    'FAIL': '❌',
    'PARTIAL': '⚠️',
    'CHECKING': '⏳'
  };
  
  console.log(`${statusEmoji[diagnostico.env.status]} Variáveis de Ambiente: ${diagnostico.env.status}`);
  if (diagnostico.env.errors.length > 0) {
    diagnostico.env.errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('');
  
  console.log(`${statusEmoji[diagnostico.supabase.status]} Conexão Supabase: ${diagnostico.supabase.status}`);
  if (diagnostico.supabase.errors.length > 0) {
    diagnostico.supabase.errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('');
  
  console.log(`${statusEmoji[diagnostico.schema.status]} Schema SQL: ${diagnostico.schema.status}`);
  if (diagnostico.schema.errors.length > 0) {
    diagnostico.schema.errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('');
  
  console.log(`${statusEmoji[diagnostico.server.status]} Servidor Local: ${diagnostico.server.status}`);
  if (diagnostico.server.errors.length > 0) {
    diagnostico.server.errors.forEach(e => console.log(`   - ${e}`));
  }
  console.log('');
  
  // VEREDICTO
  const allOK = diagnostico.env.status === 'OK' && 
                diagnostico.supabase.status === 'OK' && 
                diagnostico.schema.status === 'OK' && 
                diagnostico.server.status === 'OK';
  
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  if (allOK) {
    console.log('🎉 TUDO ONLINE! Sistema pronto para monetização real.');
    console.log('');
    console.log('Próximo passo:');
    console.log('  node scripts/test_real_monetization.js');
  } else {
    console.log('❌ SISTEMA INCOMPLETO — Corrija os erros acima');
    console.log('');
    console.log('🔧 PLANO DE CORREÇÃO:');
    console.log('');
    
    if (diagnostico.env.status !== 'OK') {
      console.log('1. CORRIGIR .env:');
      console.log('   - Abra .env.local ou .env');
      console.log('   - Substitua placeholders por valores reais do Supabase');
      console.log('   - SUPABASE_PROJECT_URL=https://xxxx.supabase.co');
      console.log('   - SUPABASE_SERVICE_ROLE_KEY=eyJ...');
      console.log('');
    }
    
    if (diagnostico.schema.status !== 'OK') {
      console.log('2. EXECUTAR SCHEMA SQL:');
      console.log('   - Acesse: https://app.supabase.com/project/_/sql');
      console.log('   - Cole o conteúdo de: supabase/cornix_signals_schema.sql');
      console.log('   - Clique em "Run"');
      console.log('');
    }
    
    if (diagnostico.server.status !== 'OK') {
      console.log('3. INICIAR SERVIDOR:');
      console.log('   npm run dev');
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('💡 Depois de corrigir, execute este diagnóstico novamente:');
    console.log('   node scripts/diagnostico_infra_real.js');
  }
  
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

runDiagnostico().catch(console.error);
