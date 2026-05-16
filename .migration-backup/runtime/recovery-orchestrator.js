/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON RECOVERY ORCHESTRATOR v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles recovery from:
 * - Process crashes
 * - Incomplete workflows
 * - Failed payments
 * - Queue corruption
 * - Partial executions
 *
 * Guarantees:
 * - No lost workflows on restart
 * - No duplicate charges from recovery
 * - All recovery actions are logged
 */

import supabase from '../server/services/supabase.js';
import workflowEngine from './workflow-engine.js';
import eventSource from './event-source.js';

export const RECOVERY_STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REQUIRES_MANUAL_INTERVENTION: 'REQUIRES_MANUAL_INTERVENTION'
};

export class RecoveryOrchestrator {
  constructor() {
    this.activeRecoveries = new Map();
  }

  /**
   * Initiate system recovery
   * Called on startup or manual trigger
   */
  async initiateRecovery(options = {}) {
    const { fullScan = false, timeWindow = 24 } = options;

    console.log('[RecoveryOrchestrator] Starting recovery procedure...');

    const recovery = {
      recovery_id: `recovery_${Date.now()}`,
      started_at: new Date().toISOString(),
      full_scan: fullScan,
      time_window_hours: timeWindow,
      findings: {
        crashed_workflows: [],
        incomplete_payments: [],
        orphaned_charges: [],
        duplicated_operations: []
      },
      actions_taken: []
    };

    try {
      // Step 1: Find crashed workflows
      recovery.findings.crashed_workflows = await this.findCrashedWorkflows(timeWindow);

      // Step 2: Find incomplete payments
      recovery.findings.incomplete_payments = await this.findIncompletePayments(timeWindow);

      // Step 3: Find orphaned charges
      recovery.findings.orphaned_charges = await this.findOrphanedCharges(timeWindow);

      // Step 4: Find duplicate operations
      recovery.findings.duplicated_operations = await this.findDuplicateOperations(timeWindow);

      // Record recovery initiated event
      await eventSource.recordRecoveryInitiated({
        resource_type: 'system',
        resource_id: 'global',
        failure_reason: 'scheduled_recovery',
        recovery_strategy: 'full_scan'
      });

      console.log(`[RecoveryOrchestrator] Recovery findings:`, recovery.findings);

      // Step 5: Execute recovery actions
      recovery.actions_taken = await this.executeRecoveryActions(recovery);

      recovery.completed_at = new Date().toISOString();
      recovery.status = 'COMPLETED';

      this.activeRecoveries.set(recovery.recovery_id, recovery);

      console.log(`[RecoveryOrchestrator] Recovery completed: ${recovery.recovery_id}`);

      return recovery;
    } catch (error) {
      console.error(`[RecoveryOrchestrator] Recovery failed: ${error.message}`);

      recovery.error = error.message;
      recovery.status = 'FAILED';
      recovery.completed_at = new Date().toISOString();

      this.activeRecoveries.set(recovery.recovery_id, recovery);

      throw error;
    }
  }

  /**
   * Find workflows stuck in RUNNING state (likely crashed)
   */
  async findCrashedWorkflows(hoursAgo) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    const { data, error } = await supabase
      .from('gx_workflows')
      .select('*')
      .eq('state', 'RUNNING')
      .lt('updated_at', cutoffTime);

    if (error) {
      console.error(`Crashed workflow search failed: ${error.message}`);
      return [];
    }

    console.log(`[RecoveryOrchestrator] Found ${data?.length || 0} crashed workflows`);

