#!/usr/bin/env node
/**
 * Keeper Executor Agent - GXeon Sniper
 * 
 * Listens to Supabase Realtime for keeper_rewards INSERTS with status 'detected'
 * Simulates execution by updating status to 'executed' with mock tx_hash
 * 
 * SAFETY: This is a TEST PHASE - no real gas is spent
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

class KeeperExecutorAgent {
  constructor() {
    this.supabase = null;
    this.channel = null;
    this.isRunning = false;
    this.processedTasks = new Set();
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🔫 KEEPER EXECUTOR AGENT v1.0                      ║');
    console.log('║     Sniper Mode: Realtime Execution Listener           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    console.log('✅ Supabase client initialized');
    console.log(`   URL: ${supabaseUrl}`);
    console.log('');
  }

  /**
   * Start listening for new opportunities via Realtime
   */
  async startListening() {
    console.log('🔌 Connecting to Realtime...');
    
    // Create Realtime channel for keeper_rewards
    this.channel = this.supabase
      .channel('keeper-executor-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'keeper_rewards',
          filter: 'status=eq.detected'
        },
        (payload) => {
          this.handleNewOpportunity(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`   📡 Realtime subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log('');
          console.log('🎯 Sniper Executor Online: Aguardando alvos do Scanner...');
          console.log('   👀 Monitorando INSERTS na tabela keeper_rewards');
          console.log('   🔍 Filtro: status = "detected"');
          console.log('');
          this.isRunning = true;
        }
      });

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Executor shutting down...');
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Executor terminating...');
      this.cleanup();
      process.exit(0);
    });

    // Prevent process from exiting
    setInterval(() => {
      if (this.isRunning) {
        // Heartbeat to keep connection alive
      }
    }, 30000);
  }

  /**
   * Handle new opportunity detected
   */
  async handleNewOpportunity(opportunity) {
    const { id, task_id, net_profit_usd, network, protocol } = opportunity;
    
    // Prevent duplicate processing
    if (this.processedTasks.has(id)) {
      return;
    }
    this.processedTasks.add(id);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     🎯 ALVO DETECTADO - EXECUTANDO SNIPER              ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`   📋 Task ID: ${task_id}`);
    console.log(`   💰 Lucro Esperado: $${net_profit_usd} USD`);
    console.log(`   🌐 Network: ${network}`);
    console.log(`   🔧 Protocol: ${protocol}`);
    console.log('');

    // Simulate execution authorization
    console.log(`🔫 Disparo de execução autorizado para Task [${task_id}]. Lucro esperado: $${net_profit_usd}`);
    
    // Generate mock transaction hash
    const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Simulate execution delay (2 seconds)
    await this.sleep(2000);
    
    console.log(`   ⛽ Simulando transação...`);
    console.log(`   📝 Mock TX Hash: ${mockTxHash.substring(0, 20)}...`);
    
    // Update Supabase status
    try {
      const { data, error } = await this.supabase
        .from('keeper_rewards')
        .update({
          status: 'executed',
          tx_hash: mockTxHash,
          executed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error(`   ❌ Erro ao atualizar status: ${error.message}`);
        return;
      }

      console.log(`   ✅ Status atualizado para 'executed'`);
      console.log(`   💾 TX Hash salvo no banco`);
      console.log('');
      console.log('   🎉 Execução simulada concluída!');
      console.log('   ⚠️  MODO TESTE: Nenhum gás real foi gasto');
      console.log('');

      // Log to audit_logs
      await this.logExecution(task_id, net_profit_usd, mockTxHash, network);

    } catch (error) {
      console.error(`   ❌ Erro na execução: ${error.message}`);
    }
  }

  /**
   * Log execution to audit_logs
   */
  async logExecution(taskId, profitUsd, txHash, network) {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          level: 'info',
          module: 'KeeperExecutor',
          message: `Execução simulada concluída: Task ${taskId} - Lucro $${profitUsd} USD`,
          metadata: {
            task_id: taskId,
            net_profit_usd: profitUsd,
            tx_hash: txHash,
            network: network,
            mode: 'SIMULATION',
            gas_spent: 0
          },
          notification_type: 'execution_complete',
          priority: profitUsd > 1 ? 'high' : 'medium',
          requires_action: false
        });

      if (!error) {
        console.log(`   📝 Execução logada no audit_logs`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Falha ao logar: ${error.message}`);
    }
  }

  /**
   * Utility: Sleep for ms milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      console.log('   📴 Realtime channel closed');
    }
    console.log('   👋 Executor offline');
  }

  /**
   * Main run loop
   */
  async run() {
    try {
      await this.initialize();
      await this.startListening();
      
      // Keep running indefinitely
      while (true) {
        await this.sleep(60000); // Heartbeat every minute
        if (this.isRunning) {
          console.log(`[${new Date().toISOString()}] 💓 Heartbeat: Executor alive - ${this.processedTasks.size} tarefas processadas`);
        }
      }
    } catch (error) {
      console.error('\n❌ Executor failed:', error.message);
      
      // Log error
      try {
        await this.supabase?.from('audit_logs').insert({
          level: 'error',
          module: 'KeeperExecutor',
          message: 'Executor falhou: ' + error.message,
          metadata: { error: error.message, stack: error.stack },
          notification_type: 'system_alert',
          priority: 'critical',
          requires_action: true
        });
      } catch (logError) {
        console.error('Could not log failure:', logError.message);
      }
      
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new KeeperExecutorAgent();
  agent.run().catch(error => {
    console.error('[KeeperExecutor] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { KeeperExecutorAgent };
