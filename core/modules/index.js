/**
 * GXEON Core Modules Index
 * Central export point for all production modules
 */

const { taskIngestionModule, TaskIngestionModule } = require('./task_ingestion_module');
const { runExecutionAgent } = require('./execution_agent');

module.exports = {
  // Module 01: Task Ingestion
  taskIngestionModule,
  TaskIngestionModule,

  // Module 02: Execution Agent
  executionAgent: runExecutionAgent,

  // Module registry for dynamic loading
  modules: {
    task_ingestion: taskIngestionModule,
    execution_agent: runExecutionAgent
  }
};
