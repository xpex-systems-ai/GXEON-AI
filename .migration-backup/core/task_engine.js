// GXEON Task Engine - Core System
// Captures, validates, and executes tasks from external platforms

const { createRequire } = require('module');
const path = require('path');
const serverRequire = createRequire(path.resolve(__dirname, '../server/index.js'));
const { createClient } = serverRequire('@supabase/supabase-js');
const { getNativeFetch, getSupabaseUrl } = require('../server/runtime/compatibility.cjs');
const fetch = getNativeFetch();
const { GalxeFetcher, ZealyFetcher, Layer3Fetcher } = require('./external_fetchers');
const { SmartPriorityEngine } = require('./smart_priority_engine');
const { OnchainExecutor } = require('./onchain_executor');
const { AutorunWatchdog } = require('./autorun_watchdog');

class GXEONTaskEngine {
  constructor(config = {}) {
    this.config = {
      loopInterval: config.loopInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      batchSize: config.batchSize || 10,
      ...config
    };
    
    this.isRunning = false;
    this.intervalId = null;
    this.agents = new Map();
    
    // Initialize Supabase
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey)
      : null;
    
    // Initialize Smart Priority Engine
    this.priorityEngine = new SmartPriorityEngine({
      minRewardThreshold: 0.1,
      excludeTypes: ['only_social_no_reward']
    });
    
    // Initialize Onchain Executor
    this.onchainExecutor = new OnchainExecutor({
      maxAmountPerTx: 0.001,
      requireBalanceCheck: true,
      failOnError: true
    });
    
    // Initialize Autorun Watchdog
    this.watchdog = new AutorunWatchdog(this, {
      engineLoop: {
        enabled: true,
        intervalMs: 60000,
        maxParallelTasks: 2
      },
      executionControl: {
        cooldownBetweenTasksMs: 30000,
        maxTasksPerCycle: 3,
        skipIfRunning: true
      },
      watchdog: {
        enabled: true,
        heartbeatIntervalMs: 15000,
        restartOnFailure: true,
        maxFailures: 5
      },
      retryStrategy: {
        enabled: true,
        maxRetries: 2,
        retryDelayMs: 10000,
        retryOn: ['network_error', 'timeout', 'rpc_error']
      },
      failsafe: {
        maxTxPerHour: 10,
        maxValuePerHour: 0.005,
        autoPauseOnLimit: true
      },
      logging: {
        level: 'info',
        storeErrors: true,
        storeExecutionHistory: true
      }
    });
    
    // Initialize external fetchers
    this.fetchers = {
      galxe: new GalxeFetcher(),
      zealy: new ZealyFetcher(),
      layer3: new Layer3Fetcher()
    };
    
