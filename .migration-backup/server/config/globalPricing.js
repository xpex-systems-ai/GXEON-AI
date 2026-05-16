/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GLOBAL PRICING CONFIG — GXZ1 SOVEREIGN REVENUE CORE
 * Multi-moeda: BRL (Pix), USD (PayPal), USDT (Crypto)
 * Versão: 1.0 - Full Production
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const GLOBAL_PRICING = {
    system_id: 'GXZ1_SOVEREIGN_REVENUE_CORE',
    version: '1.0.0_GLOBAL',
    base_currency: 'BRL',
    
    // Tabela de preços por tier e moeda
    revenue_tiers: {
        // Sinal avulso - Micro transação
        retail_signal: {
            BRL: { amount: 4.90, gateway: 'MercadoPago_Pix', method: 'PIX', description: 'Pix avulso' },
            USD: { amount: 0.99, gateway: 'PayPal_Checkout', method: 'CARD', description: 'Single signal' },
            USDT: { amount: 1.00, gateway: 'GXeon_Crypto', method: 'CRYPTO', network: 'Arbitrum' }
        },
        
        // Passe Semanal
        weekly_pass: {
            BRL: { amount: 59.90, gateway: 'MercadoPago', method: 'CARD', description: 'Passe 7 dias' },
            USD: { amount: 12.00, gateway: 'PayPal', method: 'CARD', description: 'Weekly pass' },
            USDT: { amount: 12.00, gateway: 'GXeon_Crypto', method: 'CRYPTO', network: 'Polygon' }
        },
        
        // Assinatura Pro Mensal
        pro_subscription: {
            BRL: { amount: 247.00, gateway: 'MercadoPago', method: 'CARD', description: 'Pro mensal' },
            USD: { amount: 49.00, gateway: 'PayPal', method: 'CARD', description: 'Pro monthly' },
            USDT: { amount: 45.00, gateway: 'GXeon_Crypto', method: 'CRYPTO', network: 'Arbitrum' }
        },
        
        // API B2B
        b2b_api_access: {
            BRL: { amount: 5000.00, gateway: 'MercadoPago', method: 'BANK_TRANSFER', description: 'Acesso API' },
            USD: { amount: 990.00, gateway: 'PayPal', method: 'CARD', description: 'B2B API access' },
            USDT: { amount: 900.00, gateway: 'GXeon_Crypto', method: 'CRYPTO', network: 'Binance_Smart_Chain' }
        }
    },
    
    // Mapeamento de país para moeda e gateway padrão
    geo_routing: {
        BR: { currency: 'BRL', gateway: 'MercadoPago_Pix', method: 'PIX' },
        US: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        CA: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        GB: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        DE: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        FR: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        PT: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        ES: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        IT: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        NL: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        AU: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        JP: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        // Latinoamérica
        AR: { currency: 'USD', gateway: 'MercadoPago_International', method: 'CARD' },
        CL: { currency: 'USD', gateway: 'MercadoPago_International', method: 'CARD' },
        MX: { currency: 'USD', gateway: 'MercadoPago_International', method: 'CARD' },
        CO: { currency: 'USD', gateway: 'MercadoPago_International', method: 'CARD' },
        PE: { currency: 'USD', gateway: 'MercadoPago_International', method: 'CARD' },
        // Default para mundo
        DEFAULT: { currency: 'USD', gateway: 'PayPal_Checkout', method: 'CARD' },
        // Crypto é sempre uma opção para todos
        SOVEREIGN: { currency: 'USDT', gateway: 'GXeon_Crypto', method: 'CRYPTO' }
    },
    
    // Taxas de câmbio (atualizadas via API a cada 15 min)
    exchange_rates: {
        USD_TO_BRL: 5.85,
        EUR_TO_BRL: 6.35,
        USDT_TO_BRL: 5.85,
        BTC_TO_BRL: 350000.00
    },
    
    // Margem de segurança cambial (5%)
    spread_adjustment: 1.05,
    
    // Atualização de taxas (15 minutos)
    rate_refresh_interval: '15m'
};

// Função para obter preço por país
export function getPricingByCountry(tier, countryCode) {
    const routing = GLOBAL_PRICING.geo_routing[countryCode] || GLOBAL_PRICING.geo_routing.DEFAULT;
    const pricing = GLOBAL_PRICING.revenue_tiers[tier]?.[routing.currency];
    
    if (!pricing) {
        // Fallback para USD
        return {
            ...GLOBAL_PRICING.revenue_tiers[tier].USD,
            currency: 'USD',
            country: countryCode,
            fallback: true
        };
    }
    
    return {
        ...pricing,
        currency: routing.currency,
        country: countryCode,
        gateway: routing.gateway,
        method: routing.method
    };
}

// Função para converter para BRL (moeda base)
export function convertToBRL(amount, currency) {
    const rates = GLOBAL_PRICING.exchange_rates;
    let rate = 1;
    
    switch(currency) {
        case 'USD': rate = rates.USD_TO_BRL; break;
        case 'EUR': rate = rates.EUR_TO_BRL; break;
        case 'USDT': rate = rates.USDT_TO_BRL; break;
        case 'BTC': rate = rates.BTC_TO_BRL; break;
        case 'BRL': rate = 1; break;
    }
    
    // Aplicar spread de segurança
    rate *= GLOBAL_PRICING.spread_adjustment;
    
    return {
        original_amount: amount,
        original_currency: currency,
        base_amount: amount * rate,
        base_currency: 'BRL',
        exchange_rate: rate,
        spread_applied: GLOBAL_PRICING.spread_adjustment
    };
}

// Detectar moeda por IP/Header
export function detectCurrency(req) {
    // Simulação por header (para testes)
    const simulatedCountry = req.headers['x-simulate-country'];
    if (simulatedCountry) {
        return getPricingByCountry('retail_signal', simulatedCountry).currency;
    }
    
    // Detectar por Accept-Language
    const lang = req.headers['accept-language'];
    if (lang?.includes('pt-BR')) return 'BRL';
    if (lang?.includes('en-US')) return 'USD';
    if (lang?.includes('en-GB')) return 'USD';
    
    // Default
    return 'USD';
}

export default GLOBAL_PRICING;
