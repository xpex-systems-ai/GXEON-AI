-- SQL Patch para corrigir schema da tabela audit_logs
-- Execute este comando no SQL Editor do Supabase Dashboard

-- Adicionar coluna description se não existir
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar coluna metadata se não existir  
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Atualizar schema cache do PostgREST (necessário após alterações)
NOTIFY pgrst, 'reload schema';
