-- Script para ser executado no editor SQL do Supabase
-- Este script configura o sistema de tipos de usuário para o App Treino

-- Criar enum para tipos de plano (verificando primeiro se já existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan_type') THEN
        CREATE TYPE user_plan_type AS ENUM ('admin', 'paid', 'free');
    END IF;
END$$;

-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  plan_type user_plan_type DEFAULT 'free',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para configurações globais do aplicativo
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão para tempo de teste dos usuários gratuitos (em dias)
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('free_trial_days', '14', 'Número de dias para período de teste de usuários gratuitos')
ON CONFLICT (setting_key) DO NOTHING;

-- Criar tabela separada para indicar usuários admin (para evitar recursão)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para verificar se o usuário atual é um admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS para tabela de perfis
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Configurar políticas de segurança para perfis

-- Usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Administradores podem ver todos os perfis
DROP POLICY IF EXISTS "Administradores podem ver todos os perfis" ON user_profiles;
CREATE POLICY "Administradores podem ver todos os perfis"
  ON user_profiles
  FOR SELECT
  USING (is_admin());

-- Usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON user_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Popular perfis para usuários existentes
INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
SELECT id, email, 'free', NOW(), NOW() + INTERVAL '14 days'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

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

-- Administradores podem atualizar todos os perfis
DROP POLICY IF EXISTS "Administradores podem atualizar todos os perfis" ON user_profiles;
CREATE POLICY "Administradores podem atualizar todos os perfis"
  ON user_profiles
  FOR UPDATE
  USING (is_admin());

-- Habilitar RLS para tabela de admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users
DROP POLICY IF EXISTS "Apenas admins podem ver admin_users" ON admin_users;
CREATE POLICY "Apenas admins podem ver admin_users"
  ON admin_users
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Apenas admins podem gerenciar admin_users" ON admin_users;
CREATE POLICY "Apenas admins podem gerenciar admin_users"
  ON admin_users
  FOR ALL
  USING (is_admin());

-- Configurar políticas para app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Administradores podem ver e modificar configurações
DROP POLICY IF EXISTS "Administradores podem gerenciar configurações" ON app_settings;
CREATE POLICY "Administradores podem gerenciar configurações"
  ON app_settings
  FOR ALL
  USING (is_admin());

-- Todos os usuários podem ver configurações
DROP POLICY IF EXISTS "Todos os usuários podem ver configurações" ON app_settings;
CREATE POLICY "Todos os usuários podem ver configurações"
  ON app_settings
  FOR SELECT
  USING (true);

-- Adicionar um usuário admin inicial (substitua pelo e-mail desejado)
-- Desabilitar temporariamente os triggers para permitir a atualização
ALTER TABLE user_profiles DISABLE TRIGGER ALL;

DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Procurar um usuário para tornar admin (exemplo com email específico)
  -- Substitua 'admin@exemplo.com' pelo email desejado
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@exemplo.com' LIMIT 1;
  
  -- Se não encontrar, pegar o primeiro usuário registrado
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;
  
  -- Se tiver um usuário, defini-lo como admin
  IF admin_id IS NOT NULL THEN
    -- Atualizar perfil para admin (sem verificação de triggers)
    UPDATE user_profiles
    SET plan_type = 'admin'
    WHERE id = admin_id;
    
    -- Adicionar na tabela admin_users
    INSERT INTO admin_users (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END
$$;

-- Reabilitar os triggers
ALTER TABLE user_profiles ENABLE TRIGGER ALL;

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
      SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
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
  SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
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