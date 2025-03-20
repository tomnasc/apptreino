-- Script para limpar todas as funções delete_user e manter apenas a versão segura

-- 1. Tentar identificar e remover a função delete_user sem argumentos
DO $$
DECLARE
  func_oid oid;
BEGIN
  -- Encontrar a função delete_user sem argumentos ou com configuração incorreta
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'delete_user'
    AND n.nspname = 'public'
    AND (p.proargtypes = '' OR p.proconfig IS NULL);
  
  -- Se encontrou, tenta remover
  IF FOUND THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.delete_user();';
    RAISE NOTICE 'Função delete_user sem argumentos removida';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao tentar remover função: %', SQLERRM;
END;
$$;

-- 2. Remover todas as funções delete_user do schema public para evitar confusão
DROP FUNCTION IF EXISTS public.delete_user(uuid);
DROP FUNCTION IF EXISTS public.delete_user();
DROP FUNCTION IF EXISTS public.delete_user_secure(uuid);

-- 3. Criar novamente apenas a versão mais segura
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Usando nome completamente qualificado para a tabela
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 4. Verificar o resultado final
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config
FROM 
  pg_proc p
JOIN 
  pg_namespace n ON p.pronamespace = n.oid
WHERE 
  (n.nspname = 'public' OR n.nspname = 'secure_functions')
  AND p.proname LIKE 'delete_user%'
ORDER BY
  n.nspname, p.proname;

-- 5. Verificar se ainda existem funções com search_path mutable
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  CASE WHEN p.proconfig IS NULL AND p.prosecdef THEN 'PROBLEMA: Search path mutable' ELSE 'OK' END AS status
FROM 
  pg_proc p
JOIN 
  pg_namespace n ON p.pronamespace = n.oid
WHERE 
  n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proconfig IS NULL
ORDER BY
  n.nspname, p.proname; 