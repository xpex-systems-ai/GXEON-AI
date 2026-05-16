const supabase = require('./supabase');

/**
 * AGENT SERVICE - Core Execution Logic
 * 
 * Principles:
 * - Service is billing-agnostic (doesn't know about credits)
 * - Throws errors on failure (route handles refunds)
 * - Receives tx_id for logging/auditing only
 */

class AgentService {
    
    /**
     * Main execution entry point
     * @param {string} agentType - Type of agent to execute
     * @param {object} payload - Task payload
     * @param {string} tx_id - Billing transaction ID (for audit logging)
     * @returns {Promise<object>} Execution result
     */
    async run(agentType, payload, tx_id) {
        console.log(`[AgentService] Executing ${agentType} | TX: ${tx_id}`);
        
        try {
            let result;
            
            // Route to specific agent implementation
            switch(agentType) {
                case 'orchestrator':
                    result = await this.orchestratorAI(payload, tx_id);
                    break;
                    
                case 'huggingface':
                    result = await this.huggingfaceAgent(payload, tx_id);
                    break;
                    
                case 'deepseek':
                    result = await this.deepseekAgent(payload, tx_id);
                    break;
                    
                case 'grok':
                    result = await this.grokAgent(payload, tx_id);
                    break;
                    
                case 'chatgpt':
                    result = await this.chatgptAgent(payload, tx_id);
                    break;
                    
                case 'wallet':
                    result = await this.walletService(payload, tx_id);
                    break;
                    
                case 'microtasks':
                    result = await this.microtaskService(payload, tx_id);
                    break;
                    
                case 'contracts':
                    result = await this.contractService(payload, tx_id);
                    break;
                    
                case 'aletix':
                case 'shix':
                    result = await this.aletixAgent(payload, tx_id);
                    break;
                    
                default:
                    // Generic AI processing for unknown types
                    result = await this.genericAIProcess(agentType, payload, tx_id);
            }
            
            // Log success for audit trail
            await this.logExecution(tx_id, agentType, 'success', result);
            
            return result;
            
        } catch (error) {
            // Log failure before throwing (route will handle refund)
            await this.logExecution(tx_id, agentType, 'failed', { error: error.message });
            
            // Re-throw with context for route handler
            throw new Error(`AGENT_CRITICAL_FAILURE [${agentType}]: ${error.message}`);
        }
    }

    /**
     * Aletix/Shix Agent - Social/Web Scraping
     */
    async aletixAgent(payload, tx_id) {
        const { url, action, selector } = payload;
        
        if (!url) {
            throw new Error('URL is required for Aletix agent');
        }
        
        try {
            // Simulated scraping logic
            // In production: Use puppeteer, cheerio, or external scraper
            const mockResult = {
                url,
                action,
                data: `Scraped data from ${url}`,
                timestamp: new Date().toISOString(),
                tx_id
            };
            
            return {
                success: true,
                agent: 'aletix',
                result: mockResult
            };
            
        } catch (error) {
            throw new Error(`Aletix scraping failed: ${error.message}`);
        }
    }

    /**
     * Orchestrator AI - Multi-agent coordination
     */
    async orchestratorAI(payload, tx_id) {
        const { message, agents, context } = payload;
        
        if (!message) {
            throw new Error('Message is required for orchestrator');
        }
        
        try {
            // Route message to appropriate agents
            const replies = [];
            const targetAgents = agents || ['orquestrador'];
            
            for (const agent of targetAgents) {
                const reply = await this.routeToAgent(agent, message, context, tx_id);
                replies.push({ agent, reply });
            }
            
            return {
                success: true,
                replies,
                orchestrated_agents: targetAgents,
                tx_id
            };
            
        } catch (error) {
            throw new Error(`Orchestrator failed: ${error.message}`);
        }
    }

    /**
     * HuggingFace Agent
     */
    async huggingfaceAgent(payload, tx_id) {
        const apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!apiKey) {
            throw new Error('HUGGINGFACE_API_KEY not configured');
        }
        
