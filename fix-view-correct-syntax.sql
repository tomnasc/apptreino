-- Script para corrigir o problema de SECURITY DEFINER com sintaxe correta
-- Esta versão usa WITH (security_invoker = true) que é suportado no PostgreSQL

-- Passo 1: Remover a view existente completamente
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

-- Passo 2: Recriar a view usando a sintaxe correta para SECURITY INVOKER
CREATE VIEW public.workout_session_averages WITH (security_invoker = true)
AS
SELECT 
  workout_session_details.session_id,
  workout_session_details.exercise_id,
  avg(workout_session_details.execution_time) AS avg_execution_time,
  avg(workout_session_details.rest_time) AS avg_rest_time,
  count(*) AS total_sets
FROM 
  workout_session_details
GROUP BY 
  workout_session_details.session_id, 
  workout_session_details.exercise_id;

-- Passo 3: Verificar todas as views no esquema public que usam SECURITY DEFINER
SELECT 
  n.nspname AS schema,
  c.relname AS view_name,
  pg_get_viewdef(c.oid) AS view_definition
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
WHERE 
  c.relkind = 'v' 
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%';

-- Passo 4: Confirmar que a view foi recriada corretamente
SELECT 
  table_schema,
  table_name,
  view_definition
FROM 
  information_schema.views
WHERE 
  table_schema = 'public' 
  AND table_name = 'workout_session_averages'; 