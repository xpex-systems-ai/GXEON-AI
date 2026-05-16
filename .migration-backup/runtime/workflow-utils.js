/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON WORKFLOW UTILITIES v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function generateWorkflowId() {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

export function generateActivityId() {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

export function generateExecutionId() {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

export function generateBillingId() {
  return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

export function generateCorrelationId() {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

export function generateTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

/**
 * Workflow definition builder
 */
export class WorkflowDefinition {
  constructor(id, version = 1) {
    this.id = id;
    this.version = version;
    this.activities = [];
    this.max_retries = 3;
    this.timeout_ms = 300000;
  }

  addActivity(activity) {
    this.activities.push(activity);
    return this;
  }

  withMaxRetries(count) {
    this.max_retries = count;
    return this;
  }

  withTimeout(ms) {
    this.timeout_ms = ms;
    return this;
  }

  build() {
    return {
      id: this.id,
      version: this.version,
      activities: this.activities,
      max_retries: this.max_retries,
      timeout_ms: this.timeout_ms
    };
  }
}

/**
 * Activity definition builder
 */
export class ActivityDefinition {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.input = {};
    this.max_retries = 3;
    this.compensation = null;
  }

  withInput(input) {
    this.input = input;
    return this;
  }

  withRetries(count) {
    this.max_retries = count;
    return this;
  }

  withCompensation(compensationFn) {
    this.compensation = compensationFn;
    return this;
  }

  withHandler(handler) {
    this.handler = handler;
    return this;
  }

  build() {
    return {
      name: this.name,
      type: this.type,
      input: this.input,
      max_retries: this.max_retries,
      compensation: this.compensation,
      handler: this.handler
    };
  }
}