    // Register default agents
    this.registerAgent('social_agent', new SocialAgent());
    this.registerAgent('onchain_agent', new OnchainAgent(this.onchainExecutor));
    this.registerAgent('api_agent', new APIAgent());
  }
  
  registerAgent(agentId, agentInstance) {
    this.agents.set(agentId, agentInstance);
    console.log(`[TaskEngine] Agent registered: ${agentId}`);
  }
  
  // ==================== WATCHDOG CONTROL ====================
  
  startWatchdog() {
    if (this.watchdog) {
      this.watchdog.start();
      console.log('[TaskEngine] Watchdog started');
    }
  }
  
  stopWatchdog() {
    if (this.watchdog) {
      this.watchdog.stop();
      console.log('[TaskEngine] Watchdog stopped');
    }
  }
  
  getWatchdogStatus() {
    if (!this.watchdog) {
      return { error: 'Watchdog not initialized' };
    }
    
    return {
      running: this.watchdog.isRunning,
      health: this.watchdog.getHealthStatus(),
      stats: this.watchdog.getStats()
    };
  }
  
  // ==================== STAGE 1: CAPTURE ====================
  async stage1Capture() {
    console.log('[Stage 1] Starting task capture...');
    
    const sources = [
      { id: 'galxe', fetcher: async () => {
        const rawTasks = await this.fetchers.galxe.fetchCampaigns(10, 5);
        return this.transformGalxeTasks(rawTasks);
      }},
      { id: 'zealy', fetcher: async () => {
        const rawTasks = await this.fetchers.zealy.fetchQuests();
        return rawTasks; // Zealy already returns in correct format
      }},
      { id: 'layer3', fetcher: async () => {
        const rawTasks = await this.fetchers.layer3.fetchQuests();
        return rawTasks; // Layer3 already returns in correct format
      }}
    ];
    
    let capturedCount = 0;
    
    for (const source of sources) {
      try {
        const tasks = await source.fetcher();
        
        for (const task of tasks) {
          const normalized = this.normalizeTask(task, source.id);
          const saved = await this.saveTask(normalized);
          if (saved) capturedCount++;
        }
        
        // Update source stats
        await this.updateSourceStats(source.id, tasks.length);
        
      } catch (error) {
        console.error(`[Stage 1] Error fetching from ${source.id}:`, error.message);
      }
    }
    
    console.log(`[Stage 1] Captured ${capturedCount} new tasks`);
    return capturedCount;
  }
  
  transformGalxeTasks(rawTasks) {
    if (!rawTasks || !Array.isArray(rawTasks)) {
      return [];
    }
    
    return rawTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      reward: task.reward,
      requirements: task.requirements,
      chain: task.chain,
      execution_mode: task.execution?.mode,
      execution_steps: task.execution?.steps
    }));
  }
  
  async fetchGalxe() {
    // Simulated fetch - replace with actual API or scraping
    console.log('[Galxe] Fetching campaigns...');
    
    // Mock data for demonstration
    return [
      {
        id: 'galxe_001',
        title: 'Follow Twitter & RT',
        description: 'Follow @Galxe and retweet the pinned post',
        type: 'social',
        reward: { type: 'points', value: 100, token: null },
        requirements: [
          { action: 'twitter_follow', target: '@Galxe', validation: 'api_check' },
          { action: 'twitter_retweet', target: 'pinned_post', validation: 'api_check' }
        ]
      },
      {
        id: 'galxe_002',
        title: 'Swap on Uniswap',
        description: 'Perform a token swap on Uniswap with minimum $10',
        type: 'onchain',
        reward: { type: 'token', value: 0.005, token: 'ETH' },
        requirements: [
          { action: 'uniswap_swap', target: 'any_token', validation: 'tx_receipt' }
        ]
      }
    ];
  }
  
  async fetchZealy() {
    console.log('[Zealy] Fetching quests...');
    
    return [
      {
        id: 'zealy_001',
        title: 'Join Discord Community',
        description: 'Join the official Discord server',
        type: 'social',
        reward: { type: 'points', value: 50, token: null },
        requirements: [
          { action: 'discord_join', target: 'invite_link', validation: 'api_check' }
        ]
      }
    ];
  }
  
  async fetchLayer3() {
    console.log('[Layer3] Fetching quests...');
    
    return [
      {
        id: 'layer3_001',
        title: 'Bridge to Arbitrum',
        description: 'Bridge any amount to Arbitrum network',
        type: 'onchain',
        reward: { type: 'nft', value: 1, token: 'NFT' },
        requirements: [
          { action: 'bridge', target: 'arbitrum', validation: 'tx_receipt' }
        ]
      }
    ];
  }
  
  normalizeTask(rawTask, source) {
    // Use Smart Priority Engine for scoring
    const taskForScoring = {
      id: rawTask.id,
      title: rawTask.title,
      description: rawTask.description,
      type: rawTask.type,
      reward_value_estimate: rawTask.reward?.value || 0,
      reward: rawTask.reward,
      requirements: rawTask.requirements || [],
      execution_steps: rawTask.execution_steps || [],
      created_at: new Date().toISOString()
    };
    
    // Calculate smart priority score
    const scoring = this.priorityEngine.calculatePriorityScore(taskForScoring);
    
    // Determine execution mode
    let executionMode = rawTask.execution_mode || 'api';
    if (!executionMode) {
      executionMode = 'api';
      if (rawTask.requirements?.some(r => r.action.includes('twitter') || r.action.includes('discord'))) {
        executionMode = 'browser';
      }
    }
    
    // Use Smart Priority Engine to get best agent
    const availableAgents = Array.from(this.agents.keys());
    const assignedAgent = this.priorityEngine.getBestAgent(taskForScoring, availableAgents);
    
    return {
      task_id: `${source}_${rawTask.id}`,
      source: source,
      title: rawTask.title,
      description: rawTask.description,
      type: rawTask.type,
      reward_type: rawTask.reward?.type || 'unknown',
      reward_value_estimate: rawTask.reward?.value || 0,
      reward_priority_score: scoring.priority_score,
      complexity: scoring.complexity,
      success_probability: scoring.success_probability,
      factor_scores: scoring.factor_scores,
      recommendation: scoring.recommendation,
      priority_actions: scoring.actions,
      requirements: rawTask.requirements || [],
      execution_mode: executionMode,
      execution_steps: this.generateExecutionSteps(rawTask),
      wallet_required: rawTask.type === 'onchain',
      assigned_agent: assignedAgent,
      estimated_value: rawTask.reward?.value || 0,
      pipeline_stage: 'stage_1_capture'
    };
  }
  
  generateExecutionSteps(task) {
    const steps = [];
    
    for (const req of task.requirements || []) {
      steps.push({
        step_id: `step_${steps.length + 1}`,
        action: req.action,
        target: req.target,
        validation: req.validation,
        payload: {}
      });
    }
    
    return steps;
  }
  
  async saveTask(task) {
    if (!this.supabase) {
      console.log('[TaskEngine] No Supabase, skipping save:', task.task_id);
      return false;
    }
    
    // Check for duplicates
    const { data: existing } = await this.supabase
      .from('external_tasks')
      .select('id')
      .eq('task_id', task.task_id)
      .single();
    
    if (existing) {
      console.log(`[TaskEngine] Task already exists: ${task.task_id}`);
      return false;
    }
    
    const { data, error } = await this.supabase
      .from('external_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) {
      console.error(`[TaskEngine] Error saving task:`, error.message);
      return false;
    }
    
    console.log(`[TaskEngine] Task saved: ${task.task_id}`);
    return true;
  }
  
  async updateSourceStats(sourceId, count) {
    if (!this.supabase) return;
    
    await this.supabase
      .from('task_sources')
      .update({
        last_fetch_at: new Date().toISOString(),
        tasks_fetched: count
      })
      .eq('source_id', sourceId);
  }
  
  // ==================== STAGE 2: VALIDATION ====================
  async stage2Validation() {
    console.log('[Stage 2] Starting validation...');
    
    if (!this.supabase) return 0;
    
    const { data: tasks, error } = await this.supabase
      .from('external_tasks')
      .select('*')
      .eq('pipeline_stage', 'stage_1_capture')
      .eq('status', 'pending')
      .limit(this.config.batchSize);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('[Stage 2] No tasks to validate');
      return 0;
    }
    
    let validatedCount = 0;
    
    for (const task of tasks) {
      // Validate task
      const isValid = await this.validateTask(task);
      
      if (isValid) {
        await this.supabase
          .from('external_tasks')
          .update({
            pipeline_stage: 'stage_2_validation',
            status: 'queued',
            queued_at: new Date().toISOString()
          })
          .eq('id', task.id);
        
        validatedCount++;
      } else {
        await this.supabase
          .from('external_tasks')
          .update({
            status: 'cancelled',
            pipeline_stage: 'stage_2_validation'
          })
          .eq('id', task.id);
      }
    }
    
    console.log(`[Stage 2] Validated ${validatedCount} tasks`);
    return validatedCount;
  }
  
  async validateTask(task) {
    // Use Smart Priority Engine for filtering
    const filterCheck = this.priorityEngine.shouldProcessTask(task);
    if (!filterCheck.shouldProcess) {
      console.log(`[Validation] Task ${task.task_id} rejected: ${filterCheck.reason}`);
      return false;
    }
    
    // Check if we have a capable agent
    if (!this.agents.has(task.assigned_agent)) {
      console.log(`[Validation] Task ${task.task_id} rejected: no agent available`);
      return false;
    }
    
    return true;
  }
  
  // ==================== STAGE 3: QUEUE ====================
  async stage3Queue() {
    console.log('[Stage 3] Processing queue...');
    
    if (!this.supabase) return 0;
    
    const { data: tasks, error } = await this.supabase
      .from('external_tasks')
      .select('*')
      .eq('pipeline_stage', 'stage_2_validation')
      .eq('status', 'queued')
      .order('reward_priority_score', { ascending: false })
      .limit(this.config.batchSize);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('[Stage 3] No tasks in queue');
      return 0;
    }
    
    let queuedCount = 0;
    
    for (const task of tasks) {
      await this.supabase
        .from('external_tasks')
        .update({
          pipeline_stage: 'stage_3_queue',
          status: 'executing',
          started_at: new Date().toISOString()
        })
        .eq('id', task.id);
      
      queuedCount++;
    }
    
    console.log(`[Stage 3] Queued ${queuedCount} tasks for execution`);
    return queuedCount;
  }
  
  // ==================== STAGE 4: EXECUTION ====================
  async stage4Execution() {
    console.log('[Stage 4] Starting execution...');
    
    if (!this.supabase) return 0;
    
    const { data: tasks, error } = await this.supabase
      .from('external_tasks')
      .select('*')
      .eq('pipeline_stage', 'stage_3_queue')
      .eq('status', 'executing')
      .limit(this.config.batchSize);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('[Stage 4] No tasks to execute');
      return 0;
    }
    
    let executedCount = 0;
    
    for (const task of tasks) {
      try {
        const agent = this.agents.get(task.assigned_agent);
        if (!agent) {
          throw new Error(`Agent ${task.assigned_agent} not found`);
        }
        
        // Execute task
        const result = await agent.execute(task);
        
        if (result.success) {
          await this.supabase
            .from('external_tasks')
            .update({
              pipeline_stage: 'stage_4_execution',
              status: 'completed',
              completed_at: new Date().toISOString(),
              proof_response: JSON.stringify(result)
            })
            .eq('id', task.id);
          
          executedCount++;
        } else {
          throw new Error(result.error || 'Execution failed');
        }
        
      } catch (error) {
        console.error(`[Stage 4] Task ${task.task_id} failed:`, error.message);
        
        // Retry logic
        const newRetryCount = (task.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < (task.max_retries || this.config.maxRetries);
        
        await this.supabase
          .from('external_tasks')
          .update({
            retry_count: newRetryCount,
            last_error: error.message,
            status: shouldRetry ? 'queued' : 'failed',
            pipeline_stage: shouldRetry ? 'stage_2_validation' : 'stage_4_execution'
          })
          .eq('id', task.id);
      }
    }
    
    console.log(`[Stage 4] Executed ${executedCount} tasks`);
    return executedCount;
  }
  
  // ==================== STAGE 5: PROOF ====================
  async stage5Proof() {
    console.log('[Stage 5] Generating proofs...');
    
    if (!this.supabase) return 0;
    
    const { data: tasks, error } = await this.supabase
      .from('external_tasks')
      .select('*')
      .eq('pipeline_stage', 'stage_4_execution')
      .eq('status', 'completed')
      .limit(this.config.batchSize);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('[Stage 5] No tasks to proof');
      return 0;
    }
    
    let proofCount = 0;
    
    for (const task of tasks) {
      // Generate proof based on task type
      const proof = await this.generateProof(task);
      
      await this.supabase
        .from('external_tasks')
        .update({
          pipeline_stage: 'stage_5_proof',
          proof_tx_hash: proof.txHash,
          proof_screenshot: proof.screenshot,
          proof_response: proof.response
        })
        .eq('id', task.id);
      
      proofCount++;
    }
    
    console.log(`[Stage 5] Generated proofs for ${proofCount} tasks`);
    return proofCount;
  }
  
  async generateProof(task) {
    // Simulated proof generation
    return {
      txHash: task.type === 'onchain' ? `0x${Math.random().toString(16).substr(2, 40)}` : null,
      screenshot: task.type === 'social' ? `screenshot_${task.task_id}.png` : null,
      response: JSON.stringify({ executed: true, timestamp: new Date().toISOString() })
    };
  }
  
  // ==================== STAGE 6: STORAGE ====================
  async stage6Storage() {
    console.log('[Stage 6] Finalizing storage...');
    
    if (!this.supabase) return 0;
    
    const { data: tasks, error } = await this.supabase
      .from('external_tasks')
      .select('*')
      .eq('pipeline_stage', 'stage_5_proof')
      .limit(this.config.batchSize);
    
    if (error || !tasks || tasks.length === 0) {
      console.log('[Stage 6] No tasks to finalize');
      return 0;
    }
    
    let storedCount = 0;
    
    for (const task of tasks) {
      // Update source stats
      await this.supabase
        .from('task_sources')
        .update({
          tasks_completed: tasks.length
        })
        .eq('source_id', task.source);
      
      // Mark as fully stored
      await this.supabase
        .from('external_tasks')
        .update({
          pipeline_stage: 'stage_6_storage',
          claimed: true,
          wallet_used: process.env.WEB3_WALLET_ADDRESS
        })
        .eq('id', task.id);
      
      storedCount++;
    }
    
    console.log(`[Stage 6] Stored ${storedCount} tasks`);
    return storedCount;
  }
  
  // ==================== MAIN LOOP ====================
  async runPipeline() {
    console.log('[TaskEngine] Running full pipeline...');
    
    try {
      // Run all stages
      await this.stage1Capture();
      await this.stage2Validation();
      await this.stage3Queue();
      await this.stage4Execution();
      await this.stage5Proof();
      await this.stage6Storage();
      
      console.log('[TaskEngine] Pipeline completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('[TaskEngine] Pipeline error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  start() {
    if (this.isRunning) {
      console.log('[TaskEngine] Already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`[TaskEngine] Starting with ${this.config.loopInterval}ms interval`);
    
    // Run immediately
    this.runPipeline();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.runPipeline();
      }
    }, this.config.loopInterval);
  }
  
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[TaskEngine] Stopped');
  }
  
  // Get stats
  async getStats() {
    if (!this.supabase) {
      return { error: 'No Supabase connection' };
    }
    
    const { data: byStatus, error } = await this.supabase
      .from('external_tasks')
      .select('status, count');
    
    if (error) return { error: error.message };
    
    return {
      isRunning: this.isRunning,
      agents: Array.from(this.agents.keys()),
      byStatus
    };
  }
}

