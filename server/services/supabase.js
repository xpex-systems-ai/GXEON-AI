import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM_HARDENING_V10 - REAL_MONETIZATION_READY
// Segurança bancária Web3 - Sem tokens hardcoded
// ═══════════════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// 🔒 VALIDAÇÃO DE SEGURANÇA: Não inicializa sem credenciais válidas
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [SECURITY] Missing required environment variables:');
  if (!supabaseUrl) console.error('   - SUPABASE_PROJECT_URL ou SUPABASE_URL');
  if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_KEY');
  console.error('❌ [SECURITY] Client will be null - System cannot operate');
  process.exit(1);
}

// 🔒 VALIDAÇÃO: Formato JWT mínimo
if (supabaseKey.length < 100 || !supabaseKey.includes('.')) {
  console.error('❌ [SECURITY] Invalid Supabase key format');
  process.exit(1);
}

let supabase = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'gxeon-fleet-v9',
        'x-client-info': 'production-hardened'
      }
    }
  });
  
  // ⚡ SILENT MODE: Log apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log('[🔥 SOVEREIGN] Supabase client initialized');
    console.log('[🔥 SOVEREIGN] Project:', supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown');
  }
} catch (error) {
  console.error('❌ [SECURITY] Failed to initialize Supabase:', error.message);
  process.exit(1);
}

export default supabase;
