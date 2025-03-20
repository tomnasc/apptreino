-- Script para corrigir apenas a função delete_user

-- Primeiro, vamos dropar a função existente para garantir que não há conflitos
DROP FUNCTION IF EXISTS public.delete_user(uuid);

-- Agora recriamos a função com o search_path definido
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Verificar se a função foi criada corretamente
SELECT 
  proname AS function_name,
  proargtypes::regtype[] AS arg_types,
  prosecdef AS security_definer,
  proconfig AS config_params
FROM 
  pg_proc 
WHERE 
  proname = 'delete_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 