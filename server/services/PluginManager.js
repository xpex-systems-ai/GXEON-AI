const supabase = require('./supabase');
const path = require('path');
const fs = require('fs');

/**
 * PLUGIN MANAGER - Tier-based Access with Billing
 * 
 * Features:
 * - Tier validation (basic/pro/enterprise)
 * - Per-plugin billing (deduct before execution)
 * - Automatic refunds on failure
 * - Plugin marketplace integration
 * - Usage tracking and analytics
 */

class PluginManager {
    
    /**
     * Validate plugin access and charge for execution
     * 
     * @param {string} pluginName - Name of plugin to execute
     * @param {string} userId - User requesting plugin
     * @param {string} apiKey - User's API key for billing
     * @returns {Promise<Object>} Plugin metadata with billing info
     */
    static async validateAndLoad(pluginName, userId, apiKey) {
        // 1. Validate plugin exists and is active
        const { data: plugin, error: pluginError } = await supabase
            .from('agent_plugins')
            .select('*')
            .eq('name', pluginName)
            .eq('is_active', true)
            .single();

        if (pluginError || !plugin) {
            throw new Error(`PLUGIN_NOT_FOUND: ${pluginName}`);
        }

        // 2. Validate user tier
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('tier, balance_credits')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            throw new Error('USER_NOT_FOUND');
        }

        const tierValidation = this.validateTier(user.tier, plugin.required_tier);
        if (!tierValidation.valid) {
            throw new Error(`UPGRADE_REQUIRED: Plugin ${pluginName} requer tier ${plugin.required_tier}. Seu tier: ${user.tier}`);
        }

        // 3. Check and deduct plugin execution cost
        const executionCost = plugin.execution_cost || 0.002; // Default $0.002 per execution
        
        if (user.balance_credits < executionCost) {
            throw new Error(`INSUFFICIENT_BALANCE: Custo do plugin $${executionCost}, saldo: $${user.balance_credits}`);
        }

