-- ═══════════════════════════════════════════════════════════════════════════
-- 🚨 EXECUTE AGORA NO SUPABASE SQL EDITOR
-- Corrige o erro: "Could not find the 'api_key' column of 'actors'"
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna api_key
ALTER TABLE actors ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- 2. Adicionar coluna status  
ALTER TABLE actors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';

-- 3. Adicionar coluna tier
ALTER TABLE actors ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'BASIC';

-- 4. Criar índice
CREATE INDEX IF NOT EXISTS idx_actors_api_key ON actors(api_key);
CREATE INDEX IF NOT EXISTS idx_actors_status ON actors(status);

-- 5. Verificar resultado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'actors';
