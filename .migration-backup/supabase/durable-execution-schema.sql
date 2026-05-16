-- ═══════════════════════════════════════════════════════════════════════════
-- GXEON DURABLE EXECUTION KERNEL - DATABASE SCHEMA v1.0
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute in Supabase SQL Editor to set up durable execution infrastructure

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. WORKFLOW TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_workflows (
  id BIGSERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) UNIQUE NOT NULL,
  definition_id VARCHAR(255) NOT NULL,
  definition_version INT DEFAULT 1,
  state VARCHAR(50) NOT NULL DEFAULT 'CREATED',
  input_data JSONB,
  activities JSONB[] DEFAULT '{}',
  compensation_stack JSONB[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  timeout_ms INT DEFAULT 300000,
  idempotency_key VARCHAR(255) UNIQUE,
  error TEXT,
  failed_activity VARCHAR(255),
  INDEX idx_workflow_state (state),
  INDEX idx_workflow_created (created_at),
  INDEX idx_workflow_updated (updated_at),
  INDEX idx_idempotency (idempotency_key)
);

CREATE TABLE IF NOT EXISTS gx_workflow_activities (
  id BIGSERIAL PRIMARY KEY,
  activity_id VARCHAR(255) UNIQUE NOT NULL,
  workflow_id VARCHAR(255) NOT NULL REFERENCES gx_workflows(workflow_id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  handler TEXT,
  state VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  input JSONB,
  result JSONB,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  INDEX idx_activity_workflow (workflow_id),
  INDEX idx_activity_state (state),
  INDEX idx_activity_created (created_at)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. IDEMPOTENCY & LOCKING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_idempotency_registry (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  result JSONB,
  error_message TEXT,
  error_stack TEXT,
  lock_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  metadata JSONB,
  INDEX idx_idempotency_status (status),
  INDEX idx_idempotency_created (created_at),
  INDEX idx_idempotency_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS gx_distributed_locks (
  id BIGSERIAL PRIMARY KEY,
  resource_id VARCHAR(255) NOT NULL,
  lock_id VARCHAR(255) UNIQUE NOT NULL,
  acquired_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(resource_id),
  INDEX idx_lock_expires (expires_at),
  INDEX idx_lock_resource (resource_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. EVENT SOURCING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_event_source (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  trace_id VARCHAR(255) NOT NULL,
  causation_id VARCHAR(255),
  workflow_id VARCHAR(255),
  idempotency_key VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  version INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'RECORDED',
  INDEX idx_event_domain (domain),
  INDEX idx_event_type (event_type),
  INDEX idx_event_correlation (correlation_id),
  INDEX idx_event_trace (trace_id),
  INDEX idx_event_workflow (workflow_id),
  INDEX idx_event_timestamp (timestamp),
  INDEX idx_event_idempotency (idempotency_key)
);

CREATE TABLE IF NOT EXISTS gx_workflow_events (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  workflow_id VARCHAR(255) NOT NULL REFERENCES gx_workflows(workflow_id),
  event_type VARCHAR(100) NOT NULL,
  from_state VARCHAR(50),
  to_state VARCHAR(50),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_workflow_event (workflow_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_timestamp (timestamp)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RECOVERY & STATE MANAGEMENT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_system_state (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  state VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS gx_recovery_operations (
  id BIGSERIAL PRIMARY KEY,
  recovery_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  failure_reason TEXT,
  recovery_strategy VARCHAR(100),
  findings JSONB,
  actions_taken JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error TEXT,
  INDEX idx_recovery_status (status),
  INDEX idx_recovery_timestamp (started_at)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PAYMENT TRANSACTION TRACKING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  amount_usd DECIMAL(10, 4) NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  reference_id VARCHAR(255),
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_retry_at TIMESTAMP,
  INDEX idx_payment_status (status),
  INDEX idx_payment_user (user_id),
  INDEX idx_payment_gateway (gateway),
  INDEX idx_payment_created (created_at)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ERROR & LOGGING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gx_error_log (
  id BIGSERIAL PRIMARY KEY,
  service VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  error_message TEXT,
  stack TEXT,
  event_data JSONB,
  severity VARCHAR(20),
  INDEX idx_error_service (service),
  INDEX idx_error_timestamp (timestamp),
  INDEX idx_error_severity (severity)
);

CREATE TABLE IF NOT EXISTS gx_blocked_executions (
  id BIGSERIAL PRIMARY KEY,
  execution_id VARCHAR(255),
  decision_id VARCHAR(255),
  block_reason VARCHAR(100) NOT NULL,
  fail_closed BOOLEAN DEFAULT TRUE,
  retry_allowed BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_blocked_reason (block_reason),
  INDEX idx_blocked_timestamp (timestamp)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. INDEXES FOR COMMON QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_billing_ledger_execution
  ON gx_billing_ledger(execution_id);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_user
  ON gx_billing_ledger(user_id);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_status
  ON gx_billing_ledger(status);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_timestamp
  ON gx_billing_ledger(timestamp);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. STORED PROCEDURES FOR RECOVERY
-- ═══════════════════════════════════════════════════════════════════════════

-- Find orphaned charges (billing without workflows)
CREATE OR REPLACE FUNCTION find_orphaned_charges(p_cutoff_time TIMESTAMP)
RETURNS TABLE (
  billing_id VARCHAR,
  execution_id VARCHAR,
  amount_usd DECIMAL,
  timestamp TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gl.billing_id,
    gl.execution_id,
    gl.amount_usd,
    gl.timestamp
  FROM gx_billing_ledger gl
  LEFT JOIN gx_workflows w ON gl.execution_id = w.input_data->>'execution_id'
  WHERE gl.timestamp < p_cutoff_time
    AND w.workflow_id IS NULL
    AND gl.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Find duplicate operations
CREATE OR REPLACE FUNCTION find_duplicate_operations(p_cutoff_time TIMESTAMP)
RETURNS TABLE (
  idempotency_key VARCHAR,
  count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gir.idempotency_key,
    COUNT(*)::INT as count
  FROM gx_idempotency_registry gir
  WHERE gir.created_at < p_cutoff_time
    AND gir.status = 'COMPLETED'
  GROUP BY gir.idempotency_key
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Atomic credit deduction with durability
CREATE OR REPLACE FUNCTION deduct_credits_atomic_durable(
  p_user_id VARCHAR,
  p_amount DECIMAL,
  p_operation VARCHAR,
  p_request_id VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  previous_balance DECIMAL,
  new_balance DECIMAL
) AS $$
DECLARE
  v_previous_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Acquire row lock
  SELECT balance_credits INTO v_previous_balance
  FROM gxeon_users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_previous_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Check sufficient balance
  IF v_previous_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % < %', v_previous_balance, p_amount;
  END IF;

  -- Deduct credits
  v_new_balance := v_previous_balance - p_amount;

  UPDATE gxeon_users
  SET balance_credits = v_new_balance
  WHERE id = p_user_id;

  -- Log operation
  INSERT INTO gx_credit_operations (user_id, operation, amount, request_id, timestamp)
  VALUES (p_user_id, p_operation, p_amount, p_request_id, NOW());

  RETURN QUERY SELECT true, v_previous_balance, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Atomic credit addition for compensation
CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_user_id VARCHAR,
  p_amount DECIMAL,
  p_reason VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL
) AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  UPDATE gxeon_users
  SET balance_credits = balance_credits + p_amount
  WHERE id = p_user_id
  RETURNING balance_credits INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  INSERT INTO gx_credit_operations (user_id, operation, amount, reason, timestamp)
  VALUES (p_user_id, 'ADD_CREDITS', p_amount, p_reason, NOW());

  RETURN QUERY SELECT true, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Initialize system state
INSERT INTO gx_system_state (key, state, reason)
VALUES ('system', 'RUNNING', 'Durable execution kernel initialized')
ON CONFLICT (key) DO NOTHING;

COMMIT;
