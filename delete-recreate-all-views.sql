-- Script definitivo para eliminar todos os SECURITY DEFINER nas views
-- Este script lista todas as views com SECURITY DEFINER e as corrige

-- Passo 1: Listar todas as views no schema public
SELECT 
  table_schema,
  table_name,
  view_definition
FROM 
  information_schema.views
WHERE 
  table_schema = 'public';

-- Passo 2: Identificar especificamente quais views usam SECURITY DEFINER
WITH security_views AS (
  SELECT 
    c.relname AS view_name,
    c.oid AS view_oid,
    pg_get_viewdef(c.oid) AS view_definition,
    CASE 
      WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN true
      ELSE false
    END AS has_security_definer
  FROM 
    pg_class c
  JOIN 
    pg_namespace n ON c.relnamespace = n.oid
  WHERE 
    c.relkind = 'v' AND n.nspname = 'public'
)
SELECT * FROM security_views;

-- Passo 3: Corrigir a view workout_session_averages especificamente
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

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

-- Passo 4: Verificar metadata da view diretamente na tabela do sistema
-- Isso mostra atributos específicos da view que podem não aparecer na definição normal
SELECT 
  c.relname AS view_name,
  a.oid AS view_oid,
  a.reloptions AS options,
  a.relkind AS kind
FROM 
  pg_class a
JOIN 
  pg_namespace n ON a.relnamespace = n.oid
JOIN 
  pg_class c ON a.oid = c.oid
WHERE 
  a.relkind = 'v' 
  AND n.nspname = 'public'
  AND c.relname = 'workout_session_averages';

-- Passo 5: Listar TODAS as views do sistema para ver se há algo relacionado que
-- possa estar com a definição incorreta
SELECT 
  n.nspname AS schema_name,
  c.relname AS view_name,
  pg_get_viewdef(c.oid) AS view_def
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
WHERE 
  c.relkind = 'v'
ORDER BY 
  n.nspname, c.relname; 