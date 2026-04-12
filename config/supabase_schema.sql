-- GXEON Supreme Database Schema
-- Supabase PostgreSQL Schema
-- Generated from gxeon_supreme_config

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLE: users
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text,
    role text,
    wallet_address text,
    created_at timestamp DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

-- ==========================================
-- TABLE: tasks
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent text NOT NULL,
    task_name text NOT NULL,
    payload jsonb DEFAULT '{}',
    status text DEFAULT 'pending',
    result jsonb DEFAULT NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Enable all operations for authenticated users" 
    ON tasks FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Create index on status for faster queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(agent);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- ==========================================
-- TABLE: payments
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    currency text DEFAULT 'ETH',
    tx_hash text,
    status text DEFAULT 'pending',
    created_at timestamp DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view own payments" 
    ON payments FOR SELECT 
    USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_tx_hash ON payments(tx_hash);

-- ==========================================
-- TABLE: logs
-- ==========================================
CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    module text NOT NULL,
    action text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamp DEFAULT now()
);

-- Enable RLS on logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs
CREATE POLICY "Enable read for authenticated users" 
    ON logs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert for service role" 
    ON logs FOR INSERT 
    TO service_role 
    WITH CHECK (true);

-- Create index on module and created_at for faster queries
CREATE INDEX idx_logs_module ON logs(module);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_module_created_at ON logs(module, created_at DESC);

-- ==========================================
-- FUNCTION: Update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tasks table
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- FUNCTION: Log event trigger
-- ==========================================
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs (module, action, message, metadata)
    VALUES (
        'tasks',
        TG_OP,
        format('Task %s: %s by agent %s', TG_OP, NEW.task_name, NEW.agent),
        jsonb_build_object(
            'task_id', NEW.id,
            'status', NEW.status,
            'agent', NEW.agent
        )
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for task logging
DROP TRIGGER IF EXISTS log_tasks_trigger ON tasks;
CREATE TRIGGER log_tasks_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO service_role;
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payments TO service_role;
GRANT ALL ON logs TO authenticated;
GRANT ALL ON logs TO service_role;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
