-- Supabase RPC Functions for GXEON Billing System (v2 - Matching Implementation)
-- Run these in Supabase SQL Editor

-- Function: Atomic credit deduction (matches gxeonEnforcer middleware)
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
    p_api_key TEXT,
    p_amount NUMERIC,
    p_operation TEXT,
    p_request_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Lock user row and get current balance
    SELECT id, balance_credits 
    INTO v_user_id, v_current_balance
    FROM users 
    WHERE api_key = p_api_key
    FOR UPDATE;
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'API Key inválida'
        );
    END IF;
    
    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente',
            'current_balance', v_current_balance,
            'required', p_amount
        );
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
    -- Update user balance
    UPDATE users 
    SET balance_credits = v_new_balance,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Create billing transaction record with 'reserved' status
    -- Status will be updated to 'completed' on success or 'refunded' on failure
    INSERT INTO billing_transactions (
        user_id,
        amount,
        operation,
        request_id,
        balance_after,
        status
    ) VALUES (
        v_user_id,
        p_amount,
        p_operation,
        p_request_id,
        v_new_balance,
        'reserved'  -- Initial state, confirmed by route handler
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'transaction_id', v_transaction_id,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'deducted', p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Refund credits on failure (matches your implementation)
CREATE OR REPLACE FUNCTION refund_credits(tx_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
    v_user_id UUID;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM billing_transactions
    WHERE id = tx_id_input 
    AND status IN ('reserved', 'completed')
    FOR UPDATE;
    
    IF v_transaction IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Transação não encontrada ou já processada'
        );
    END IF;
    
    v_user_id := v_transaction.user_id;
    
    -- Restore balance
    UPDATE users 
    SET balance_credits = balance_credits + v_transaction.amount,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Mark transaction as refunded
    UPDATE billing_transactions
    SET status = 'refunded',
        refunded_at = NOW()
    WHERE id = tx_id_input;
    
    RETURN jsonb_build_object(
        'success', true,
        'refunded_amount', v_transaction.amount,
        'user_id', v_user_id,
        'transaction_id', tx_id_input
    );
END;
$$ LANGUAGE plpgsql;

-- Create billing_transactions table if not exists
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount NUMERIC NOT NULL,
    operation TEXT NOT NULL,
    request_id TEXT,
    balance_after NUMERIC,
    status TEXT DEFAULT 'reserved',  -- 'reserved' | 'completed' | 'refunded' | 'failed'
    refund_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    refunded_at TIMESTAMP
);

-- Add required columns to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'balance_credits') THEN
        ALTER TABLE users ADD COLUMN balance_credits NUMERIC DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'api_key') THEN
        ALTER TABLE users ADD COLUMN api_key TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_request_id ON billing_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_transactions(status);
