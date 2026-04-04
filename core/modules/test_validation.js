/**
 * Validation Test: Task Ingestion Module
 * Tests Supabase connection and module functionality
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { taskIngestionModule } = require('./task_ingestion_module');

async function runValidation() {
  console.log('========================================');
  console.log('GXEON Module 01: Task Ingestion');
  console.log('Validation Test - Production Mode');
  console.log('========================================\n');

  try {
    // Test 1: Module Initialization
    console.log('[TEST 1] Initializing module...');
    const init = await taskIngestionModule.initialize();
    console.log(`✓ Module status: ${init.status}\n`);

    // Test 2: Ingest Single Task
    console.log('[TEST 2] Ingesting single task...');
    const singleTask = await taskIngestionModule.ingestTask({
      agent: 'test_agent',
      task_name: 'validation_test_single',
      payload: { test: true, timestamp: Date.now() }
    });
    console.log(`✓ Task ingested: ${singleTask.task.id}`);
    console.log(`✓ Status: ${singleTask.task.status}\n`);

    // Test 3: Ingest Batch
    console.log('[TEST 3] Ingesting batch tasks...');
    const batchTasks = await taskIngestionModule.ingestBatch([
      {
        agent: 'test_agent',
        task_name: 'validation_batch_1',
        payload: { batch: 1 }
      },
      {
        agent: 'test_agent',
        task_name: 'validation_batch_2',
        payload: { batch: 2 }
      }
    ]);
    console.log(`✓ Batch ingested: ${batchTasks.count} tasks\n`);

    // Test 4: Get Pending Tasks
    console.log('[TEST 4] Fetching pending tasks...');
    const pending = await taskIngestionModule.getPendingTasks(5);
    console.log(`✓ Pending tasks: ${pending.count}\n`);

    // Test 5: Update Task Status
    console.log('[TEST 5] Updating task status...');
    const updated = await taskIngestionModule.updateTaskStatus(
      singleTask.task.id,
      'completed',
      { validation: 'success', timestamp: Date.now() }
    );
    console.log(`✓ Task updated: ${updated.task.status}\n`);

    // Test 6: Get Statistics
    console.log('[TEST 6] Getting statistics...');
    const stats = await taskIngestionModule.getStats();
    console.log(`✓ Total tasks: ${stats.stats.total}`);
    console.log(`✓ Pending: ${stats.stats.pending}`);
    console.log(`✓ Completed: ${stats.stats.completed}\n`);

    // Final Status
    console.log('========================================');
    console.log('✓ ALL TESTS PASSED');
    console.log('========================================');
    console.log('Module 01: Task Ingestion is PRODUCTION READY');
    
    return {
      success: true,
      module: 'task_ingestion',
      tests_passed: 6,
      status: 'production_ready'
    };

  } catch (error) {
    console.error('\n✗ VALIDATION FAILED');
    console.error('Error:', error.message);
    
    return {
      success: false,
      module: 'task_ingestion',
      error: error.message,
      status: 'failed'
    };
  }
}

// Run if executed directly
if (require.main === module) {
  runValidation().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runValidation };
