-- Script para configurar o sistema de afiliados/convites
-- Este script deve ser executado no editor SQL do Supabase

-- 1. Adicionar colunas na tabela user_profiles para o sistema de afiliados
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS affiliate_bonuses INT DEFAULT 0;

-- 2. Criar tabela para registrar convites enviados
CREATE TABLE IF NOT EXISTS affiliate_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  subscription_created BOOLEAN DEFAULT FALSE
);

-- 3. Criar tabela para registrar bônus de afiliados
CREATE TABLE IF NOT EXISTS affiliate_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, applied, expired
  bonus_months INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- 4. Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_affiliate_invites_sender ON affiliate_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_invites_code ON affiliate_invites(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_bonuses_user ON affiliate_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_bonuses_referred ON affiliate_bonuses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_affiliate_code ON user_profiles(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);

-- 5. Configurar RLS (Row Level Security) para as tabelas
ALTER TABLE affiliate_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_bonuses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas para tabela affiliate_invites
CREATE POLICY "Usuários podem ver seus próprios convites"
  ON affiliate_invites
  FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Usuários podem criar seus próprios convites"
  ON affiliate_invites
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Administradores podem ver todos os convites"
  ON affiliate_invites
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- 7. Políticas para tabela affiliate_bonuses
CREATE POLICY "Usuários podem ver seus próprios bônus"
  ON affiliate_bonuses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Administradores podem ver todos os bônus"
  ON affiliate_bonuses
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Administradores podem gerenciar bônus"
  ON affiliate_bonuses
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- 8. Função para gerar código de afiliado aleatório
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código alfanumérico de 8 caracteres
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) 
        FROM 1 FOR 8
      )
    );
    
    -- Verificar se o código já existe
    SELECT EXISTS (
      SELECT 1 FROM user_profiles WHERE affiliate_code = code
    ) INTO code_exists;
    
    -- Se não existir, usar este código
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para gerar automaticamente o código de afiliado para novos usuários
CREATE OR REPLACE FUNCTION add_affiliate_code_to_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas adicionar código se não existir
  IF NEW.affiliate_code IS NULL THEN
    NEW.affiliate_code := generate_affiliate_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_profile_has_affiliate_code ON user_profiles;
CREATE TRIGGER ensure_profile_has_affiliate_code
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_affiliate_code_to_new_profile();

-- 10. Função para processar um novo usuário que se cadastrou com um código de afiliado
CREATE OR REPLACE FUNCTION process_affiliate_registration(
  new_user_id UUID,
  affiliate_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Encontrar o usuário que enviou o convite
  SELECT id INTO referrer_id
  FROM user_profiles
  WHERE affiliate_code = affiliate_code;
  
  -- Se encontrar o referenciador
  IF referrer_id IS NOT NULL THEN
    -- Atualizar o perfil do novo usuário
    UPDATE user_profiles
    SET referred_by = referrer_id
    WHERE id = new_user_id;
    
    -- Registrar na tabela de invites (se existir)
    UPDATE affiliate_invites
    SET status = 'accepted', accepted_at = NOW()
    WHERE code = affiliate_code AND status = 'pending';
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Função para registrar bônus quando um usuário convidado assinar
CREATE OR REPLACE FUNCTION register_affiliate_bonus(
  referred_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Verificar se o usuário foi convidado
  SELECT referred_by INTO referrer_id
  FROM user_profiles
  WHERE id = referred_user_id;
  
  -- Se o usuário tiver um referenciador
  IF referrer_id IS NOT NULL THEN
    -- Registrar o bônus
    INSERT INTO affiliate_bonuses (
      user_id,
      referred_user_id,
      status,
      bonus_months
    ) VALUES (
      referrer_id,
      referred_user_id,
      'pending',
      1
    );
    
    -- Atualizar contagem de bônus do referenciador
    UPDATE user_profiles
    SET affiliate_bonuses = affiliate_bonuses + 1
    WHERE id = referrer_id;
    
    -- Atualizar o convite para indicar que gerou assinatura
    UPDATE affiliate_invites
    SET subscription_created = TRUE
    WHERE sender_id = referrer_id AND status = 'accepted';
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Função para aplicar bônus de afiliado na renovação da assinatura
CREATE OR REPLACE FUNCTION apply_affiliate_bonus(
  user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_bonus BOOLEAN;
  bonus_id UUID;
  expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar se o usuário tem bônus pendentes
  SELECT EXISTS (
    SELECT 1 
    FROM affiliate_bonuses 
    WHERE user_id = apply_affiliate_bonus.user_id AND status = 'pending'
  ) INTO has_bonus;
  
  IF has_bonus THEN
    -- Pegar o primeiro bônus para aplicar (FIFO)
    SELECT id INTO bonus_id
    FROM affiliate_bonuses
    WHERE user_id = apply_affiliate_bonus.user_id AND status = 'pending'
    ORDER BY created_at
    LIMIT 1;
    
    -- Atualizar o status do bônus
    UPDATE affiliate_bonuses
    SET status = 'applied', applied_at = NOW()
    WHERE id = bonus_id;
    
    -- Obter data de expiração atual
    SELECT expiry_date INTO expiry_date
    FROM user_profiles
    WHERE id = apply_affiliate_bonus.user_id;
    
    -- Se já tiver expirado, usar data atual
    IF expiry_date IS NULL OR expiry_date < NOW() THEN
      expiry_date := NOW();
    END IF;
    
    -- Estender a assinatura por 1 mês
    UPDATE user_profiles
    SET expiry_date = expiry_date + INTERVAL '1 month'
    WHERE id = apply_affiliate_bonus.user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Gerar códigos de afiliados para usuários existentes
DO $$
BEGIN
  UPDATE user_profiles
  SET affiliate_code = generate_affiliate_code()
  WHERE affiliate_code IS NULL;
END $$; 