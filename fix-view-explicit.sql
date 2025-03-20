-- Script para forçar a remoção de SECURITY DEFINER da view workout_session_averages
-- Esta versão usa ALTER VIEW diretamente para mudar a view para SECURITY INVOKER

-- Primeiro, vamos verificar se a view contém SECURITY DEFINER (para fins de diagnóstico)
SELECT 
  c.relname AS view_name,
  CASE 
    WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER (padrão)'
  END AS security_type
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public'
  AND c.relname = 'workout_session_averages';

-- Usar ALTER VIEW para alterar diretamente a segurança da view
DO $$
BEGIN
  -- Verificar se a view existe
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'workout_session_averages'
  ) THEN
    EXECUTE 'ALTER VIEW public.workout_session_averages SECURITY INVOKER';
    RAISE NOTICE 'View alterada para SECURITY INVOKER com sucesso';
  ELSE
    RAISE NOTICE 'View workout_session_averages não encontrada';
  END IF;
END
$$;

-- Verificar o status da view após alteração
SELECT 
  c.relname AS view_name,
  CASE 
    WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
    WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY INVOKER%' THEN 'SECURITY INVOKER'
    ELSE 'SECURITY INVOKER (padrão)'
  END AS security_type,
  pg_get_viewdef(c.oid) AS view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public'
  AND c.relname = 'workout_session_averages';

-- Se a abordagem acima não funcionar, vamos tentar uma recriação completa
DO $$
DECLARE
  view_sql text;
BEGIN
  -- Se ainda detectar SECURITY DEFINER após a primeira tentativa
  IF EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'v' 
      AND n.nspname = 'public'
      AND c.relname = 'workout_session_averages'
      AND pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%'
  ) THEN
    -- Obter a definição da consulta
    SELECT pg_get_viewdef(c.oid, true) INTO view_sql
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'v' 
      AND n.nspname = 'public'
      AND c.relname = 'workout_session_averages';
    
    -- Remover a view e recriar com a mesma definição
    EXECUTE 'DROP VIEW public.workout_session_averages CASCADE';
    EXECUTE 'CREATE VIEW public.workout_session_averages AS ' || view_sql;
    
    RAISE NOTICE 'View recriada sem SECURITY DEFINER';
  END IF;
END
$$; 