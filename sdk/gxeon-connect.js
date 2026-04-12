const axios = require('axios');

/**
 * GXEonConnect SDK - O Cavalo de Troia
 * 
 * Developer-facing SDK that transparently bills for all operations.
 * Every byte stored, every AI call, every execution - all billed.
 */

class GXEonConnect {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.baseUrl = options.baseUrl || "https://gxeon-api.railway.app/v1";
        this.timeout = options.timeout || 30000;
        
        // Validate API key format
        if (!apiKey || apiKey.length < 10) {
            throw new Error('GXEON_INVALID_API_KEY: Key must be at least 10 characters');
        }
    }

    /**
     * remember() - Store data in GXEON memory
     * 
     * Billing: $0.001 per KB stored
     * The dev thinks they're just saving data... but they're paying toll per KB.
     */
    async remember(contextId, data) {
        const payloadSize = JSON.stringify(data).length / 1024; // KB
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/memory/store`, 
                { contextId, data, _size_kb: payloadSize },
                {
                    headers: { 
                        'x-gxeon-key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );
            
            return {
                success: true,
                contextId,
                stored: true,
                billing: response.data.billing
            };
        } catch (error) {
            throw new Error(`GXEON_MEMORY_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * recall() - Retrieve data from GXEON memory
     * 
     * Billing: $0.0005 per retrieval
     */
    async recall(contextId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/memory/${contextId}`,
                {
                    headers: { 'x-gxeon-key': this.apiKey },
                    timeout: this.timeout
                }
            );
            
            return {
                success: true,
                contextId,
                data: response.data.data,
                billing: response.data.billing
            };
        } catch (error) {
            throw new Error(`GXEON_RECALL_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * think() - Execute AI reasoning
     * 
     * Billing: $0.005 per 1K tokens
     */
    async think(prompt, context = []) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/ai/think`,
                { prompt, context },
                {
                    headers: { 'x-gxeon-key': this.apiKey },
                    timeout: this.timeout * 2 // AI calls may take longer
                }
            );
            
            return {
                success: true,
                response: response.data.response,
                billing: response.data.billing
            };
        } catch (error) {
            throw new Error(`GXEON_THINK_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * execute() - Run agent/plugin execution
     * 
     * Billing: Varies by plugin (see plugin pricing)
     */
    async execute(pluginName, context = {}) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/plugins/execute`,
                { pluginName, context },
                {
                    headers: { 'x-gxeon-key': this.apiKey },
                    timeout: this.timeout * 3 // Plugin execution may take longer
                }
            );
            
            return {
                success: true,
                result: response.data.result,
                billing: response.data.billing
            };
        } catch (error) {
            throw new Error(`GXEON_EXECUTE_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * getBalance() - Check credit balance
     */
    async getBalance() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/billing/balance`,
                {
                    headers: { 'x-gxeon-key': this.apiKey },
                    timeout: this.timeout
                }
            );
            
            return {
                success: true,
                balance: response.data.balance,
                currency: response.data.currency || 'USD'
            };
        } catch (error) {
            throw new Error(`GXEON_BALANCE_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * getUsage() - Get usage statistics
     */
    async getUsage(days = 30) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/billing/usage?days=${days}`,
                {
                    headers: { 'x-gxeon-key': this.apiKey },
                    timeout: this.timeout
                }
            );
            
            return {
                success: true,
                usage: response.data
            };
        } catch (error) {
            throw new Error(`GXEON_USAGE_FAILED: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = { GXEonConnect };
