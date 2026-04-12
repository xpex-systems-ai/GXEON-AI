const supabase = require('./supabase');
const axios = require('axios');

/**
 * SERVIÇO: GUARDIAN_SYSTEM
 * O sistema imunológico do GXEON.
 */
class GuardianService {
    static async startMonitoring() {
        console.log("[GXEON_GUARDIAN] Sistema Imunológico Ativo.");
        
        setInterval(async () => {
            await this.checkStuckTransactions();
            await this.checkAgentHealth();
        }, 60000); // Check a cada 1 minuto
    }

    static async checkStuckTransactions() {
        const { data: stuck } = await supabase
            .from('billing_transactions')
            .select('*')
            .eq('status', 'reserved')
            .lt('created_at', new Date(Date.now() - 5 * 60000).toISOString());

        if (stuck && stuck.length > 0) {
            console.log(`[GUARDIAN] Detectadas ${stuck.length} transações travadas. Iniciando estorno.`);
            for (const tx of stuck) {
                await supabase.rpc('refund_credits', { tx_id_input: tx.id });
            }
        }
    }

    static async checkAgentHealth() {
        // Lógica para chamar a API do Railway e dar RESTART se necessário
        // Se status !== 'running', execute: axios.post(RAILWAY_REDEPLOY_WEBHOOK)
    }
}

module.exports = GuardianService;
