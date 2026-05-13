#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON DURABLE EXECUTION DEPLOYMENT GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Step-by-step guide to deploy the durable execution kernel to production
 */

const checklist = {
  PHASE_1_PREPARATION: [
    {
      task: "Verify Supabase credentials",
      command: "echo $SUPABASE_PROJECT_URL $SUPABASE_SERVICE_ROLE_KEY",
      risk: "CRITICAL - System cannot operate without these"
    },
    {
      task: "Verify Kafka brokers are accessible",
      command: "telnet $KAFKA_BROKERS",
      risk: "HIGH - Consumer cannot connect"
    },
    {
      task: "Backup existing gx_billing_ledger",
      command: "pg_dump -t gx_billing_ledger > backup_$(date +%Y%m%d).sql",
      risk: "CRITICAL - Preserve existing data"
    }
  ],

  PHASE_2_SCHEMA_DEPLOYMENT: [
    {
      task: "Execute durable execution schema",
      file: "supabase/durable-execution-schema.sql",
      action: "Copy entire contents and paste into Supabase SQL Editor",
      verify: "SELECT COUNT(*) FROM gx_workflows; -- should return 0",
      risk: "HIGH - Schema changes cannot be easily reverted"
    },
    {
      task: "Verify all tables created",
      query: `
        SELECT COUNT(*) as table_count FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'gx_%'
      `,
      expected: "Should see gx_workflows, gx_workflow_activities, gx_idempotency_registry, gx_event_source, etc.",
      risk: "MEDIUM - Missing tables will cause runtime errors"
    },
    {
      task: "Test atomic credit deduction function",
      query: `
        SELECT deduct_credits_atomic_durable(
          'test_user_123',
          1.00,
          'TEST',
          'test_request_1'
        );
      `,
      expected: "Should return (true, previous_balance, new_balance)",
      risk: "CRITICAL - Financial operations depend on this"
    }
  ],

  PHASE_3_RUNTIME_DEPLOYMENT: [
    {
      task: "Create /runtime directory if not exists",
      command: "mkdir -p runtime",
      files: [
        "workflow-engine.js",
        "idempotency-registry.js",
        "event-source.js",
        "recovery-orchestrator.js",
        "durable-monetization-engine.js",
        "workflow-utils.js"
      ],
      verify: "ls -la runtime/ | wc -l  -- should show 6 files",
      risk: "MEDIUM - Missing files will cause import errors"
    },
    {
      task: "Update core/index.js to import durable components",
      before: "const { GXMonetizationEngine } = require('./core/gx_monetization_engine.js');",
      after: "import { DurableMonetizationEngine } from './runtime/durable-monetization-engine.js';",
      verify: "Code compiles without import errors",
      risk: "HIGH - Syntax errors will prevent startup"
    }
  ],

  PHASE_4_MIGRATION: [
    {
      task: "Run first recovery procedure (background)",
      action: "Call recoveryOrchestrator.initiateRecovery({ fullScan: true })",
      expected: "Should detect and recover any existing stuck workflows",
      risk: "LOW - Read-only operation"
    },
    {
      task: "Monitor Kafka consumer group offset lag",
      command: "kafka-consumer-groups.sh --describe --group gx-durable-monetization-engine-group",
      expected: "Current offset should match log-end offset (no lag)",
      risk: "MEDIUM - High lag indicates backlog"
    },
    {
      task: "Verify workflow execution with test billing event",
      action: "Publish test EXECUTION_RESULT event to billing.charge topic",
      verify: "Check gx_workflows table for new workflow record",
      risk: "MEDIUM - Test may fail if schema incomplete"
    }
  ],

  PHASE_5_VERIFICATION: [
    {
      task: "Verify idempotency with duplicate message",
      action: "Publish same billing event twice with same execution_id",
      expected: "Should see: 1st charge SUCCESS, 2nd charge DUPLICATE_PREVENTED",
      verify: "idempotencyRegistry.getStats() shows duplicates_prevented > 0",
      risk: "HIGH - If duplicates_prevented stays 0, idempotency not working"
    },
    {
      task: "Verify compensation workflow on simulated failure",
      action: "Trigger a workflow that fails in middle (e.g., invalid user)",
      expected: "Should see COMPENSATING state, compensation activities execute",
      verify: "gx_workflow_activities shows compensated activities",
      risk: "CRITICAL - If compensation doesn't run, data will be inconsistent"
    },
    {
      task: "Verify event sourcing",
      action: "Query event_source for sample execution",
      verify: `
        SELECT * FROM gx_event_source
        WHERE correlation_id = 'corr_xxx'
        ORDER BY timestamp
      `,
      expected: "Should show complete event trace: CHARGE → DEDUCT → AUDIT",
      risk: "MEDIUM - Missing events indicate incomplete event sourcing"
    },
    {
      task: "Verify recovery on process restart",
      action: "Kill process during active workflow, restart, verify recovery",
      expected: "Workflow should resume and complete",
      verify: "gx_workflows shows workflow in COMPLETED state after restart",
      risk: "CRITICAL - If recovery doesn't work, workflows will be stuck"
    },
    {
      task: "Check metrics reporting",
      query: "engine.getMetrics()",
      expected: "Should return valid metrics with executions_billed > 0",
      risk: "LOW - Metrics optional for operation"
    }
  ],

  PHASE_6_CUTOVER: [
    {
      task: "Monitor error rate for 1 hour",
      action: "Watch gx_error_log and metrics",
      threshold: "billing_failures < 0.1% of total",
      risk: "HIGH - High failure rate indicates problems"
    },
    {
      task: "Monitor revenue for accuracy",
      action: "Compare revenue_usd to legacy system",
      threshold: "Within 0.1% (allow for rounding)",
      risk: "CRITICAL - Revenue discrepancy indicates calculation error"
    },
    {
      task: "Monitor recovery operations",
      action: "Check gx_recovery_operations table",
      threshold: "No orphaned_charges, all crashes recovered",
      risk: "MEDIUM - Unrecovered items need investigation"
    }
  ]
};

