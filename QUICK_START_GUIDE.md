# GXEON DURABLE EXECUTION - QUICK START GUIDE

## For Developers: How to Use the Durable Execution System

### 1. Create a Durable Workflow

```javascript
import workflowEngine from './runtime/workflow-engine.js';
import { WorkflowDefinition, ActivityDefinition } from './runtime/workflow-utils.js';

// Define the workflow
const billingWorkflow = new WorkflowDefinition('payment_workflow', 1)
  .addActivity(
    new ActivityDefinition('validate_payment', 'sync')
      .withHandler(async (input) => {
        // Synchronous validation
        if (input.amount <= 0) throw new Error('Invalid amount');
        return { valid: true };
      })
      .build()
  )
  .addActivity(
    new ActivityDefinition('process_payment', 'async')
      .withHandler(async (input) => {
        // Process payment (long-running)
        const result = await processPaymentGateway(input);
        return { payment_id: result.id, confirmed: true };
      })
      .withCompensation(async (input, result) => {
        // If workflow fails, refund the payment
        await refundPayment(result.payment_id);
      })
      .build()
  )
  .withMaxRetries(3)
  .withTimeout(60000) // 60 seconds
  .build();

// Create and execute
const workflow = await workflowEngine.createWorkflow(billingWorkflow, {
  user_id: 'user_123',
  amount: 50.00,
  idempotency_key: 'payment_user123_20240516' // IMPORTANT: Unique per operation
});

const result = await workflowEngine.executeWorkflow(workflow.workflow_id);
console.log(`Workflow status: ${result.state}`); // COMPLETED or FAILED
```

### 2. Use Idempotency for Critical Operations

```javascript
import idempotencyRegistry from './runtime/idempotency-registry.js';

// Execute operation exactly once per key
const result = await idempotencyRegistry.executeOnce(
  'charge_user_456_20240516', // Idempotency key
  async () => {
    // This code runs only once per key
    // Duplicate requests return cached result
    return await deductUserCredits('user_456', 25.00);
  },
  { user_id: 'user_456' } // Optional metadata
);

console.log(result); // { success: true, previous_balance: 100, new_balance: 75 }

// Replay with same key returns same result:
const result2 = await idempotencyRegistry.executeOnce(
  'charge_user_456_20240516', // Same key
  async () => {
    return await deductUserCredits('user_456', 25.00); // NOT EXECUTED
  }
);

console.log(result2); // { success: true, previous_balance: 100, new_balance: 75 }
// No second deduction!
```

### 3. Record Financial Events

```javascript
import eventSource from './runtime/event-source.js';

// Record a billing charge
await eventSource.recordBillingCharge({
  execution_id: 'exec_123',
  user_id: 'user_456',
  api_key_id: 'key_789',
  amount_usd: 50.00,
  breakdown: {
    execution_base: 0.005,
    latency_cost: 0.002,
    decision_fee: 0.001,
    success_multiplier: 1.0
  },
  task_type: 'signal_execution',
  latency_ms: 234,
  success: true
}, {
  correlationId: 'corr_xyz', // Links all events together
  workflowId: 'wf_abc'
});

// Later: retrieve full audit trail
const auditTrail = await eventSource.getAuditTrail('exec_123');
console.log(auditTrail.timeline); // Complete financial trace
```

### 4. Handle Failures with Compensation

```javascript
import workflowEngine from './runtime/workflow-engine.js';
import { WorkflowDefinition, ActivityDefinition } from './runtime/workflow-utils.js';

// Workflow that can fail and recover
const complexWorkflow = new WorkflowDefinition('fund_transfer', 1)
  .addActivity(
    new ActivityDefinition('debit_account', 'async')
      .withHandler(async (input) => {
        await database.debit(input.from_account, input.amount);
        return { from_account: input.from_account, amount: input.amount };
      })
      .withCompensation(async (input, result) => {
        // Undo the debit if workflow fails
        await database.credit(result.from_account, result.amount);
      })
      .build()
  )
  .addActivity(
    new ActivityDefinition('credit_account', 'async')
      .withHandler(async (input) => {
        // This might fail
        const api = new ExternalAPI();
        await api.transfer(input.to_account, input.amount);
        return { to_account: input.to_account, amount: input.amount };
      })
      .withCompensation(async (input, result) => {
        // If external API fails, reverse the debit
        // (previous activity's compensation will be called)
      })
      .build()
  )
  .build();

const workflow = await workflowEngine.createWorkflow(complexWorkflow, {
  from_account: 'acc_123',
  to_account: 'acc_456',
  amount: 100.00
});

const result = await workflowEngine.executeWorkflow(workflow.workflow_id);

// If credit_account fails:
// 1. credit_account compensation runs (if applicable)
// 2. debit_account compensation runs (LIFO: reverse debit)
// 3. Workflow transitions to COMPLETED with compensation
// 4. User's account back to original state (atomic operation)
```

