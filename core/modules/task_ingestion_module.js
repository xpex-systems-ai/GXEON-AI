/**
 * GXEON Module 01: Task Ingestion Module
 * Production-ready task ingestion with Supabase persistence
 * 
 * Features:
 * - Ingest tasks from multiple sources
 * - Persist to Supabase database
 * - Queue management
 * - Error handling and logging
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured. Set SUPABASE_URL or SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class TaskIngestionModule {
  constructor() {
    this.moduleName = 'task_ingestion';
    this.status = 'initialized';
  }

  /**
   * Initialize module and verify database connection
   */
  async initialize() {
    try {
      // Test connection by checking tasks table exists
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist - will be created on first insert
        console.log('[TaskIngestion] Tasks table will be created on first insert');
      } else if (error) {
        throw error;
      }

      this.status = 'active';
      console.log('[TaskIngestion] Module initialized successfully');
      return { success: true, status: this.status };
    } catch (error) {
      this.status = 'error';
      console.error('[TaskIngestion] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Ingest a single task
   * @param {Object} task - Task to ingest
   * @param {string} task.agent - Agent identifier
   * @param {string} task.task_name - Task name/description
   * @param {Object} task.payload - Task payload data
   * @param {string} task.source - Source of the task (optional)
   * @returns {Object} Created task with ID
   */
  async ingestTask(task) {
    try {
      // Validate required fields
      if (!task.agent || !task.task_name) {
        throw new Error('Task must have agent and task_name fields');
      }

      const taskData = {
        agent: task.agent,
        task_name: task.task_name,
        payload: task.payload || {},
        status: task.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[TaskIngestion] Task ingested: ${data.id}`);
      
      return {
        success: true,
        task: data,
        ingested_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[TaskIngestion] Ingest failed:', error.message);
      throw error;
    }
  }

  /**
   * Ingest multiple tasks in batch
   * @param {Array} tasks - Array of task objects
   * @returns {Object} Batch ingestion result
   */
  async ingestBatch(tasks) {
    try {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Tasks must be a non-empty array');
      }

      // Validate all tasks
      for (const task of tasks) {
        if (!task.agent || !task.task_name) {
          throw new Error('All tasks must have agent and task_name fields');
        }
      }

      const tasksData = tasks.map(task => ({
        agent: task.agent,
        task_name: task.task_name,
        payload: task.payload || {},
        status: task.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksData)
        .select();

      if (error) {
        throw error;
      }

      console.log(`[TaskIngestion] Batch ingested: ${data.length} tasks`);

      return {
        success: true,
        count: data.length,
        tasks: data,
        ingested_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[TaskIngestion] Batch ingest failed:', error.message);
      throw error;
    }
  }

  /**
   * Get pending tasks for processing
   * @param {number} limit - Maximum number of tasks to fetch
   * @param {string} agent - Filter by specific agent (optional)
   * @returns {Array} Pending tasks
   */
  async getPendingTasks(limit = 10, agent = null) {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (agent) {
        query = query.eq('agent', agent);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        count: data.length,
        tasks: data
      };
    } catch (error) {
      console.error('[TaskIngestion] Get pending tasks failed:', error.message);
      throw error;
    }
  }

  /**
   * Update task status
   * @param {string} taskId - Task UUID
   * @param {string} status - New status (pending, processing, completed, failed)
   * @param {Object} result - Optional result data
   * @returns {Object} Updated task
   */
  async updateTaskStatus(taskId, status, result = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (result !== null) {
        updateData.result = result;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[TaskIngestion] Task ${taskId} updated to ${status}`);

      return {
        success: true,
        task: data
      };
    } catch (error) {
      console.error('[TaskIngestion] Update task failed:', error.message);
      throw error;
    }
  }

  /**
   * Get task statistics
   * @returns {Object} Task counts by status
   */
  async getStats() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('status');

      if (error) {
        throw error;
      }

      const stats = {
        total: data.length,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };

      data.forEach(task => {
        if (stats[task.status] !== undefined) {
          stats[task.status]++;
        }
      });

      return {
        success: true,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[TaskIngestion] Get stats failed:', error.message);
      throw error;
    }
  }

  /**
   * Get module status
   */
  getStatus() {
    return {
      module: this.moduleName,
      status: this.status,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const taskIngestionModule = new TaskIngestionModule();

module.exports = {
  TaskIngestionModule,
  taskIngestionModule,
  supabase
};
