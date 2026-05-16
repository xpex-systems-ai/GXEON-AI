-- GXEON Task Engine Schema
-- Extended schema for task capture from external platforms

-- ==========================================
-- TABLE: external_tasks
-- ==========================================
CREATE TABLE IF NOT EXISTS external_tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('social', 'onchain', 'api', 'manual')),
    
    -- Reward structure
    reward_type TEXT CHECK (reward_type IN ('points', 'token', 'nft', 'unknown')),
    reward_value_estimate NUMERIC DEFAULT 0,
    reward_priority_score NUMERIC DEFAULT 0,
    
    -- Requirements (JSON array)
    requirements JSONB DEFAULT '[]',
    
    -- Execution steps
    execution_mode TEXT CHECK (execution_mode IN ('api', 'browser', 'hybrid')),
    execution_steps JSONB DEFAULT '[]',
    
    -- Status
    wallet_required BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'executing', 'completed', 'failed', 'cancelled')),
    
    -- Proof of execution
    proof_tx_hash TEXT,
    proof_screenshot TEXT,
    proof_response TEXT,
    
    -- Agent assignment
    assigned_agent TEXT,
    
    -- Financial tracking
    estimated_value NUMERIC DEFAULT 0,
    claimed BOOLEAN DEFAULT false,
    wallet_used TEXT,
    
    -- Pipeline stage
    pipeline_stage TEXT DEFAULT 'stage_1_capture' CHECK (pipeline_stage IN (
        'stage_1_capture',
        'stage_2_validation', 
        'stage_3_queue',
        'stage_4_execution',
        'stage_5_proof',
        'stage_6_storage'
    )),
    
    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    queued_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Enable RLS
ALTER TABLE external_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for authenticated users" 
    ON external_tasks FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Enable all for service role" 
    ON external_tasks FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_external_tasks_source ON external_tasks(source);
CREATE INDEX idx_external_tasks_status ON external_tasks(status);
CREATE INDEX idx_external_tasks_pipeline_stage ON external_tasks(pipeline_stage);
CREATE INDEX idx_external_tasks_type ON external_tasks(type);
CREATE INDEX idx_external_tasks_priority ON external_tasks(reward_priority_score DESC);
CREATE INDEX idx_external_tasks_created_at ON external_tasks(created_at DESC);
CREATE INDEX idx_external_tasks_assigned_agent ON external_tasks(assigned_agent);

-- ==========================================
-- TABLE: task_sources
-- ==========================================
CREATE TABLE IF NOT EXISTS task_sources (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    input_mode TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    task_format TEXT NOT NULL,
    api_endpoint TEXT,
    api_key TEXT,
    last_fetch_at TIMESTAMP,
    tasks_fetched INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

-- Insert default sources
INSERT INTO task_sources (source_id, name, type, input_mode, status, task_format) VALUES
    ('galxe', 'Galxe', 'quest_platform', 'api_or_scrape', 'active', 'quest'),
    ('zealy', 'Zealy', 'quest_platform', 'api_or_scrape', 'active', 'quest'),
    ('layer3', 'Layer3', 'quest_platform', 'api_or_scrape', 'active', 'quest')
ON CONFLICT (source_id) DO NOTHING;

-- ==========================================
-- TABLE: agent_executions
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_executions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id uuid REFERENCES external_tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    execution_mode TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    steps_executed INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    error_message TEXT,
    execution_log JSONB DEFAULT '[]',
    started_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_agent_executions_task_id ON agent_executions(task_id);
CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_external_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_external_task_timestamp ON external_tasks;
CREATE TRIGGER update_external_task_timestamp
    BEFORE UPDATE ON external_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_external_task_timestamp();

-- Log task changes
CREATE OR REPLACE FUNCTION log_external_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs (module, action, message, metadata)
    VALUES (
        'task_engine',
        TG_OP,
        format('External Task %s: %s from %s', TG_OP, NEW.task_id, NEW.source),
        jsonb_build_object(
            'task_id', NEW.id,
            'external_task_id', NEW.task_id,
            'source', NEW.source,
            'status', NEW.status,
            'pipeline_stage', NEW.pipeline_stage,
            'assigned_agent', NEW.assigned_agent
        )
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS log_external_tasks_trigger ON external_tasks;
CREATE TRIGGER log_external_tasks_trigger
    AFTER INSERT OR UPDATE ON external_tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_external_task_changes();

-- ==========================================
-- VIEW: Task Dashboard
-- ==========================================
CREATE OR REPLACE VIEW task_dashboard AS
SELECT 
    id,
    task_id,
    source,
    title,
    type,
    reward_type,
    reward_value_estimate,
    reward_priority_score,
    status,
    pipeline_stage,
    assigned_agent,
    estimated_value,
    claimed,
    wallet_used,
    retry_count,
    created_at,
    updated_at,
    CASE 
        WHEN status = 'completed' THEN 'success'
        WHEN status = 'failed' AND retry_count >= max_retries THEN 'failed'
        WHEN status = 'executing' THEN 'running'
        ELSE 'pending'
    END as display_status
FROM external_tasks
ORDER BY reward_priority_score DESC, created_at DESC;

-- ==========================================
-- GRANTS
-- ==========================================
GRANT ALL ON external_tasks TO authenticated;
GRANT ALL ON external_tasks TO service_role;
GRANT ALL ON task_sources TO authenticated;
GRANT ALL ON task_sources TO service_role;
GRANT ALL ON agent_executions TO authenticated;
GRANT ALL ON agent_executions TO service_role;
GRANT ALL ON task_dashboard TO authenticated;
GRANT ALL ON task_dashboard TO service_role;
