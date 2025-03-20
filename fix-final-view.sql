-- Script final para corrigir o problema de SECURITY DEFINER na view workout_session_averages
-- Usando a definição exata da view conforme descoberto na análise

-- Passo 1: Remover a view existente
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

-- Passo 2: Recriar a view com a definição exata, sem SECURITY DEFINER
CREATE VIEW public.workout_session_averages AS
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

-- Passo 3: Verificar se a view foi criada corretamente
SELECT 
  table_schema,
  table_name,
  view_definition
FROM 
  information_schema.views
WHERE 
  table_schema = 'public' 
  AND table_name = 'workout_session_averages';

-- Passo 4: Confirmar que a view não usa mais SECURITY DEFINER
SELECT 
  relname AS view_name,
  pg_get_viewdef(c.oid) AS view_definition
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
WHERE 
  c.relkind = 'v' 
  AND n.nspname = 'public'
  AND c.relname = 'workout_session_averages'; 