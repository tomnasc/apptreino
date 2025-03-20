-- Script para corrigir problemas de segurança em views com SECURITY DEFINER
-- Este script corrige a view workout_session_averages que está usando SECURITY DEFINER

-- Abordagem direta: dropar e recriar a view workout_session_averages
DO $$
DECLARE
  view_definition text;
  view_sql text;
  view_exists boolean;
BEGIN
  -- Verificar se a view existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'workout_session_averages'
  ) INTO view_exists;
  
  IF view_exists THEN
    -- Obter a definição da view (somente a parte após o AS)
    SELECT pg_get_viewdef('public.workout_session_averages'::regclass, true) INTO view_definition;
    
    RAISE NOTICE 'Definição da consulta da view: %', view_definition;
    
    -- Dropar a view existente
    DROP VIEW IF EXISTS public.workout_session_averages;
    
    -- Recriar a view com SECURITY INVOKER (comportamento padrão)
    view_sql := 'CREATE VIEW public.workout_session_averages AS ' || view_definition;
    EXECUTE view_sql;
    
    RAISE NOTICE 'View public.workout_session_averages recriada sem SECURITY DEFINER';
  ELSE
    RAISE NOTICE 'View public.workout_session_averages não encontrada';
  END IF;
END
$$;

-- Mostrar se ainda existem views com SECURITY DEFINER no schema public
SELECT 
  n.nspname AS schema_name,
  c.relname AS view_name,
  pg_get_viewdef(c.oid) AS view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid) ILIKE '%SECURITY DEFINER%';

-- Verificar o status atual da view workout_session_averages
SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'workout_session_averages'; 