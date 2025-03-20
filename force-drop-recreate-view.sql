-- Script final para forçar a remoção e recriação da view workout_session_averages
-- Esta abordagem é a mais direta possível, usando apenas SQL simples

-- Passo 1: Obter a definição SQL atual da view
WITH view_def AS (
  SELECT pg_get_viewdef('public.workout_session_averages'::regclass, true) AS sql_code
)
SELECT sql_code FROM view_def;

-- Passo 2: Remover completamente a view e todas as suas dependências
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

-- Passo 3: Recriar a view usando APENAS a consulta SQL, sem SECURITY DEFINER
-- IMPORTANTE: O código SQL abaixo deve ser ajustado com base na saída do Passo 1
CREATE VIEW public.workout_session_averages AS
SELECT 
  ws.workout_list_id,
  ws.user_id,
  COUNT(ws.id) AS completed_sessions,
  AVG(EXTRACT(epoch FROM (ws.end_time - ws.start_time)) / 60)::integer AS avg_duration_minutes,
  MAX(ws.created_at) AS last_session_date
FROM 
  workout_sessions ws
WHERE 
  ws.end_time IS NOT NULL
GROUP BY 
  ws.workout_list_id, ws.user_id;

-- Passo 4: Verificar se a view foi criada corretamente
SELECT EXISTS (
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = 'public' AND table_name = 'workout_session_averages'
) AS view_exists; 