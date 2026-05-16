const { gxeonInternalAI } = require('./gxeonInternalAI');

/**
 * SERVIÇO: SALES_CLOSE
 * Transforma leads qualificados em propostas reais.
 */
class SalesService {
    static async generatePitch(leadData) {
        const { handle, context, urgency } = leadData;
        
        const systemPrompt = `Você é o Senior Sales Agent da GXEON AI. 
        Gere uma abordagem curta, ultra-personalizada e persuasiva para o lead @${handle}.
        Contexto do problema dele: ${context}.
        Urgência detectada: ${urgency}/10.
        Tom: Profissional, Cyber-Tech, focado em ROI. 
        Não use emojis genéricos. Use prova de execução.\n
        Responda em formato de mensagem direta (1 parágrafo, max 500 caracteres).`;

        try {
            const pitch = await gxeonInternalAI.fastAnalyze(systemPrompt);
            return {
                success: true,
                target: handle,
                message: pitch,
                strategy: urgency > 7 ? 'DIRECT_CLOSE' : 'CONSULTATIVE_APPROACH'
            };
        } catch (error) {
            throw new Error(`SALES_PITCH_GENERATION_FAILED: ${error.message}`);
        }
    }

    /**
     * Multi-channel pitch strategy (email, DM, comment)
     */
    static async generateMultiChannelPitch(leadData, channels = ['dm']) {
        const pitches = {};
        
        for (const channel of channels) {
            switch(channel) {
                case 'dm':
                    pitches.dm = await this.generateDM(leadData);
                    break;
                case 'email':
                    pitches.email = await this.generateEmail(leadData);
                    break;
                case 'comment':
                    pitches.comment = await this.generateComment(leadData);
                    break;
            }
        }

        return {
            success: true,
            target: leadData.handle,
            channels: pitches,
            priority: leadData.urgency > 7 ? 'high' : 'medium'
        };
    }

    static async generateDM(leadData) {
        const { handle, context, urgency } = leadData;
        
        const prompt = `Gerar DM curto e direto para @${handle}. Contexto: ${context}. 
        Urgência: ${urgency}/10. Max 280 caracteres. Tom: Cyber-Tech profissional.`;
        
        return await gxeonInternalAI.fastAnalyze(prompt);
    }

    static async generateEmail(leadData) {
        const { handle, context } = leadData;
        
        const prompt = `Gerar email profissional para ${handle}. 
        Contexto do problema: ${context}
        Estrutura: Assunto cativante, 2 parágrafos, CTA clara.`;
        
        return await gxeonInternalAI.fastAnalyze(prompt);
    }

    static async generateComment(leadData) {
        const { handle, context } = leadData;
        
        const prompt = `Gerar comentário público engajador para ${handle}. 
        Contexto: ${context}
        Max 200 caracteres. Não soar como spam.`;
        
        return await gxeonInternalAI.fastAnalyze(prompt);
    }
}

module.exports = SalesService;
