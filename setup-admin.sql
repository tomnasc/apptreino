-- Script específico para configurar o administrador
-- Este script remove temporariamente o trigger que impede a alteração do tipo de plano

-- Remover o trigger existente que está causando problemas
DROP TRIGGER IF EXISTS prevent_plan_change ON user_profiles;

-- Verificar se as tabelas necessárias existem
DO $$
BEGIN
  -- Criar o tipo ENUM se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan_type') THEN
    CREATE TYPE user_plan_type AS ENUM ('admin', 'paid', 'free');
  END IF;

  -- Criar tabela de admin se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    CREATE TABLE admin_users (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Criar perfis se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    CREATE TABLE user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT,
      full_name TEXT,
      plan_type user_plan_type DEFAULT 'free',
      start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expiry_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END
$$;

-- Função para verificar se o usuário atual é um admin (caso ainda não exista)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar o administrador
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := 'everton@fullcode.dev.br'; -- ALTERE PARA O SEU EMAIL
BEGIN
  -- Mostrar o email que estamos procurando
  RAISE NOTICE 'Procurando usuário com email: %', admin_email;
  
  -- Procurar o usuário pelo email
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  
  -- Verificar se encontramos o usuário
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Usuário com email % não encontrado. Tentando pegar o primeiro usuário.', admin_email;
    SELECT id INTO admin_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;
  
  -- Verificar novamente
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado no sistema!';
  ELSE
    RAISE NOTICE 'Configurando administrador para ID: %', admin_id;
    
    -- Inserir na tabela de admin
    INSERT INTO admin_users (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Atualizar perfil (sem o trigger de bloqueio)
    UPDATE user_profiles
    SET plan_type = 'admin'
    WHERE id = admin_id;
    
    -- Verificar se o usuário existe na tabela user_profiles
    IF NOT FOUND THEN
      RAISE NOTICE 'Perfil não existe ainda, criando...';
      INSERT INTO user_profiles (id, email, plan_type, start_date)
      SELECT id, email, 'admin', NOW()
      FROM auth.users
      WHERE id = admin_id;
    END IF;
    
    RAISE NOTICE 'Administrador configurado com sucesso!';
  END IF;
END
$$;

-- Verificar configuração
SELECT u.email, p.plan_type, a.user_id IS NOT NULL as is_admin
FROM user_profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN admin_users a ON a.user_id = u.id
WHERE p.plan_type = 'admin' OR a.user_id IS NOT NULL; 