/**
 * Print formatted checklist
 */
function printChecklist() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                  GXEON DURABLE EXECUTION DEPLOYMENT                         ║
║                          PRODUCTION CHECKLIST v1.0                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  for (const [phase, tasks] of Object.entries(checklist)) {
    const phaseNum = phase.split('_')[1];
    console.log(`\n┌─ PHASE ${phaseNum}: ${phase.replace(/_/g, ' ')}`);
    console.log('│');

    tasks.forEach((item, idx) => {
      const riskColor = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢'
      }[item.risk] || '⚪';

      console.log(`│  ${idx + 1}. ${item.task}`);
      if (item.command) console.log(`│     Command: ${item.command}`);
      if (item.file) console.log(`│     File: ${item.file}`);
      if (item.verify) console.log(`│     Verify: ${item.verify}`);
      if (item.risk) console.log(`│     Risk: ${riskColor} ${item.risk}`);
      console.log('│');
    });
    console.log('└');
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            DEPLOYMENT SUMMARY                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Files to Deploy:                                                           ║
║  ├─ /runtime/*.js (6 files)                                                 ║
║  ├─ supabase/durable-execution-schema.sql                                   ║
║  └─ Update core/index.js to use DurableMonetizationEngine                   ║
║                                                                              ║
║  Rollback Plan:                                                             ║
║  ├─ 1. Stop DurableMonetizationEngine consumer                              ║
║  ├─ 2. Restore gx_billing_ledger from backup                               ║
║  ├─ 3. Start legacy GXMonetizationEngine                                    ║
║  └─ 4. Verify revenue from backup vs current                                ║
║                                                                              ║
║  Monitoring:                                                                ║
║  ├─ Kafka lag: https://your-kafka-ui/groups                                ║
║  ├─ Metrics: GET /api/metrics → see executions_billed, revenue_usd          ║
║  ├─ Events: SELECT COUNT(*) FROM gx_event_source                            ║
║  ├─ Workflows: SELECT COUNT(*) FROM gx_workflows WHERE state='COMPLETED'    ║
║  └─ Errors: SELECT * FROM gx_error_log ORDER BY timestamp DESC LIMIT 10     ║
║                                                                              ║
║  Estimated Downtime: 0 minutes (blue-green with dual consumers)             ║
║  Estimated Deployment Time: 30-45 minutes                                   ║
║  Risk Level: MEDIUM (financial system, careful monitoring required)         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Generate rollback script
 */