// ==================== AGENT CLASSES ====================

class SocialAgent {
  async execute(task) {
    console.log(`[SocialAgent] Executing: ${task.title}`);
    
    // Simulated execution
    for (const step of task.execution_steps || []) {
      console.log(`  - Step: ${step.action} on ${step.target}`);
      
      // In real implementation, this would use Puppeteer/Playwright
      if (step.action.includes('twitter')) {
        // Simulate Twitter interaction
        await this.simulateDelay(1000);
      }
      if (step.action.includes('discord')) {
        // Simulate Discord interaction
        await this.simulateDelay(1000);
      }
    }
    
    return {
      success: true,
      executed_steps: task.execution_steps?.length || 0,
      timestamp: new Date().toISOString()
    };
  }
  
  simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class OnchainAgent {
  constructor(executor) {
    this.executor = executor;
  }
  
  async execute(task) {
    console.log(`[OnchainAgent] Executing: ${task.title}`);
    
    const results = [];
    let allSuccess = true;
    
    for (const step of task.execution_steps || []) {
      console.log(`  - Step: ${step.action} on ${step.target}`);
      
      try {
        if (this.executor) {
          // Real onchain execution
          const result = await this.executor.executeTaskStep(step, task);
          results.push(result);
          
          if (!result.success) {
            allSuccess = false;
            console.error(`  Step failed: ${result.error}`);
          }
        } else {
          // Simulated execution
          await this.simulateDelay(2000);
          results.push({
            step: step.step_id,
            action: step.action,
            success: true,
            simulated: true
          });
        }
      } catch (error) {
        console.error(`  Step error: ${error.message}`);
        results.push({
          step: step.step_id,
          action: step.action,
          success: false,
          error: error.message
        });
        allSuccess = false;
      }
    }
    
    // Get tx_hash from first successful result
    const txResult = results.find(r => r.tx_hash);
    
    return {
      success: allSuccess,
      tx_hash: txResult?.tx_hash || `0x${Math.random().toString(16).substr(2, 40)}`,
      executed_steps: results.length,
      step_results: results,
      timestamp: new Date().toISOString()
    };
  }
  
  simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class APIAgent {
  async execute(task) {
    console.log(`[APIAgent] Executing: ${task.title}`);
    
    // Simulated API execution
    for (const step of task.execution_steps || []) {
      console.log(`  - Step: ${step.action} on ${step.target}`);
      
      // In real implementation, this would make actual API calls
      await this.simulateDelay(500);
    }
    
    return {
      success: true,
      executed_steps: task.execution_steps?.length || 0,
      timestamp: new Date().toISOString()
    };
  }
  
  simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { GXEONTaskEngine, SocialAgent, OnchainAgent, APIAgent };

// Standalone execution
if (require.main === module) {
  const engine = new GXEONTaskEngine({
    loopInterval: 60000, // 1 minute
    batchSize: 5
  });
  
  engine.start();
  
  process.on('SIGINT', () => {
    console.log('\n[TaskEngine] Shutting down...');
    engine.stop();
    process.exit(0);
  });
}
