-- Script alternativo para remover SECURITY DEFINER de views
-- Este script verifica se a view realmente tem SECURITY DEFINER e força a recriação

-- Primeiro, vamos verificar explicitamente se a view usa SECURITY DEFINER
DO $$
DECLARE
  view_options record;
  has_security_definer boolean := false;
  view_def text;
  view_oid oid;
BEGIN
  -- Obter o OID da view
  SELECT c.oid INTO view_oid
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relkind = 'v' 
    AND n.nspname = 'public'
    AND c.relname = 'workout_session_averages';
  
  IF view_oid IS NULL THEN
    RAISE NOTICE 'View workout_session_averages não encontrada';
    RETURN;
  END IF;
  
  -- Verificar se view usa SECURITY DEFINER
  SELECT pg_get_viewdef(view_oid) INTO view_def;
  has_security_definer := position('SECURITY DEFINER' in view_def) > 0;
  
  RAISE NOTICE 'Definição atual da view: %', view_def;
  RAISE NOTICE 'A view usa SECURITY DEFINER: %', has_security_definer;
  
  -- Obter a definição SQL da view (apenas a consulta, sem as opções)
  SELECT pg_get_viewdef(view_oid, true) INTO view_def;
  
  -- Forçar recriação da view
  EXECUTE 'DROP VIEW IF EXISTS public.workout_session_averages CASCADE';
  EXECUTE 'CREATE VIEW public.workout_session_averages AS ' || view_def;
  
  RAISE NOTICE 'View recriada com sucesso sem SECURITY DEFINER';
END;
$$;

-- Verificar o estado atual das views com SECURITY DEFINER
SELECT 
  n.nspname AS schema,
  c.relname AS view_name,
  CASE 
    WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER (default)'
  END AS security_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public';

-- Configurar o script para enviar os resultados como saída
\t on
\x on

-- Verificar explicitamente a view workout_session_averages
SELECT 
  pg_get_viewdef('public.workout_session_averages'::regclass) AS definicao
\; 