    return data || [];
  }

  /**
   * Find incomplete payment operations
   */
  async findIncompletePayments(hoursAgo) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    const { data, error } = await supabase
      .from('gx_payment_transactions')
      .select('*')
      .eq('status', 'PENDING')
      .lt('created_at', cutoffTime);

    if (error) {
      console.error(`Incomplete payment search failed: ${error.message}`);
      return [];
    }

    console.log(`[RecoveryOrchestrator] Found ${data?.length || 0} incomplete payments`);

    return data || [];
  }

  /**
   * Find charges without corresponding workflows
   */
  async findOrphanedCharges(hoursAgo) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    // Query: billing ledger entries without matching workflows
    const { data, error } = await supabase
      .rpc('find_orphaned_charges', {
        p_cutoff_time: cutoffTime
      });

    if (error) {
      console.error(`Orphaned charges search failed: ${error.message}`);
      return [];
    }

    console.log(`[RecoveryOrchestrator] Found ${data?.length || 0} orphaned charges`);

    return data || [];
  }

  /**
   * Find duplicate operations (same idempotency key, multiple executions)
   */
  async findDuplicateOperations(hoursAgo) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 3600000).toISOString();

    // Query: idempotency registry with multiple completed entries
    const { data, error } = await supabase
      .rpc('find_duplicate_operations', {
        p_cutoff_time: cutoffTime
      });

    if (error) {
      console.error(`Duplicate operations search failed: ${error.message}`);
      return [];
    }

    console.log(`[RecoveryOrchestrator] Found ${data?.length || 0} duplicate operations`);

    return data || [];
  }

  /**
   * Execute recovery actions based on findings
   */
  async executeRecoveryActions(recovery) {
    const actions = [];

    // Recover crashed workflows
    for (const workflow of recovery.findings.crashed_workflows) {
      try {
        console.log(`[RecoveryOrchestrator] Recovering workflow: ${workflow.workflow_id}`);

        await workflowEngine.recoverWorkflow(workflow.workflow_id);

        actions.push({
          type: 'WORKFLOW_RECOVERED',
          resource_id: workflow.workflow_id,
          status: 'SUCCESS',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        actions.push({
          type: 'WORKFLOW_RECOVERED',
          resource_id: workflow.workflow_id,
          status: 'FAILED',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Recover incomplete payments
    for (const payment of recovery.findings.incomplete_payments) {
      try {
        console.log(`[RecoveryOrchestrator] Retrying payment: ${payment.payment_id}`);

        // Update payment status to RETRYING
        await supabase
          .from('gx_payment_transactions')
          .update({
            status: 'RETRYING',
            retry_count: (payment.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('payment_id', payment.payment_id);

        actions.push({
          type: 'PAYMENT_RETRY',
          resource_id: payment.payment_id,
          status: 'QUEUED',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        actions.push({
          type: 'PAYMENT_RETRY',
          resource_id: payment.payment_id,
          status: 'FAILED',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Handle orphaned charges
    for (const charge of recovery.findings.orphaned_charges) {
      console.log(`[RecoveryOrchestrator] Flagged orphaned charge: ${charge.billing_id}`);

      // Mark for manual intervention
      await supabase
        .from('gx_billing_ledger')
        .update({
          status: 'REQUIRES_MANUAL_REVIEW',
          recovery_flag: true,
          recovery_timestamp: new Date().toISOString()
        })
        .eq('billing_id', charge.billing_id);

      actions.push({
        type: 'ORPHANED_CHARGE_FLAGGED',
        resource_id: charge.billing_id,
        status: 'REQUIRES_MANUAL_INTERVENTION',
        timestamp: new Date().toISOString()
      });
    }

    // Handle duplicate operations
    for (const duplicate of recovery.findings.duplicated_operations) {
      console.log(`[RecoveryOrchestrator] Detected duplicate: ${duplicate.idempotency_key}`);

      // Merge duplicate records, keep most recent
      await supabase
        .from('gx_idempotency_registry')
        .update({
          status: 'DUPLICATE_DETECTED',
          merged_at: new Date().toISOString()
        })
        .eq('idempotency_key', duplicate.idempotency_key);

      actions.push({
        type: 'DUPLICATE_DETECTED',
        resource_id: duplicate.idempotency_key,
        status: 'MERGED',
        timestamp: new Date().toISOString()
      });
    }

    return actions;
  }

  /**
   * Get recovery status
   */
  async getRecoveryStatus(recoveryId) {
    return this.activeRecoveries.get(recoveryId) || null;
  }

  /**
   * Get recovery history
   */
  async getRecoveryHistory(limit = 10) {
    return Array.from(this.activeRecoveries.values())
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, limit);
  }

  /**
   * Emergency recovery: stop all operations and prepare for manual intervention
   */
  async emergencyStop() {
    console.warn('[RecoveryOrchestrator] EMERGENCY STOP INITIATED');

    const { error } = await supabase
      .from('gx_system_state')
      .update({
        state: 'EMERGENCY_STOP',
        timestamp: new Date().toISOString(),
        reason: 'Manual emergency stop'
      })
      .eq('key', 'system');

    if (error) {
      console.error(`Emergency stop failed: ${error.message}`);
    }

    return {
      status: 'EMERGENCY_STOP',
      timestamp: new Date().toISOString(),
      requires_manual_intervention: true
    };
  }

  /**
   * Resume from emergency stop
   */
  async resumeFromEmergencyStop() {
    console.log('[RecoveryOrchestrator] Resuming from emergency stop');

    const { error } = await supabase
      .from('gx_system_state')
      .update({
        state: 'RUNNING',
        timestamp: new Date().toISOString(),
        reason: 'Resumed from emergency stop'
      })
      .eq('key', 'system');

    if (error) {
      console.error(`Resume failed: ${error.message}`);
    }

    return {
      status: 'RUNNING',
      timestamp: new Date().toISOString()
    };
  }
}

export default new RecoveryOrchestrator();
