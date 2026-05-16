/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GEO-CURRENCY DETECTOR — GXZ1 SOVEREIGN CORE
 * Detecta origem do usuário e define moeda/gateway
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getPricingByCountry, detectCurrency } from '../config/globalPricing.js';

export async function geoCurrencyMiddleware(req, res, next) {
    try {
        // Pegar IP real (considerando proxies)
        const userIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                       req.headers['x-real-ip'] ||
                       req.socket.remoteAddress || 
                       '127.0.0.1';
        
        // Detecção de país por múltiplos métodos
        let countryCode = detectCountry(req);
        
        // Obter preço na moeda local
        const pricing = getPricingByCountry('retail_signal', countryCode);
        
        // Anexar dados ao request
        req.userGeo = {
            ip: userIp,
            country: countryCode,
            detected_at: new Date().toISOString()
        };
        
        req.userPricing = {
            tier: 'retail_signal',
            ...pricing
        };
        
        console.log(`🌍 [GeoDetect] ${countryCode} | ${pricing.currency} | ${pricing.method} | R$ ${pricing.amount || pricing.amount_brl}`);
        
        next();
    } catch (error) {
        console.error('❌ [GeoDetect] Erro:', error.message);
        // Fallback seguro
        req.userGeo = { country: 'BR', ip: 'unknown' };
        req.userPricing = getPricingByCountry('retail_signal', 'BR');
        next();
    }
}

// Função de detecção de país
function detectCountry(req) {
    // 1. Header de simulação (para testes)
    const simulateCountry = req.headers['x-simulate-country'];
    if (simulateCountry) {
        console.log(`🧪 [Simulação] País: ${simulateCountry}`);
        return simulateCountry;
    }
    
    // 2. Accept-Language
    const acceptLang = req.headers['accept-language'];
    if (acceptLang) {
        if (acceptLang.includes('pt-BR')) return 'BR';
        if (acceptLang.includes('en-US')) return 'US';
        if (acceptLang.includes('en-GB')) return 'GB';
        if (acceptLang.includes('es-AR')) return 'AR';
        if (acceptLang.includes('es-CL')) return 'CL';
        if (acceptLang.includes('es-MX')) return 'MX';
        if (acceptLang.includes('de')) return 'DE';
        if (acceptLang.includes('fr')) return 'FR';
        if (acceptLang.includes('it')) return 'IT';
    }
    
    // 3. Cloudflare Country Header (se estiver atrás do Cloudflare)
    const cfCountry = req.headers['cf-ipcountry'];
    if (cfCountry) return cfCountry;
    
    // 4. Default (Brasil)
    return 'BR';
}

// Middleware para forçar país específico (testes)
export function simulateCountryMiddleware(countryCode) {
    return (req, res, next) => {
        req.headers['x-simulate-country'] = countryCode;
        next();
    };
}

// Endpoint para testar detecção
export async function testGeoDetection(req, res) {
    const testCountries = ['BR', 'US', 'DE', 'AR', 'JP'];
    
    const results = testCountries.map(country => {
        const pricing = getPricingByCountry('retail_signal', country);
        const pricingPro = getPricingByCountry('pro_subscription', country);
        
        return {
            country,
            currency: pricing.currency,
            signal_price: pricing.amount,
            gateway: pricing.gateway,
            method: pricing.method,
            pro_monthly: pricingPro.amount
        };
    });
    
    res.json({
        success: true,
        your_country: req.userGeo?.country || 'unknown',
        your_currency: req.userPricing?.currency || 'unknown',
        your_price: req.userPricing?.amount || 'unknown',
        all_tiers: results
    });
}

export default { geoCurrencyMiddleware, simulateCountryMiddleware, testGeoDetection };
