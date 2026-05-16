#!/usr/bin/env node
/**
 * GXEON Flow Test Agent
 * 
 * Valida o fluxo completo: Blockchain (Sepolia) -> Supabase -> Dashboard
 * Este agente verifica se todas as peças da engrenagem estão conversando.
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' }); // Fallback for local overrides

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// Create fresh Supabase client to avoid schema cache issues
const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Contract Configuration
const CONTRACT_ADDRESS = '0x3955d559055DadB7067054cB6E6f974710345224';
const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'userId', type: 'bytes32' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

class FlowTestAgent {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    
    if (!supabase) {
      console.error('❌ [FlowAgent] Supabase client not initialized');
      process.exit(1);
    }
  }

  async initialize() {
    console.log('\n🔧 [FlowAgent] Initializing...');
    
    // Initialize provider (Alchemy or fallback)
    console.log(`🔗 [FlowAgent] Connecting to Sepolia: ${this.rpcUrl.replace(/\/v2\/.*/, '/v2/****')}`);
    this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
    
    // Verify connection
    const network = await this.provider.getNetwork();
    console.log(`✅ [FlowAgent] Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Initialize contract
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    console.log(`📄 [FlowAgent] Contract loaded: ${CONTRACT_ADDRESS}`);
  }

  async checkContractBalance() {
    console.log('\n💰 [FlowAgent] Checking contract balance...');
    
    try {
      // Get contract ETH balance
      const balanceWei = await this.provider.getBalance(CONTRACT_ADDRESS);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      
      console.log(`💰 [FlowAgent] Contract Balance: ${balanceEth} ETH (${balanceWei.toString()} wei)`);
      
      return {
        balanceWei: balanceWei.toString(),
        balanceEth: parseFloat(balanceEth),
        hasBalance: balanceWei.gt(0)
      };
    } catch (error) {
      console.error('❌ [FlowAgent] Failed to check balance:', error.message);
      throw error;
    }
  }

  async insertSystemLog(balanceData) {
    console.log('\n📝 [FlowAgent] Inserting system log to Supabase...');
    
    const timestamp = new Date().toISOString();
    
    // Criar cliente fresh para evitar schema cache desatualizado
    const { createClient } = require('@supabase/supabase-js');
    const freshSupabase = createClient(
      process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Payload minimalista - apenas action_type (coluna obrigatória)
    const logPayload = {
      action_type: JSON.stringify({
        type: 'FLOW_TEST',
        message: balanceData.hasBalance 
          ? 'Fluxo GXeon Ativo: Saldo Detectado' 
          : 'Fluxo GXeon: Contrato sem saldo',
        balance_eth: balanceData.balanceEth,
        balance_wei: balanceData.balanceWei,
        contract_address: CONTRACT_ADDRESS,
        network: 'sepolia',
        chain_id: 11155111,
        timestamp: new Date().toISOString(),
        flow_test: true
      })
    };

    try {
      console.log('🔍 [FlowAgent] Supabase config check:');
      console.log('   URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
      console.log('   KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : '❌ Missing');
      
      const { data, error } = await freshSupabase
        .from('audit_logs')
        .insert(logPayload);

      if (error) {
        console.error('🔴 [FlowAgent] Supabase error details:', JSON.stringify(error, null, 2));
        throw new Error(`Supabase insert failed: ${error.message} (code: ${error.code})`);
      }

      console.log('✅ [FlowAgent] Log inserted successfully');
      return { id: 'unknown', inserted: true };
    } catch (error) {
      console.error('❌ [FlowAgent] Failed to insert log:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║      🚀 GXEON FLOW TEST AGENT v1.0                     ║');
    console.log('║      Blockchain → Supabase → Dashboard                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    try {
      // Step 1: Initialize connections
      await this.initialize();
      
      // Step 2: Check blockchain
      const balanceData = await this.checkContractBalance();
      
      // Step 3: Store result in Supabase
      const logRecord = await this.insertSystemLog(balanceData);
      
      // Step 4: Summary
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║                    ✅ FLUXO COMPLETO OK              ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`   Contract: ${CONTRACT_ADDRESS}`);
      console.log(`   Balance: ${balanceData.balanceEth} ETH`);
      console.log(`   Log ID: ${logRecord.id}`);
      console.log(`   Timestamp: ${logRecord.created_at}`);
      console.log('\n📊 O Dashboard deve receber notificação via Realtime!\n');
      
      return {
        success: true,
        balance: balanceData,
        log: logRecord
      };
      
    } catch (error) {
      console.error('\n❌ [FlowAgent] Test failed:', error.message);
      
      // Insert failure log
      try {
        await supabase.from('audit_logs').insert({
          level: 'error',
          module: 'FlowTestAgent',
          message: 'Fluxo GXeon Falhou: ' + error.message,
          metadata: { error: error.message, stack: error.stack },
          notification_type: 'system_alert',
          priority: 'critical',
          requires_action: true
        });
      } catch (logError) {
        console.error('❌ [FlowAgent] Could not log failure:', logError.message);
      }
      
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new FlowTestAgent();
  agent.run().then(result => {
    console.log('[FlowAgent] Test completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('[FlowAgent] Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { FlowTestAgent };
