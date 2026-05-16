/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIX CRITICAL ISSUES — GXEON Monetization System
 * Addresses: Hardcoded keys, security gaps, configuration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔧 FIX CRITICAL ISSUES — GXEON Monetization');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

const ISSUES = [
    {
        id: 1,
        title: 'Move PIX keys from hardcoded to .env',
        file: 'server/services/mercadoPagoIntegration.js',
        severity: 'CRITICAL',
        action: fixPixKeys
    },
    {
        id: 2,
        title: 'Add rate limiting to sensitive endpoints',
        file: 'server/middleware/rateLimiter.js',
        severity: 'HIGH',
        action: fixRateLimiting
    },
    {
        id: 3,
        title: 'Create missing environment variables template',
        file: '.env',
        severity: 'MEDIUM',
        action: fixEnvTemplate
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// FIX 1: Move PIX keys to .env
// ═══════════════════════════════════════════════════════════════════════════
async function fixPixKeys() {
    console.log('\n🔧 FIX 1: Moving PIX keys to environment variables');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const filePath = path.join(__dirname, '..', 'server/services/mercadoPagoIntegration.js');
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ File not found:', filePath);
        return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already fixed
    if (content.includes('process.env.PIX_CHAVE')) {
        console.log('✅ Already using environment variables');
        return true;
    }
    
    // Extract hardcoded keys
    const chaveMatch = content.match(/aleatoria:\s*['"]([a-f0-9-]{36})['"]/i);
    const emailMatch = content.match(/email:\s*['"]([^'"]+)['"]/i);
    const cpfMatch = content.match(/cpf:\s*['"]([\d]{11})['"]/i);
    
    if (chaveMatch) {
        console.log('⚠️  Found hardcoded PIX chave:', chaveMatch[1].substring(0, 8) + '...');
    }
    
    // Show what needs to be added to .env
    console.log('\n📋 Add the following to your .env file:');
    console.log('───────────────────────────────────────────────────────────────────────────');
    if (chaveMatch) console.log(`PIX_CHAVE=${chaveMatch[1]}`);
    if (emailMatch) console.log(`PIX_EMAIL=${emailMatch[1]}`);
    if (cpfMatch) console.log(`PIX_CPF=${cpfMatch[1]}`);
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    // Ask for confirmation
    return new Promise((resolve) => {
        rl.question('\n⚡ Do you want me to update the code to use environment variables? (yes/no): ', (answer) => {
            if (answer.toLowerCase() === 'yes') {
                // Replace hardcoded config with env-based
                const newConfig = `// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO PIX - MERCADO PAGO (ENV-based)
// ═══════════════════════════════════════════════════════════════════════════
const PIX_CONFIG = {
  // Chaves PIX do Comandante (from environment)
  chaves: {
    aleatoria: process.env.PIX_CHAVE || '',
    email: process.env.PIX_EMAIL || '',
    cpf: process.env.PIX_CPF || ''
  },
  
  // Beneficiário
  beneficiary: {
    nome: process.env.PIX_BENEFICIARIO || 'Junior Sena',
    cidade: process.env.PIX_CIDADE || 'SAO PAULO'
  },
  
  // Preços (em reais)
  pricing_brl: {
    PRO: 25.00,        // ~$5 USD
    ENTERPRISE: 250.00  // ~$50 USD
  },
  
  // Cidade padrão para QR Code
  cidade: process.env.PIX_CIDADE || 'SAO PAULO'
};`;
                
                // Replace the old config section
                content = content.replace(
                    /\/\/ ═══════════════════════════════════════════════════════════════════════════\n\/\/ CONFIGURAÇÃO PIX - MERCADO PAGO \(HARDCODED OPERACIONAL\)[\s\S]*?\/\/ Cidade padrão para QR Code\n  cidade: 'SAO PAULO'\n};/,
                    newConfig
                );
                
                // Write backup first
                const backupPath = filePath + '.backup_' + Date.now();
                fs.writeFileSync(backupPath, fs.readFileSync(filePath));
                console.log('💾 Backup created:', backupPath);
                
                // Write updated file
                fs.writeFileSync(filePath, content);
                console.log('✅ Code updated to use environment variables');
                console.log('⚠️  IMPORTANT: Make sure to add PIX keys to .env before starting server');
                resolve(true);
            } else {
                console.log('⚠️  Skipped. Remember to manually fix this security issue!');
                resolve(false);
            }
            
            rl.close();
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX 2: Add rate limiting
// ═══════════════════════════════════════════════════════════════════════════
async function fixRateLimiting() {
    console.log('\n🔧 FIX 2: Rate Limiting Configuration');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const rateLimiterPath = path.join(__dirname, '..', 'server/middleware/rateLimiter.js');
    
    if (!fs.existsSync(rateLimiterPath)) {
        console.log('⚠️  rateLimiter.js not found, creating...');
        
        const rateLimiterCode = `/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RATE LIMITER — GXEON Security Layer
 * ═══════════════════════════════════════════════════════════════════════════
 */

import rateLimit from 'express-rate-limit';
import Redis from 'redis';

// In-memory store (use Redis in production)
const requests = new Map();

// Rate limit configurations
export const rateLimits = {
    // Payment endpoints: 10 requests per minute
    payment: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many payment attempts. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false
    }),
    
    // API endpoints: 100 requests per 15 minutes
    api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded. Please slow down.'
        }
    }),
    
    // General endpoints: 30 requests per minute
    general: rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        skipSuccessfulRequests: true
    })
};

// Actor-specific rate limiting (prevent abuse)
export function actorRateLimit(maxRequests = 5, windowMs = 60000) {
    return (req, res, next) => {
        const actorCode = req.query.ref || req.body.actor_code;
        const ip = req.ip || req.connection.remoteAddress;
        const key = actorCode ? actorCode : ip;
        
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [k, v] of requests.entries()) {
            if (v.timestamp < windowStart) {
                requests.delete(k);
            }
        }
        
        // Check current count
        const current = requests.get(key);
        if (current && current.count >= maxRequests) {
            return res.status(429).json({
                error: 'ACTOR_RATE_LIMIT',
                message: 'Too many requests from this actor/IP',
                retryAfter: Math.ceil((current.timestamp + windowMs - now) / 1000)
            });
        }
        
        // Increment count
        if (current) {
            current.count++;
        } else {
            requests.set(key, { count: 1, timestamp: now });
        }
        
        next();
    };
}

export default rateLimits;
`;
        
        fs.writeFileSync(rateLimiterPath, rateLimiterCode);
        console.log('✅ Created server/middleware/rateLimiter.js');
        console.log('⚠️  Note: Install redis package for production: npm install redis express-rate-limit');
    } else {
        console.log('✅ rateLimiter.js already exists');
    }
    
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX 3: Create .env template
// ═══════════════════════════════════════════════════════════════════════════
async function fixEnvTemplate() {
    console.log('\n🔧 FIX 3: Environment Variables Template');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    const requiredVars = `
# ═══════════════════════════════════════════════════════════════════════════
# GXEON MONETIZATION SYSTEM — ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════

# Supabase
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Internal API Security
INTERNAL_API_KEY=internal_$(date +%s)

# PIX Configuration (MercadoPago)
PIX_CHAVE=your-pix-chave-here
PIX_EMAIL=your-pix-email@example.com
PIX_CPF=your-cpf-here
PIX_BENEFICIARIO=Your Name
PIX_CIDADE=SAO PAULO

# PayPal (when implemented)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
PAYPAL_WEBHOOK_ID=your-webhook-id

# Alchemy (Web3)
ALCHEMY_API_KEY=your-alchemy-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token

# Grafana
GRAFANA_URL=https://your.grafana.net
GRAFANA_API_KEY=your-api-key

# Server
PORT=3000
NODE_ENV=production
`;
    
    // Check if .env exists and has required vars
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check for missing critical vars
    const missingVars = [];
    if (!envContent.includes('PIX_CHAVE')) missingVars.push('PIX_CHAVE');
    if (!envContent.includes('INTERNAL_API_KEY')) missingVars.push('INTERNAL_API_KEY');
    if (!envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    
    if (missingVars.length > 0) {
        console.log('⚠️  Missing critical variables:', missingVars.join(', '));
        console.log('\n📋 Add these to your .env file:');
        console.log(requiredVars);
        
        // Append to .env
        fs.appendFileSync(envPath, requiredVars);
        console.log('✅ Added missing variables to .env');
    } else {
        console.log('✅ All required variables present in .env');
    }
    
    // Create .env.example if not exists
    if (!fs.existsSync(envExamplePath)) {
        fs.writeFileSync(envExamplePath, requiredVars.replace(/your-[^\s]+/g, 'your-value-here'));
        console.log('✅ Created .env.example template');
    }
    
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MENU
// ═══════════════════════════════════════════════════════════════════════════
async function showMenu() {
    console.log('Available fixes:\n');
    
    ISSUES.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'HIGH' ? '🟠' : '🟡';
        console.log(`${icon} [${issue.id}] ${issue.title}`);
        console.log(`    File: ${issue.file}`);
        console.log(`    Severity: ${issue.severity}`);
        console.log('');
    });
    
    console.log('[0] Fix all issues automatically');
    console.log('[Q] Quit');
    console.log('');
    
    rl.question('Select option: ', async (answer) => {
        if (answer === '0') {
            console.log('\n🔧 Fixing all issues...\n');
            for (const issue of ISSUES) {
                await issue.action();
            }
            console.log('\n✅ All fixes applied!');
            console.log('⚠️  Remember to restart your server after making changes.');
            rl.close();
        } else if (answer === '1') {
            await fixPixKeys();
        } else if (answer === '2') {
            await fixRateLimiting();
            rl.close();
        } else if (answer === '3') {
            await fixEnvTemplate();
            rl.close();
        } else if (answer.toLowerCase() === 'q') {
            rl.close();
        } else {
            console.log('Invalid option');
            rl.close();
        }
    });
}

// Run
showMenu();
