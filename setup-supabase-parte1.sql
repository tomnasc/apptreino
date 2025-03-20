-- Parte 1: Criar estruturas básicas e definir o administrador
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

-- Popular perfis para usuários existentes
INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
SELECT id, email, 'free', NOW(), NOW() + INTERVAL '14 days'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Adicionar um usuário admin inicial (substitua pelo e-mail desejado)
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := 'admin@exemplo.com'; -- Altere para o email desejado
BEGIN
  -- Procurar um usuário para tornar admin (exemplo com email específico)
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email LIMIT 1;
  
  -- Se não encontrar, pegar o primeiro usuário registrado
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;
  
  -- Se tiver um usuário, defini-lo como admin
  IF admin_id IS NOT NULL THEN
    -- Atualizar perfil para admin (não há trigger para impedir ainda)
    UPDATE user_profiles
    SET plan_type = 'admin'
    WHERE id = admin_id;
    
    -- Adicionar na tabela admin_users
    INSERT INTO admin_users (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Administrador configurado com sucesso para o ID: %', admin_id;
  ELSE
    RAISE NOTICE 'Nenhum usuário encontrado para definir como administrador';
  END IF;
END
$$; 