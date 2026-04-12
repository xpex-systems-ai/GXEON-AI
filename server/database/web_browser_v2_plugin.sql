-- Add Web Browser V2 plugin to the marketplace
-- Run this in Supabase SQL Editor after the main plugin_schema.sql

-- Insert Web Browser V2 (high-value, requires Pro tier due to resource intensity)
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
    'web_browser_v2',
    'Real browser automation with Playwright - navigates real sites, executes JS, captures screenshots, deep content extraction',
    'automation',
    'pro',  -- Requires Pro tier due to resource intensity
    0.008,  -- $0.008 per execution (higher cost due to Playwright overhead)
    'web_browser_v2.js',
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    required_tier = EXCLUDED.required_tier,
    execution_cost = EXCLUDED.execution_cost,
    is_active = true;

-- Add browser-specific rate limiting (stricter due to resource usage)
-- Recommended: 5 browser sessions per 15 minutes per user
COMMENT ON TABLE agent_plugins IS 'Plugin marketplace with tier-based access and per-execution billing';