function generateRollbackScript() {
  return `
#!/bin/bash
# EMERGENCY ROLLBACK - Execute if deployment fails

echo "⚠️  INITIATING EMERGENCY ROLLBACK..."

# 1. Stop durable consumer
echo "Stopping DurableMonetizationEngine..."
# Implementation depends on your deployment (PM2, Docker, etc)
pm2 stop "durable-monetization-engine" || echo "Already stopped"

# 2. Restore from backup
echo "Restoring gx_billing_ledger from backup..."
BACKUP_FILE="backup_\$(date +%Y%m%d).sql"
if [ -f "\$BACKUP_FILE" ]; then
  psql -h \$SUPABASE_HOST -U postgres -d postgres -f "\$BACKUP_FILE"
  echo "✅ Backup restored"
else
  echo "❌ Backup file not found: \$BACKUP_FILE"
  exit 1
fi

# 3. Start legacy consumer
echo "Starting legacy GXMonetizationEngine..."
npm start -- legacy-monetization

# 4. Verify
echo "Verifying revenue..."
echo "SELECT SUM(amount_usd) FROM gx_billing_ledger;" | psql

echo "✅ Rollback complete"
  `;
}

/**
 * Print comprehensive status report
 */
async function generateStatusReport() {
  const report = {
    timestamp: new Date().toISOString(),
    phase: "READY_FOR_DEPLOYMENT",
    components: {
      workflow_engine: "✅ CREATED (350 lines)",
      idempotency_registry: "✅ CREATED (280 lines)",
      event_source: "✅ CREATED (380 lines)",
      recovery_orchestrator: "✅ CREATED (320 lines)",
      durable_monetization_engine: "✅ CREATED (350 lines)",
      workflow_utils: "✅ CREATED (60 lines)",
      database_schema: "✅ CREATED (SQL)"
    },
    documentation: {
      architecture_guide: "GXEON_DURABLE_KERNEL_V1.md",
      deployment_checklist: "THIS FILE",
      code_examples: "In GXEON_DURABLE_KERNEL_V1.md"
    },
    pre_deployment_requirements: [
      "Supabase project with service role key configured",
      "Kafka cluster accessible",
      "Node.js 18+",
      "Database backup created",
      "Team briefed on deployment plan"
    ],
    go_no_go_criteria: {
      schema_deployed: "BLOCKED - Waiting for SQL execution",
      runtime_files_deployed: "BLOCKED - Waiting for file deployment",
      kafka_accessible: "REQUIREMENT",
      supabase_credentials_valid: "REQUIREMENT",
      backup_verified: "REQUIREMENT"
    }
  };

  return report;
}

// Main
if (require.main === module) {
  console.clear();
  printChecklist();

  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              ROLLBACK SCRIPT (SAVE THIS)                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(generateRollbackScript());

  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              DEPLOYMENT STATUS                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  generateStatusReport().then(report => {
    console.log(JSON.stringify(report, null, 2));

    console.log(`\n
NEXT STEPS:
1. Review this checklist with your team
2. Schedule deployment window
3. Execute PHASE 1: Database backup
4. Execute PHASE 2: Schema deployment in Supabase
5. Execute PHASE 3: Runtime deployment
6. Execute PHASE 4: Migration procedures
7. Execute PHASE 5: Verification tests
8. Execute PHASE 6: Monitor cutover

Questions? See GXEON_DURABLE_KERNEL_V1.md for architecture details.
    `);
  });
}

module.exports = { checklist, printChecklist, generateRollbackScript, generateStatusReport };