        // Deduct credits atomically
        const { data: billingResult, error: billingError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_api_key: apiKey,
                p_amount: executionCost,
                p_operation: `PLUGIN_EXECUTION:${pluginName}`,
                p_request_id: `plugin-${Date.now()}-${userId}`
            });

        if (billingError || !billingResult?.success) {
            throw new Error(`BILLING_FAILED: ${billingResult?.message || billingError?.message}`);
        }

        // 4. Log plugin access
        await this.logPluginAccess(userId, pluginName, 'loaded', billingResult.transaction_id);

        // Return plugin with billing context
        return {
            ...plugin,
            billing: {
                transaction_id: billingResult.transaction_id,
                cost: executionCost,
                new_balance: billingResult.new_balance
            }
        };
    }

    /**
     * Execute plugin with automatic refund on failure
     * 
     * @param {string} pluginName - Plugin to execute
     * @param {Object} context - Execution context
     * @param {Object} billingContext - Billing info from validateAndLoad
     * @returns {Promise<Object>} Execution result
     */
    static async execute(pluginName, context, billingContext) {
        const txId = billingContext?.transaction_id;
        
        try {
            // Security: Validate plugin file exists
            const pluginPath = path.join(__dirname, '..', 'plugins', `${pluginName.toLowerCase()}.js`);
            
            if (!fs.existsSync(pluginPath)) {
                throw new Error(`PLUGIN_FILE_NOT_FOUND: ${pluginPath}`);
            }

            // Load and execute plugin
            const pluginScript = require(pluginPath);
            
            if (typeof pluginScript.run !== 'function') {
                throw new Error(`PLUGIN_INVALID: ${pluginName} não exporta função run()`);
            }

            // Execute with timeout protection
            const result = await this.executeWithTimeout(
                () => pluginScript.run(context),
                30000 // 30 second timeout
            );

            // Success: Confirm billing transaction
            await supabase
                .from('billing_transactions')
                .update({ 
                    status: 'completed',
                    metadata: { 
                        plugin: pluginName,
                        result: 'success'
                    }
                })
                .eq('id', txId);

            // Log successful execution
            await this.logPluginExecution(context.user_id, pluginName, 'success', txId, result);

            return {
                success: true,
                result,
                billing: billingContext
            };

        } catch (error) {
            console.error(`[PluginManager] Execution failed for ${pluginName}:`, error.message);

            // Failure: Refund credits
            if (txId) {
                try {
                    await supabase.rpc('refund_credits', { 
                        tx_id_input: txId
                    });
                    console.log(`[PluginManager] Refunded TX ${txId} for failed plugin ${pluginName}`);
                } catch (refundError) {
                    console.error(`[PluginManager] Refund failed for TX ${txId}:`, refundError);
                }
            }

            // Log failed execution
            await this.logPluginExecution(context.user_id, pluginName, 'failed', txId, { error: error.message });

            throw new Error(`PLUGIN_EXECUTION_FAILED: ${error.message}`);
        }
    }

    /**
     * Execute plugin with timeout
     */
    static async executeWithTimeout(fn, ms) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`PLUGIN_TIMEOUT: Execução excedeu ${ms}ms`));
            }, ms);

            fn()
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Validate user tier against required tier
     */
    static validateTier(userTier, requiredTier) {
        const tiers = { 
            'free': 0,
            'basic': 1, 
            'pro': 2, 
            'enterprise': 3,
            'admin': 99
        };

        const userLevel = tiers[userTier] || 0;
        const requiredLevel = tiers[requiredTier] || 0;

        return {
            valid: userLevel >= requiredLevel,
            userLevel,
            requiredLevel
        };
    }

    /**
     * Log plugin access attempt
     */
    static async logPluginAccess(userId, pluginName, action, txId) {
        try {
            await supabase.from('plugin_access_logs').insert({
                user_id: userId,
                plugin_name: pluginName,
                action,
                billing_tx_id: txId,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[PluginManager] Access log failed:', error);
        }
    }

    /**
     * Log plugin execution result
     */
    static async logPluginExecution(userId, pluginName, status, txId, result) {
        try {
            await supabase.from('plugin_execution_logs').insert({
                user_id: userId,
                plugin_name: pluginName,
                status,
                billing_tx_id: txId,
                result_summary: JSON.stringify(result).substring(0, 1000),
                executed_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[PluginManager] Execution log failed:', error);
        }
    }

    /**
     * Get available plugins for user tier
     */
    static async getAvailablePlugins(userTier) {
        const { data: plugins, error } = await supabase
            .from('agent_plugins')
            .select('name, description, required_tier, execution_cost, category')
            .eq('is_active', true)
            .order('required_tier');

        if (error) {
            throw new Error(`Failed to load plugins: ${error.message}`);
        }

        // Filter by tier
        const tierValidation = this.validateTier.bind(this);
        
        return plugins.map(plugin => ({
            ...plugin,
            accessible: tierValidation(userTier, plugin.required_tier).valid,
            upgrade_required: !tierValidation(userTier, plugin.required_tier).valid
        }));
    }

    /**
     * Get plugin usage stats for user
     */
    static async getUserPluginStats(userId, days = 30) {
        const { data: stats, error } = await supabase
            .rpc('get_user_plugin_stats', {
                p_user_id: userId,
                p_days: days
            });

        if (error) {
            console.error('[PluginManager] Stats error:', error);
            return null;
        }

        return stats;
    }

    /**
     * Register new plugin (admin only)
     */
    static async registerPlugin(pluginData) {
        const { name, description, required_tier, execution_cost, file_path } = pluginData;

        // Validate required fields
        if (!name || !required_tier) {
            throw new Error('MISSING_REQUIRED_FIELDS: name and required_tier are required');
        }

        // Check if plugin already exists
        const { data: existing } = await supabase
            .from('agent_plugins')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            throw new Error(`PLUGIN_EXISTS: ${name} already registered`);
        }

        // Insert new plugin
        const { data: plugin, error } = await supabase
            .from('agent_plugins')
            .insert({
                name,
                description,
                required_tier,
                execution_cost: execution_cost || 0.002,
                file_path: file_path || `${name.toLowerCase()}.js`,
                is_active: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`PLUGIN_REGISTRATION_FAILED: ${error.message}`);
        }

        return plugin;
    }

    /**
     * Disable plugin (admin only)
     */
    static async disablePlugin(pluginName) {
        const { data, error } = await supabase
            .from('agent_plugins')
            .update({ is_active: false })
            .eq('name', pluginName)
            .select()
            .single();

        if (error) {
            throw new Error(`PLUGIN_DISABLE_FAILED: ${error.message}`);
        }

        return data;
    }
}

module.exports = PluginManager;