### 5. Query Event History

```javascript
import eventSource from './runtime/event-source.js';

// Get all events for a correlation trace
const trace = await eventSource.getEventsByCorrelation('corr_xyz');
trace.forEach(event => {
  console.log(`${event.timestamp} | ${event.domain}.${event.event_type}`);
});

// Get events by type
const billingEvents = await eventSource.getEventsByType('BILLING', 'BILLING_CHARGE', {
  startTime: '2024-05-16T00:00:00Z',
  endTime: '2024-05-16T23:59:59Z',
  limit: 1000
});

// Replay events to reconstruct state
const { state, eventLog } = await eventSource.replayEvents(
  'wf_abc',
  'workflow',
  async (currentState, event) => {
    // Apply event to state
    if (event.event_type === 'BILLING_CHARGE') {
      return {
        ...currentState,
        total_charges: (currentState.total_charges || 0) + event.data.amount_usd
      };
    }
    return currentState;
  }
);

console.log(`Replayed to state:`, state);
console.log(`Events processed:`, eventLog.length);
```

### 6. Manual Recovery

```javascript
import recoveryOrchestrator from './runtime/recovery-orchestrator.js';

// Initiate full system recovery (detect and fix issues)
const recovery = await recoveryOrchestrator.initiateRecovery({
  fullScan: true,        // Scan last 24 hours
  timeWindow: 24         // hours
});

console.log('Recovery findings:');
console.log('  Crashed workflows:', recovery.findings.crashed_workflows.length);
console.log('  Incomplete payments:', recovery.findings.incomplete_payments.length);
console.log('  Orphaned charges:', recovery.findings.orphaned_charges.length);
console.log('  Duplicates:', recovery.findings.duplicated_operations.length);

console.log('Recovery actions taken:');
recovery.actions_taken.forEach(action => {
  console.log(`  [${action.status}] ${action.type}: ${action.resource_id}`);
});
```

### 7. Monitor Metrics

```javascript
import { DurableMonetizationEngine } from './runtime/durable-monetization-engine.js';

const engine = new DurableMonetizationEngine();

// Get current metrics
const metrics = engine.getMetrics();
console.log(`
Billing Metrics:
├─ Executions billed: ${metrics.executions_billed}
├─ Revenue (USD): $${metrics.revenue_usd.toFixed(2)}
├─ Balance updates: ${metrics.balance_updates}
├─ Billing failures: ${metrics.billing_failures}
├─ Duplicates prevented: ${metrics.duplicates_prevented}
└─ Avg latency: ${metrics.avg_billing_latency_ms.toFixed(0)}ms
`);

// Get idempotency registry stats
const idempStats = await idempotencyRegistry.getStats();
console.log('Idempotency Stats:', idempStats);

// Get event source stats
const eventStats = await eventSource.getStats(24); // Last 24 hours
console.log('Event Stats:', eventStats);
```

### 8. Integrate with Express/REST API

```javascript
import express from 'express';
import workflowEngine from './runtime/workflow-engine.js';
import eventSource from './runtime/event-source.js';
import recoveryOrchestrator from './runtime/recovery-orchestrator.js';

const app = express();

// Create workflow via API
app.post('/api/workflows', async (req, res) => {
  try {
    const { definition, input } = req.body;
    const workflow = await workflowEngine.createWorkflow(definition, input);
    res.json({ workflow_id: workflow.workflow_id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get workflow status
app.get('/api/workflows/:workflowId', async (req, res) => {
  const workflow = await workflowEngine.getWorkflow(req.params.workflowId);
  res.json(workflow);
});

// Get audit trail
app.get('/api/workflows/:workflowId/history', async (req, res) => {
  const history = await workflowEngine.getWorkflowHistory(req.params.workflowId);
  res.json(history);
});

// Get financial audit trail
app.get('/api/audit/:executionId', async (req, res) => {
  const auditTrail = await eventSource.getAuditTrail(req.params.executionId);
  res.json(auditTrail);
});

// Trigger recovery
app.post('/api/recovery/initiate', async (req, res) => {
  const recovery = await recoveryOrchestrator.initiateRecovery({
    fullScan: req.query.fullScan === 'true'
  });
  res.json(recovery);
});

// Get metrics
app.get('/api/metrics', (req, res) => {
  res.json(engine.getMetrics());
});
```

### 9. Error Handling Patterns

