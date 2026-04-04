// GXEON Edge Functions
// Supabase Edge Functions implementation

const { createClient } = require('@supabase/supabase-js');

// Lazily-initialized Supabase client — created on first use so the module
// can be loaded even when credentials are not yet configured.
let _supabase = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  _supabase = createClient(supabaseUrl, supabaseKey);
  return _supabase;
}

// ==========================================
// Edge Function: execute_task
// ==========================================
async function executeTaskEdgeFunction(req, res) {
  try {
    const { agent, task_name, payload, user_id } = req.body;
    
    if (!agent || !task_name) {
      return res.status(400).json({ 
        error: 'Missing required parameters: agent, task_name' 
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase is not configured. Set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY.',
        status: 'unavailable'
      });
    }
    
    // Log task start
    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        agent,
        task_name,
        payload: payload || {},
        status: 'running',
        user_id: user_id || null
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Execute based on agent type
    let result;
    switch (agent) {
      case 'orchestrator':
        result = await executeOrchestrator(task_name, payload);
        break;
      case 'wallet':
        result = await executeWalletAction(task_name, payload);
        break;
      case 'ai_huggingface':
        result = await executeHuggingFace(task_name, payload);
        break;
      case 'ai_deepseek':
        result = await executeDeepSeek(task_name, payload);
        break;
      case 'ai_grok':
        result = await executeGrok(task_name, payload);
        break;
      case 'ai_chatgpt':
        result = await executeChatGPT(task_name, payload);
        break;
      case 'microtask':
        result = await executeMicrotask(task_name, payload);
        break;
      default:
        result = { message: `Task ${task_name} executed by ${agent}` };
    }
    
    // Update task with result
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);
    
    if (updateError) throw updateError;
    
    // Log event
    await supabase.from('logs').insert({
      module: 'edge_functions',
      action: 'execute_task',
      message: `Task ${task_name} completed by ${agent}`,
      metadata: { task_id: task.id, agent, result }
    });
    
    return res.json({
      success: true,
      task_id: task.id,
      status: 'completed',
      result
    });
    
  } catch (error) {
    console.error('execute_task error:', error);
    return res.status(500).json({
      error: error.message,
      status: 'failed'
    });
  }
}

// ==========================================
// Edge Function: register_payment
// ==========================================
async function registerPaymentEdgeFunction(req, res) {
  try {
    const { user_id, amount, currency, tx_hash } = req.body;
    
    if (!user_id || !amount) {
      return res.status(400).json({
        error: 'Missing required parameters: user_id, amount'
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase is not configured. Set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY.',
        status: 'unavailable'
      });
    }
    
    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Register payment
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id,
        amount,
        currency: currency || 'ETH',
        tx_hash: tx_hash || null,
        status: tx_hash ? 'confirmed' : 'pending'
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Log payment
    await supabase.from('logs').insert({
      module: 'payments',
      action: 'register',
      message: `Payment registered: ${amount} ${currency || 'ETH'}`,
      metadata: { payment_id: payment.id, user_id, amount, tx_hash }
    });
    
    return res.json({
      success: true,
      payment_id: payment.id,
      status: payment.status,
      message: 'Payment registered successfully'
    });
    
  } catch (error) {
    console.error('register_payment error:', error);
    return res.status(500).json({
      error: error.message,
      status: 'failed'
    });
  }
}

// ==========================================
// Edge Function: log_event
// ==========================================
async function logEventEdgeFunction(req, res) {
  try {
    const { module, action, message, metadata } = req.body;
    
    if (!module || !action || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: module, action, message'
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        error: 'Supabase is not configured. Set SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY.',
        status: 'unavailable'
      });
    }
    
    const { data: log, error } = await supabase
      .from('logs')
      .insert({
        module,
        action,
        message,
        metadata: metadata || {}
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return res.json({
      success: true,
      log_id: log.id,
      status: 'logged',
      message: 'Event logged successfully'
    });
    
  } catch (error) {
    console.error('log_event error:', error);
    return res.status(500).json({
      error: error.message,
      status: 'failed'
    });
  }
}

// ==========================================
// Agent Executors
// ==========================================
async function executeOrchestrator(taskName, payload) {
  return {
    orchestrated: true,
    task: taskName,
    agents: ['wallet', 'microtasks', 'contracts'],
    timestamp: new Date().toISOString()
  };
}

async function executeWalletAction(taskName, payload) {
  const walletAddress = process.env.WEB3_WALLET_ADDRESS;
  return {
    wallet_connected: !!walletAddress,
    address: walletAddress,
    action: taskName,
    network: process.env.WEB3_NETWORK || 'Ethereum'
  };
}

async function executeHuggingFace(taskName, payload) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey === 'COLOQUE_AQUI') {
    return { error: 'HuggingFace API key not configured' };
  }
  
  return {
    processed: true,
    provider: 'huggingface',
    model: payload.model || 'default',
    task: taskName
  };
}

async function executeDeepSeek(taskName, payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'COLOQUE_AQUI') {
    return { error: 'DeepSeek API key not configured' };
  }
  
  return {
    processed: true,
    provider: 'deepseek',
    task: taskName
  };
}

async function executeGrok(taskName, payload) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey || apiKey === 'COLOQUE_AQUI') {
    return { error: 'Grok API key not configured' };
  }
  
  return {
    processed: true,
    provider: 'grok',
    task: taskName
  };
}

async function executeChatGPT(taskName, payload) {
  const apiKey = process.env.CHATGPT_API_KEY;
  if (!apiKey || apiKey === 'COLOQUE_AQUI') {
    return { error: 'ChatGPT API key not configured' };
  }
  
  return {
    processed: true,
    provider: 'chatgpt',
    task: taskName
  };
}

async function executeMicrotask(taskName, payload) {
  if (process.env.MICROTASKS_ENABLED !== 'true') {
    return { error: 'Microtasks not enabled' };
  }
  
  return {
    microtask_completed: true,
    task: taskName,
    reward: payload.reward || 0.0001,
    currency: 'ETH'
  };
}

// ==========================================
// Export for Express Routes
// ==========================================
module.exports = {
  executeTaskEdgeFunction,
  registerPaymentEdgeFunction,
  logEventEdgeFunction,
  // Direct execution functions
  executeOrchestrator,
  executeWalletAction,
  executeHuggingFace,
  executeDeepSeek,
  executeGrok,
  executeChatGPT,
  executeMicrotask
};
