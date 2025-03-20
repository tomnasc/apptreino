-- Script passo a passo para corrigir a view com SECURITY DEFINER
-- Este script é incremental e vai obtendo informações antes de prosseguir

-- ETAPA 1: Descobrir as colunas da tabela workout_sessions para não errar na recriação
SELECT 
  column_name, 
  data_type
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'workout_sessions'
ORDER BY 
  ordinal_position;

-- ETAPA 2: Ver a definição exata da view atual
SELECT 
  view_definition 
FROM 
  information_schema.views
WHERE 
  table_schema = 'public' 
  AND table_name = 'workout_session_averages';

-- ETAPA 3: Obter a definição SQL (apenas a consulta) da view atual
SELECT 
  pg_get_viewdef('public.workout_session_averages'::regclass, true) AS raw_query;

-- ETAPA 4: Dropar a view existente
DROP VIEW IF EXISTS public.workout_session_averages CASCADE;

-- ETAPA 5: Recriar a view
-- ATENÇÃO: Após obter os resultados das etapas anteriores, ajuste a query abaixo com a definição correta

-- USE O RESULTADO DA ETAPA 3 para completar essa definição
CREATE VIEW public.workout_session_averages AS
SELECT 
  -- Coloque aqui a definição SQL correta da view
  -- Baseada na saída da ETAPA 3 e nas colunas mostradas na ETAPA 1
  -- EXEMPLO (a ser substituído):
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

-- ETAPA 6: Verificar se a view foi recriada corretamente
SELECT 
  table_schema,
  table_name,
  view_definition
FROM 
  information_schema.views
WHERE 
  table_schema = 'public' 
  AND table_name = 'workout_session_averages'; 