-- Schema additions for Social Sentiment plugin and Internal AI tracking

-- Table: Internal AI Usage Tracking
CREATE TABLE IF NOT EXISTS internal_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_tx_id UUID REFERENCES billing_transactions(id),
    analysis_type TEXT DEFAULT 'fast', -- fast, deep, sentiment
    input_chars INTEGER,
    output_chars INTEGER,
    model TEXT DEFAULT 'gpt-4o-mini',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for billing attribution
CREATE INDEX IF NOT EXISTS idx_internal_ai_billing ON internal_ai_usage(billing_tx_id);
CREATE INDEX IF NOT EXISTS idx_internal_ai_timestamp ON internal_ai_usage(timestamp);

-- Add Social Sentiment plugin to marketplace
INSERT INTO agent_plugins (
    name, 
    description, 
    category, 
    required_tier, 
    execution_cost, 
    file_path, 
    is_active
)
VALUES (
    'social_sentiment',
    'AI-powered sentiment and intention analysis for lead qualification using OpenAI',
    'analytics',
    'basic',  -- Available to basic tier (uses internal AI)
    0.003,   -- $0.003 per analysis (includes internal AI cost)
    'social_sentiment.js',
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    required_tier = EXCLUDED.required_tier,
    execution_cost = EXCLUDED.execution_cost,
    is_active = true;

-- Function: Get internal AI cost breakdown
CREATE OR REPLACE FUNCTION get_internal_ai_costs(p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_calls', COUNT(*),
        'fast_calls', COUNT(*) FILTER (WHERE analysis_type = 'fast'),
        'deep_calls', COUNT(*) FILTER (WHERE analysis_type = 'deep'),
        'sentiment_calls', COUNT(*) FILTER (WHERE analysis_type = 'sentiment'),
        'total_input_chars', SUM(input_chars),
        'total_output_chars', SUM(output_chars),
        'period_days', p_days
    )
    INTO v_result
    FROM internal_ai_usage
    WHERE timestamp > NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