        try {
            // Simulated API call
            return {
                success: true,
                agent: 'huggingface',
                result: 'HuggingFace response simulated',
                tx_id
            };
        } catch (error) {
            throw new Error(`HuggingFace API error: ${error.message}`);
        }
    }

    /**
     * DeepSeek Agent
     */
    async deepseekAgent(payload, tx_id) {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            throw new Error('DEEPSEEK_API_KEY not configured');
        }
        
        return {
            success: true,
            agent: 'deepseek',
            result: 'DeepSeek response simulated',
            tx_id
        };
    }

    /**
     * Grok Agent
     */
    async grokAgent(payload, tx_id) {
        const apiKey = process.env.GROK_API_KEY;
        if (!apiKey) {
            throw new Error('GROK_API_KEY not configured');
        }
        
        return {
            success: true,
            agent: 'grok',
            result: 'Grok response simulated',
            tx_id
        };
    }

    /**
     * ChatGPT/OpenRouter Agent
     */
    async chatgptAgent(payload, tx_id) {
        const { prompt, messages } = payload;
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini',
                    messages: messages || [{ role: 'user', content: prompt }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                agent: 'chatgpt',
                result: data.choices?.[0]?.message?.content || 'No response',
                tx_id
            };
            
        } catch (error) {
            throw new Error(`ChatGPT/OpenRouter error: ${error.message}`);
        }
    }

    /**
     * Wallet Service
     */
    async walletService(payload, tx_id) {
        const { action, amount, to_address } = payload;
        
        try {
            // Simulated wallet operation
            // In production: Web3 integration
            return {
                success: true,
                agent: 'wallet',
                action,
                result: {
                    status: 'simulated',
                    tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
                    tx_id
                }
            };
        } catch (error) {
            throw new Error(`Wallet operation failed: ${error.message}`);
        }
    }

    /**
     * Microtask Service
     */
    async microtaskService(payload, tx_id) {
        const { task_type, reward } = payload;
        
        try {
            // Create microtask in database
            const { data, error } = await supabase
                .from('microtasks')
                .insert({
                    task_type,
                    reward,
                    status: 'pending',
                    billing_tx_id: tx_id,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return {
                success: true,
                agent: 'microtasks',
                result: data,
                tx_id
            };
        } catch (error) {
            throw new Error(`Microtask creation failed: ${error.message}`);
        }
    }

    /**
     * Smart Contract Service
     */
    async contractService(payload, tx_id) {
        const { contract_address, method, params } = payload;
        
        if (!contract_address || !method) {
            throw new Error('contract_address and method are required');
        }
        
        try {
            // Simulated contract interaction
            return {
                success: true,
                agent: 'contracts',
                result: {
                    contract_address,
                    method,
                    params,
                    status: 'simulated',
                    tx_id
                }
            };
        } catch (error) {
            throw new Error(`Contract execution failed: ${error.message}`);
        }
    }

    /**
     * Generic AI Processing (fallback)
     */
    async genericAIProcess(agentType, payload, tx_id) {
        return {
            success: true,
            agent: agentType,
            result: `Generic processing for ${agentType}`,
            tx_id
        };
    }

    /**
     * Route message to specific agent (helper)
     */
    async routeToAgent(agent, message, context, tx_id) {
        // Simple routing logic
        switch(agent) {
            case 'orquestrador':
                return `Orquestrador processou: "${message}"`;
            case 'aletix':
                return await this.aletixAgent({ action: 'analyze', url: message }, tx_id);
            default:
                return `Agent ${agent} não implementado`;
        }
    }

    /**
     * Log execution for audit trail
     */
    async logExecution(tx_id, agent_type, status, result) {
        try {
            await supabase.from('agent_execution_logs').insert({
                billing_tx_id: tx_id,
                agent_type,
                status,
                result_summary: JSON.stringify(result).substring(0, 1000),
                logged_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[AgentService] Log failed for TX ${tx_id}:`, error);
            // Don't throw - logging failures shouldn't break execution
        }
    }
}

// Export singleton instance
module.exports = new AgentService();
