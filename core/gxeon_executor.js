// GXEON Executor V1 - Task Automation Engine
// Executes tasks in a loop with configurable steps

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

class GXEONExecutor {
  constructor(config) {
    this.config = config;
    this.isRunning = false;
    this.intervalId = null;
    this.context = {}; // Stores variables like {{task.id}}, {{ai.response}}
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey)
      : null;
  }

  // Template variable substitution
  substituteTemplate(str, additionalContext = {}) {
    const mergedContext = { ...this.context, ...additionalContext };
    return str.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const keys = path.split('.');
      let value = mergedContext;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return match;
      }
      return value;
    });
  }

  // Execute a single step
  async executeStep(step) {
    console.log(`[GXEON Executor] Executing step: ${step.action}`);
    
    switch (step.action) {
      case 'fetch_task':
        return await this.fetchTask(step);
      case 'update_status':
        return await this.updateStatus(step);
      case 'call_ai':
        return await this.callAI(step);
      case 'save_result':
        return await this.saveResult(step);
      case 'log':
        return await this.logStep(step);
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  // Fetch pending task from database
  async fetchTask(step) {
    if (!this.supabase) {
      console.log('[GXEON Executor] No Supabase connection, simulating task fetch');
      // Return null to skip processing when no DB
      this.context.task = null;
      return { success: true, task: null };
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Fetch task failed: ${error.message}`);
    }

    if (data) {
      this.context.task = data;
      console.log(`[GXEON Executor] Found task: ${data.id}`);
      return { success: true, task: data };
    } else {
      this.context.task = null;
      return { success: true, task: null };
    }
  }

  // Update task status
  async updateStatus(step) {
    if (!this.supabase) {
      console.log('[GXEON Executor] No Supabase connection, skipping status update');
      return { success: true };
    }

    if (!this.context.task) {
      console.log('[GXEON Executor] No task in context, skipping status update');
      return { success: true };
    }

    const query = this.substituteTemplate(step.query);
    // Parse the query to extract status and task ID
    // Expected format: UPDATE tasks SET status = 'running' WHERE id = '...'
    const taskId = this.context.task.id;
    const statusMatch = query.match(/status\s*=\s*'([^']+)'/);
    const newStatus = statusMatch ? statusMatch[1] : 'running';

    const { error } = await this.supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw new Error(`Update status failed: ${error.message}`);
    
    console.log(`[GXEON Executor] Status updated to: ${newStatus}`);
    return { success: true, status: newStatus };
  }

  // Call AI provider
  async callAI(step) {
    const provider = step.provider || 'openrouter';
    const input = this.substituteTemplate(step.input);
    
    console.log(`[GXEON Executor] Calling ${provider} with input: ${input.substring(0, 100)}...`);

    let response;
    
    switch (provider) {
      case 'openrouter':
        response = await this.callOpenRouter(input);
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    this.context.ai = { response };
    console.log(`[GXEON Executor] AI response received: ${response.substring(0, 100)}...`);
    return { success: true, response };
  }

  // OpenRouter API call
  async callOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'GXEON Executor'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response';
  }

  // Save task result
  async saveResult(step) {
    if (!this.supabase) {
      console.log('[GXEON Executor] No Supabase connection, skipping result save');
      return { success: true };
    }

    if (!this.context.task) {
      console.log('[GXEON Executor] No task in context, skipping result save');
      return { success: true };
    }

    const query = this.substituteTemplate(step.query);
    const taskId = this.context.task.id;
    const aiResponse = this.context.ai?.response || '';

    // Parse status from query if present
    const statusMatch = query.match(/status\s*=\s*'([^']+)'/);
    const newStatus = statusMatch ? statusMatch[1] : 'done';

    const { error } = await this.supabase
      .from('tasks')
      .update({
        status: newStatus,
        result: { response: aiResponse, timestamp: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw new Error(`Save result failed: ${error.message}`);
    
    console.log(`[GXEON Executor] Result saved, status: ${newStatus}`);
    return { success: true };
  }

  // Log step completion
  async logStep(step) {
    const message = this.substituteTemplate(step.message);
    console.log(`[GXEON Executor] LOG: ${message}`);

    if (this.supabase) {
      await this.supabase.from('logs').insert({
        module: 'gxeon_executor',
        action: 'task_complete',
        message: message,
        metadata: {
          task_id: this.context.task?.id,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });
    }

    return { success: true, message };
  }

  // Execute full workflow
  async executeWorkflow() {
    console.log('[GXEON Executor] Starting workflow execution...');
    
    try {
      for (const step of this.config.steps) {
        const result = await this.executeStep(step);
        
        // If fetch_task returns no task, skip remaining steps
        if (step.action === 'fetch_task' && !result.task) {
          console.log('[GXEON Executor] No pending tasks found');
          return { success: true, completed: false, reason: 'no_pending_tasks' };
        }
      }
      
      console.log('[GXEON Executor] Workflow completed successfully');
      return { success: true, completed: true };
    } catch (error) {
      console.error('[GXEON Executor] Workflow failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Start the executor loop
  start() {
    if (this.isRunning) {
      console.log('[GXEON Executor] Already running');
      return;
    }

    this.isRunning = true;
    const interval = (this.config.interval_seconds || 5) * 1000;
    
    console.log(`[GXEON Executor] Starting loop with ${interval}ms interval`);
    
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) return;
      
      // Reset context for each iteration
      this.context = {};
      
      await this.executeWorkflow();
    }, interval);

    // Execute immediately on start
    this.executeWorkflow();
  }

  // Stop the executor loop
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[GXEON Executor] Stopped');
  }

  // Execute single run (for testing)
  async runOnce() {
    this.context = {};
    return await this.executeWorkflow();
  }
}

// Default configuration matching the request
const defaultConfig = {
  module: "gxeon_executor_v1",
  loop: true,
  interval_seconds: 5,
  steps: [
    {
      action: "fetch_task",
      query: "SELECT * FROM tasks WHERE status = 'pending' LIMIT 1"
    },
    {
      action: "update_status",
      query: "UPDATE tasks SET status = 'running' WHERE id = '{{task.id}}'"
    },
    {
      action: "call_ai",
      provider: "openrouter",
      input: "{{task.payload.prompt}}"
    },
    {
      action: "save_result",
      query: "UPDATE tasks SET status = 'done', result = '{{ai.response}}' WHERE id = '{{task.id}}'"
    },
    {
      action: "log",
      message: "Task {{task.id}} executada com sucesso"
    }
  ]
};

// Export for use
module.exports = { GXEONExecutor, defaultConfig };

// Standalone execution
if (require.main === module) {
  const executor = new GXEONExecutor(defaultConfig);
  console.log('[GXEON Executor] Starting in standalone mode...');
  executor.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[GXEON Executor] Shutting down...');
    executor.stop();
    process.exit(0);
  });
}
