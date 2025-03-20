-- Script final para corrigir de todas as formas possíveis a função delete_user
-- Este script tenta várias abordagens para garantir que o alerta seja resolvido

-- ABORDAGEM 1: Dropar e recriar com search_path vazio
DROP FUNCTION IF EXISTS public.delete_user(uuid);

CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- search_path vazio é a opção mais segura
AS $$
BEGIN
  -- Usando nome completamente qualificado para a tabela
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

SELECT 'Função delete_user recriada com search_path vazio' AS info;

-- ABORDAGEM 2: Incluir a função em outro schema se a primeira abordagem não funcionar
-- Vamos criar um esquema específico para funções seguras se não existir
CREATE SCHEMA IF NOT EXISTS secure_functions;

DROP FUNCTION IF EXISTS secure_functions.delete_user(uuid);

CREATE OR REPLACE FUNCTION secure_functions.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Criar uma função wrapper no schema public que chama a versão segura
CREATE OR REPLACE FUNCTION public.delete_user_secure(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT secure_functions.delete_user(user_id);
$$;

SELECT 'Função delete_user também criada em schema seguro' AS info;

-- ABORDAGEM 3: Verificar e corrigir permissões explicitamente
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;

SELECT 'Permissões ajustadas para a função delete_user' AS info;

-- Verificação final
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
  p.proname LIKE 'delete_user%'
ORDER BY
  n.nspname, p.proname; 