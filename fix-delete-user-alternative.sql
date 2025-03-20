-- Script alternativo para corrigir a função delete_user
-- Esta versão usa nomes de esquema totalmente qualificados e define search_path de forma diferente

-- Primeiro, vamos dropar a função existente para garantir uma recriação limpa
DROP FUNCTION IF EXISTS public.delete_user(uuid);

-- Agora recriamos a função com uma abordagem mais segura:
-- 1. Usando search_path com sintaxe alternativa
-- 2. Qualificando completamente os nomes das tabelas com o esquema
-- 3. Usando SCHEMA notation ao invés de apenas SET search_path
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
BEGIN
  -- Usando nome completamente qualificado para a tabela
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Verificação detalhada da função
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS function_args,
  p.prosecdef AS security_definer,
  p.proconfig AS config_params
FROM 
  pg_proc p
JOIN 
  pg_namespace n ON p.pronamespace = n.oid
WHERE 
  p.proname = 'delete_user' 
  AND n.nspname = 'public';

-- Abordagem alternativa se a anterior não funcionar
CREATE OR REPLACE FUNCTION public.delete_user_v2(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- Definir uma combinação de search_path e schema
SET search_path = ''
AS $$
BEGIN
  -- Usando nome completamente qualificado para a tabela
  DELETE FROM auth.users WHERE id = user_id;
END;
$$; 