const { Configuration, OpenAIApi } = require("openai");
const { getNativeFetch } = require('../runtime/compatibility.cjs');
const fetch = getNativeFetch();

/**
 * GXEON Internal AI Service
 * Unified interface for internal AI calls (used by plugins)
 * Wraps OpenRouter/OpenAI with billing attribution
 */

class GxeonInternalAI {
    constructor() {
        this.openrouterKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
    }

    /**
     * Fast analysis for internal plugins (low latency, simple tasks)
     * @param {string} prompt - Analysis prompt
     * @param {string} billingContext - Transaction ID for attribution
     * @returns {Promise<string>} AI response
     */
    async fastAnalyze(prompt, billingContext = null) {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'GXEON Internal AI'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o-mini', // Fast, cost-effective
                    messages: [
                        { role: 'system', content: 'You are an analysis engine. Return only valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1, // Low temperature for consistency
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from AI');
            }

            // Log internal AI usage if billing context provided
            if (billingContext) {
                await this.logInternalUsage(billingContext, prompt.length, content.length);
            }

            return content;

        } catch (error) {
            console.error('[GxeonInternalAI] Fast analyze failed:', error);
            throw error;
        }
    }

    /**
     * Deep analysis for complex tasks (higher quality, higher latency)
     * @param {string} prompt - Analysis prompt
     * @param {string} billingContext - Transaction ID for attribution
     * @returns {Promise<string>} AI response
     */
    async deepAnalyze(prompt, billingContext = null) {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'GXEON Internal AI'
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet', // Higher quality
                    messages: [
                        { role: 'system', content: 'You are an expert analysis engine. Provide detailed, accurate analysis.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (billingContext) {
                await this.logInternalUsage(billingContext, prompt.length, content.length, 'deep');
            }

            return content;

        } catch (error) {
            console.error('[GxeonInternalAI] Deep analyze failed:', error);
            throw error;
        }
    }

    /**
     * Sentiment analysis helper (used by social_sentiment plugin)
     * @param {string} text - Text to analyze
     * @param {string} billingContext - Transaction ID
     * @returns {Promise<Object>} Parsed sentiment object
     */
    async analyzeSentiment(text, billingContext = null) {
        const prompt = `Analise o seguinte texto e retorne APENAS um JSON válido no formato:
{
  "sentiment": "positivo|negativo|neutro",
  "urgency": <number 0-10>,
  "is_lead": <true|false>,
  "confidence": <number 0-1>,
  "keywords": [<array de palavras-chave>]
}

Texto: "${text.substring(0, 1000)}"`;

        try {
            const response = await this.fastAnalyze(prompt, billingContext);
            
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                             response.match(/{[\s\S]*?}/);
            
            const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
            const parsed = JSON.parse(jsonStr);
            
            return parsed;

        } catch (error) {
            console.error('[GxeonInternalAI] Sentiment analysis parse failed:', error);
            // Return default structure on parse failure
            return {
                sentiment: 'neutro',
                urgency: 5,
                is_lead: false,
                confidence: 0,
                keywords: [],
                parse_error: true
            };
        }
    }

    /**
     * Log internal AI usage for cost tracking
     */
    async logInternalUsage(billingTxId, inputTokens, outputTokens, analysisType = 'fast') {
        try {
            const supabase = require('./supabase');
            await supabase.from('internal_ai_usage').insert({
                billing_tx_id: billingTxId,
                analysis_type: analysisType,
                input_chars: inputTokens,
                output_chars: outputTokens,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('[GxeonInternalAI] Usage log failed:', error);
        }
    }
}

// Export singleton
const gxeonInternalAI = new GxeonInternalAI();

// Also export class for testing
module.exports = { GxeonInternalAI, gxeonInternalAI };
