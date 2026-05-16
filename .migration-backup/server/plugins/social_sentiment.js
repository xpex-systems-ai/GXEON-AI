const { gxeonInternalAI } = require('../services/gxeonInternalAI');

/**
 * PLUGIN: SOCIAL_SENTIMENT
 * Capacidade: Análise de intenção e sentimento para qualificação de leads.
 */
exports.run = async (context) => {
    const { text_input, billing_tx_id } = context;
    
    // Prompt de Sistema para Extração de Intenção
    const prompt = `Analise o seguinte texto e retorne APENAS um JSON:
    { "sentiment": "positivo|negativo|neutro", "urgency": 0-10, "is_lead": true|false }
    Texto: "${text_input.substring(0, 1000)}"`;

    try {
        // Usa a infraestrutura de Proxy GXEON já criada para chamar o LLM
        const response = await gxeonInternalAI.analyzeSentiment(text_input, billing_tx_id); 
        
        return {
            success: true,
            data: response,
            plugin: 'SOCIAL_SENTIMENT'
        };
    } catch (error) {
        throw new Error(`SENTIMENT_ANALYSIS_FAILED: ${error.message}`);
    }
};
