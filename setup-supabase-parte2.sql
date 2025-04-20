-- Parte 2: Criar triggers e funções adicionais
-- Este script deve ser executado APÓS a definição bem-sucedida do administrador inicial

-- Adicionar trigger para prevenir alteração do plan_type por usuários comuns
CREATE OR REPLACE FUNCTION prevent_plan_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não for admin e tentar mudar o tipo de plano, reverte para o valor original
  IF NOT is_admin() AND NEW.plan_type != OLD.plan_type THEN
    RAISE EXCEPTION 'Não é permitido alterar o tipo de plano';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_plan_change ON user_profiles;
CREATE TRIGGER prevent_plan_change
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_plan_type_change();

-- Criar função para verificar se um usuário tem acesso à funcionalidade
CREATE OR REPLACE FUNCTION check_user_access()
RETURNS BOOLEAN AS $$
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
      SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 30)
      INTO free_days;
      
      RETURN (SELECT created_at + (free_days || ' days')::INTERVAL > NOW() FROM user_profiles WHERE id = auth.uid());
    END IF;
  END IF;
  
  -- Por padrão, negar acesso
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar a data de atualização de perfis
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

-- Trigger para criar perfil automaticamente na criação de usuário
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_days INTEGER;
  expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obter a configuração de dias de teste
  SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 30)
  INTO free_days;
  
  -- Calcular data de expiração para usuários gratuitos
  expiry_date := NOW() + (free_days || ' days')::INTERVAL;
  
  -- Inserir o perfil padrão
  INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
  VALUES (NEW.id, NEW.email, 'free', NOW(), expiry_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se o trigger já existe e criar se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_profile_on_signup'
  ) THEN
    CREATE TRIGGER create_profile_on_signup
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_profile_for_new_user();
  END IF;
END
$$;

-- Verificar a configuração
DO $$
DECLARE
  admin_count INTEGER;
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  RAISE NOTICE 'Configuração concluída com:';
  RAISE NOTICE '- % administradores', admin_count;
  RAISE NOTICE '- % perfis de usuário', profile_count;
END
$$; 