```javascript
// Pattern 1: Catch and retry
try {
  const result = await workflowEngine.executeWorkflow(workflowId);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Retry with backoff
    await new Promise(r => setTimeout(r, 1000));
    return await workflowEngine.retryWorkflow(workflowId);
  }
  throw error;
}

// Pattern 2: Idempotency key for safety
const idempotencyKey = `op_${userId}_${Date.now()}`;
const result = await idempotencyRegistry.executeOnce(idempotencyKey, async () => {
  return await criticalOperation(userId);
});

// Pattern 3: Subscribe to events
import { EventSource } from './runtime/event-source.js';

const unsubscribe = eventSource.subscribe('BILLING', 'BILLING_CHARGE', async (event) => {
  console.log(`New charge: $${event.data.amount_usd}`);
  // Send notification, update dashboard, etc.
});

// Cleanup:
unsubscribe();
```

### 10. Testing Example

```javascript
// Mock a billing workflow for testing
const testWorkflow = new WorkflowDefinition('test_billing', 1)
  .addActivity(
    new ActivityDefinition('mock_charge', 'sync')
      .withHandler(async (input) => {
        // Simulate charging user
        return {
          charge_id: 'test_123',
          amount: input.amount,
          success: true
        };
      })
      .build()
  )
  .build();

// Execute in test
const testWorkflowInstance = await workflowEngine.createWorkflow(testWorkflow, {
  amount: 10.00,
  user_id: 'test_user'
});

const result = await workflowEngine.executeWorkflow(testWorkflowInstance.workflow_id);
console.assert(result.state === 'COMPLETED', 'Workflow should complete');

// Verify event was recorded
const events = await eventSource.getEventsByWorkflow(testWorkflowInstance.workflow_id);
console.assert(events.length > 0, 'Events should be recorded');
```

---

## Common Patterns

### Pattern: Exactly-Once Billing
```javascript
// Use idempotency + workflow together
const idempotencyKey = `billing_${executionId}`;
const result = await idempotencyRegistry.executeOnce(idempotencyKey, async () => {
  return await workflowEngine.executeWorkflow(workflowId);
});
// Guarantees: charge recorded exactly once, idempotent on replay
```

### Pattern: Safe Balance Update
```javascript
// Use atomic operations from database
await supabase.rpc('deduct_credits_atomic_durable', {
  p_user_id: userId,
  p_amount: amount,
  p_operation: 'BILLING',
  p_request_id: requestId
});
// Guarantees: atomic at database level, no race conditions
```

### Pattern: Complete Audit Trail
```javascript
// Every financial operation creates events
await eventSource.recordBillingCharge({ ... }, { correlationId });
const trace = await eventSource.getAuditTrail(executionId);
// Guarantees: 100% financial trace, audit-ready
```

---

## Troubleshooting

### Q: Duplicate key error when creating workflow
A: Use unique idempotency keys. Don't reuse same ID for different operations.

### Q: Workflow stuck in RUNNING state
A: This is expected after crash. Run recovery:
```javascript
await recoveryOrchestrator.initiateRecovery({ fullScan: true });
```

### Q: Events not appearing in event_source
A: Verify idempotency keys are unique and event recording succeeds:
```javascript
const event = await eventSource.recordBillingCharge({...});
console.log('Event recorded:', event.event_id);
```

### Q: Compensation not running
A: Verify compensation function is provided in ActivityDefinition:
```javascript
.withCompensation(async (input, result) => {
  // This must be provided for compensation to run
})
```

---

## API Reference

### WorkflowEngine
```javascript
workflowEngine.createWorkflow(definition, input)
workflowEngine.executeWorkflow(workflowId)
workflowEngine.retryWorkflow(workflowId)
workflowEngine.getWorkflow(workflowId)
workflowEngine.getWorkflowHistory(workflowId)
workflowEngine.recoverWorkflow(workflowId)
```

### IdempotencyRegistry
```javascript
idempotencyRegistry.executeOnce(key, operation, metadata)
idempotencyRegistry.getIdempotencyRecord(key)
idempotencyRegistry.getStats()
idempotencyRegistry.cleanupExpiredRecords()
```

### EventSource
```javascript
eventSource.recordBillingCharge(data, options)
eventSource.recordPaymentProcessed(data, options)
eventSource.recordCreditDeducted(data, options)
eventSource.recordEvent(domain, type, data, options)
eventSource.getEventsByCorrelation(correlationId)
eventSource.getEventsByWorkflow(workflowId)
eventSource.getEventsByType(domain, type, options)
eventSource.replayEvents(resourceId, type, handler)
eventSource.getAuditTrail(executionId)
```

### RecoveryOrchestrator
```javascript
recoveryOrchestrator.initiateRecovery(options)
recoveryOrchestrator.getRecoveryStatus(recoveryId)
recoveryOrchestrator.emergencyStop()
```

---

**READY TO USE! Start creating durable workflows.**
