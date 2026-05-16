-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Adicionar coluna api_key à tabela actors
-- ERRO: Could not find the 'api_key' column of 'actors' in the schema cache
-- ═══════════════════════════════════════════════════════════════════════════

-- Adicionar coluna api_key
ALTER TABLE actors 
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Adicionar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_actors_api_key ON actors(api_key);

-- Adicionar coluna status se não existir
ALTER TABLE actors
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';

-- Adicionar coluna tier se não existir  
ALTER TABLE actors
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'BASIC';

-- Verificar estrutura atual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'actors';
