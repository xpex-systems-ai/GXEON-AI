/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORNIX TELEMETRY INTEGRATION
 * Conecta vendas Cornix ao All-Seeing Eye automaticamente
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Registra uma venda de sinal Cornix no dashboard
 * Deve ser chamado após confirmação de pagamento PIX
 */
export async function recordCornixSale(signalData, paymentData, buyerInfo = {}) {
    try {
        // Inserir na tabela de vendas do Grafana
        const { data: sale, error: saleError } = await supabase
            .from('grafana_cornix_sales')
            .insert({
                signal_id: signalData.signal_id || signalData.id,
                symbol: signalData.symbol,
                side: signalData.side,
                unlock_price_brl: signalData.unlock_price_brl || 29.90,
                payment_status: paymentData.status || 'PAID',
                payment_method: paymentData.method || 'PIX',
                pix_tx_id: paymentData.tx_id || paymentData.pix_tx_id,
                buyer_region: buyerInfo.region || 'Unknown',
                buyer_country: buyerInfo.country || 'BR',
                conversion_source: buyerInfo.source || 'organic'
            })
            .select()
            .single();

        if (saleError) throw saleError;

        // Log de AI
        await logAIEvent('cornix_monetization', 'SUCCESS', 
            `Venda realizada: ${signalData.symbol} ${signalData.side} - R$ ${signalData.unlock_price_brl || 29.90}`,
            {
                sale_id: sale.id,
                signal_id: signalData.signal_id,
                tx_id: paymentData.tx_id,
                buyer_country: buyerInfo.country
            }
        );

        // Verificar se atingiu threshold de alerta
        await checkProfitThreshold();

        console.log(`💰 [Telemetry] Venda registrada: ${sale.id}`);
        return { success: true, sale };

    } catch (error) {
        console.error('❌ [Telemetry] Erro ao registrar venda:', error.message);
        
        await logAIEvent('cornix_monetization', 'ERROR', 
            'Falha ao registrar venda no telemetry',
            { error: error.message, signal_id: signalData.signal_id }
        );
        
        return { success: false, error: error.message };
    }
}

/**
 * Atualiza métricas financeiras em tempo real
 */
export async function updateFinancialMetrics() {
    try {
        // Calcular receita das últimas 24h
        const { data: sales24h, error: salesError } = await supabase
            .from('grafana_cornix_sales')
            .select('unlock_price_brl')
            .gte('sold_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .eq('payment_status', 'PAID');

        if (salesError) throw salesError;

        const revenue24h = sales24h?.reduce((sum, s) => sum + (s.unlock_price_brl || 0), 0) || 0;
        const volume24h = sales24h?.length || 0;

        // Calcular receita total acumulada
        const { data: allSales, error: allError } = await supabase
            .from('grafana_cornix_sales')
            .select('unlock_price_brl')
            .eq('payment_status', 'PAID');

        if (allError) throw allError;

        const totalBalance = allSales?.reduce((sum, s) => sum + (s.unlock_price_brl || 0), 0) || 0;

        // Inserir métricas financeiras
        const { error: insertError } = await supabase
            .from('grafana_financial_master')
            .insert({
                real_time_balance: totalBalance,
                accumulated_pnl_24h: revenue24h * 0.95, // 95% margin
                net_profit_24h: revenue24h * 0.95,
                total_gas_24h: revenue24h * 0.05, // 5% PIX fees
                transaction_volume_24h: volume24h,
                roi_24h_pct: volume24h > 0 ? (revenue24h * 0.95) / (volume24h * 29.90) * 100 : 0,
                stripe_revenue: 0,
                paypal_revenue: 0,
                web3_revenue: 0,
                internal_wallet_revenue: revenue24h
            });

        if (insertError) throw insertError;

        console.log(`📊 [Telemetry] Métricas financeiras atualizadas: R$ ${revenue24h.toFixed(2)} (24h)`);
        return { success: true, revenue24h, volume24h };

    } catch (error) {
        console.error('❌ [Telemetry] Erro ao atualizar métricas:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Registra evento de AI para logs
 */
async function logAIEvent(agentName, level, message, context = {}) {
    try {
        await supabase
            .from('grafana_ai_logs')
            .insert({
                agent_name: agentName,
                log_level: level,
                message: message,
                context: context
            });
    } catch (error) {
        // Silenciar erro de log
        console.debug('Log AI falhou:', error.message);
    }
}

/**
 * Verifica se atingiu threshold de lucro para alerta
 */
async function checkProfitThreshold() {
    try {
        const { data: sales, error } = await supabase
            .from('grafana_cornix_sales')
            .select('unlock_price_brl')
            .gte('sold_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .eq('payment_status', 'PAID');

        if (error) throw error;

        const revenue = sales?.reduce((sum, s) => sum + (s.unlock_price_brl || 0), 0) || 0;
        const profit = revenue * 0.95;

        // Se lucro > R$ 1000, registrar alerta
        if (profit > 1000) {
            await supabase
                .from('grafana_alert_history')
                .insert({
                    alert_name: 'Profit Threshold Reached',
                    alert_type: 'FINANCIAL',
                    severity: 'INFO',
                    message: `💰 Lucro de R$ ${profit.toFixed(2)} atingido nas últimas 24h!`,
                    metric_value: profit,
                    threshold_value: 1000
                });

            await logAIEvent('alert_system', 'INFO', 
                `Profit threshold atingido: R$ ${profit.toFixed(2)}`,
                { threshold: 1000, actual: profit }
            );

            console.log(`🚨 [Telemetry] ALERTA: Profit threshold atingido! R$ ${profit.toFixed(2)}`);
        }

    } catch (error) {
        console.error('❌ [Telemetry] Erro ao verificar threshold:', error.message);
    }
}

/**
 * Obtém resumo de vendas para dashboard
 */
export async function getSalesSummary(timeRange = '24h') {
    try {
        const interval = timeRange === '24h' ? 24 * 60 * 60 * 1000 :
                        timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                        timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                        24 * 60 * 60 * 1000;

        const { data: sales, error } = await supabase
            .from('grafana_cornix_sales')
            .select('*')
            .gte('sold_at', new Date(Date.now() - interval).toISOString())
            .order('sold_at', { ascending: false });

        if (error) throw error;

        const paid = sales?.filter(s => s.payment_status === 'PAID') || [];
        const revenue = paid.reduce((sum, s) => sum + (s.unlock_price_brl || 0), 0);
        const profit = revenue * 0.95;

        return {
            success: true,
            time_range: timeRange,
            total_sales: sales?.length || 0,
            paid_sales: paid.length,
            pending_sales: (sales?.length || 0) - paid.length,
            total_revenue_brl: revenue,
            net_profit_brl: profit,
            avg_price_brl: paid.length > 0 ? revenue / paid.length : 0,
            sales
        };

    } catch (error) {
        console.error('❌ [Telemetry] Erro ao obter resumo:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Hook para webhook de PIX confirmado
 */
export async function onPixConfirmed(pixData, signalData) {
    console.log('📡 [Telemetry] PIX confirmado recebido');
    
    // Registrar venda
    const saleResult = await recordCornixSale(
        signalData,
        {
            status: 'PAID',
            method: 'PIX',
            tx_id: pixData.pix_tx_id
        },
        {
            region: pixData.buyer_region || 'Unknown',
            country: pixData.buyer_country || 'BR',
            source: pixData.utm_source || 'organic'
        }
    );

    // Atualizar métricas financeiras
    await updateFinancialMetrics();

    return saleResult;
}

export default {
    recordCornixSale,
    updateFinancialMetrics,
    getSalesSummary,
    onPixConfirmed
};
