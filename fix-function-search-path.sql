-- Script para corrigir o problema de "Function Search Path Mutable"
-- Este script altera todas as funções afetadas para adicionar um search_path explícito

-- 1. Função delete_user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Não precisamos modificar a lógica interna da função,
  -- apenas adicionar o search_path
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 2. Função prevent_plan_type_change
CREATE OR REPLACE FUNCTION public.prevent_plan_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se não for admin e tentar mudar o tipo de plano, reverte para o valor original
  IF NOT is_admin() AND NEW.plan_type != OLD.plan_type THEN
    RAISE EXCEPTION 'Não é permitido alterar o tipo de plano';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Função check_user_access
CREATE OR REPLACE FUNCTION public.check_user_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan user_plan_type;
  user_expiry TIMESTAMP WITH TIME ZONE;
  free_days INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  ) INTO is_user_admin;
  
  -- Administradores sempre têm acesso
  IF is_user_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Obter o plano do usuário
  SELECT plan_type, expiry_date INTO user_plan, user_expiry
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Usuários pagos sempre têm acesso
  IF user_plan = 'paid' THEN
    RETURN TRUE;
  END IF;
  
  -- Usuários gratuitos têm acesso apenas durante o período de teste
  IF user_plan = 'free' THEN
    -- Se tiver data de expiração definida, verificar se ainda é válida
    IF user_expiry IS NOT NULL THEN
      RETURN NOW() < user_expiry;
    ELSE
      -- Se não tiver data, verificar a configuração global e calcular
      SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
      INTO free_days;
      
      RETURN (SELECT created_at + (free_days || ' days')::INTERVAL > NOW() FROM user_profiles WHERE id = auth.uid());
    END IF;
  END IF;
  
  -- Por padrão, negar acesso
  RETURN FALSE;
END;
$$;

-- 4. Função update_profile_timestamp
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Função create_profile_for_new_user
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_days INTEGER;
  expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obter a configuração de dias de teste
  SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
  INTO free_days;
  
  -- Calcular data de expiração para usuários gratuitos
  expiry_date := NOW() + (free_days || ' days')::INTERVAL;
  
  -- Inserir o perfil padrão
  INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
  VALUES (NEW.id, NEW.email, 'free', NOW(), expiry_date);
  
  RETURN NEW;
END;
$$;

-- 6. Função is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;

-- 7. Função update_user_feedback_updated_at
CREATE OR REPLACE FUNCTION public.update_user_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. Função create_workout_session_details_table
CREATE OR REPLACE FUNCTION public.create_workout_session_details_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta é uma função que cria a tabela workout_session_details
  -- Adicionar o search_path sem mudar a lógica interna
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_session_details'
  ) THEN
    CREATE TABLE public.workout_session_details (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps_completed INTEGER,
      weight NUMERIC(5,2),
      execution_time INTEGER,
      rest_time INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(session_id, exercise_id, set_number)
    );
  END IF;
END;
$$;

-- 9. Função setup_workout_session_details_policies
CREATE OR REPLACE FUNCTION public.setup_workout_session_details_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta função configura as políticas para a tabela workout_session_details
  -- Adicionar o search_path sem mudar a lógica interna
  -- Habilitar RLS
  ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
  
  -- Criar políticas
  DROP POLICY IF EXISTS "Usuários podem ver seus próprios detalhes de sessão" ON workout_session_details;
  CREATE POLICY "Usuários podem ver seus próprios detalhes de sessão"
    ON workout_session_details
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_details.session_id
        AND workout_sessions.user_id = auth.uid()
      )
    );
  
  DROP POLICY IF EXISTS "Usuários podem inserir seus próprios detalhes de sessão" ON workout_session_details;
  CREATE POLICY "Usuários podem inserir seus próprios detalhes de sessão"
    ON workout_session_details
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_details.session_id
        AND workout_sessions.user_id = auth.uid()
      )
    );
  
  DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios detalhes de sessão" ON workout_session_details;
  CREATE POLICY "Usuários podem atualizar seus próprios detalhes de sessão"
    ON workout_session_details
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_details.session_id
        AND workout_sessions.user_id = auth.uid()
      )
    );
  
  DROP POLICY IF EXISTS "Usuários podem excluir seus próprios detalhes de sessão" ON workout_session_details;
  CREATE POLICY "Usuários podem excluir seus próprios detalhes de sessão"
    ON workout_session_details
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_details.session_id
        AND workout_sessions.user_id = auth.uid()
      )
    );
END;
$$; 