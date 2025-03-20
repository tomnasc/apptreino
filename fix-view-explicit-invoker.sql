-- Script definitivo para corrigir o problema de SECURITY DEFINER
-- Forçando explicitamente o uso de SECURITY INVOKER

-- Passo 1: Remover a view existente completamente
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

-- Passo 2: Recriar a view usando EXPLICITAMENTE SECURITY INVOKER
CREATE VIEW public.workout_session_averages
SECURITY INVOKER AS
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
LEFT JOIN
  pg_views v ON c.relname = v.viewname AND n.nspname = v.schemaname
WHERE 
  c.relkind = 'v' 
  AND n.nspname = 'public'
  AND (pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' OR v.definition LIKE '%SECURITY DEFINER%');

-- Passo 4: Listar todas as funções no esquema public que usam SECURITY DEFINER 
-- (podem estar relacionadas ao problema)
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM 
  pg_proc p
JOIN 
  pg_namespace n ON p.pronamespace = n.oid
WHERE 
  n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%'
ORDER BY 
  p.proname; 