-- Script para criar as tabelas e políticas relacionadas ao sistema de pagamento
-- Executar no Supabase SQL Editor

-- 1. Atualizar a tabela user_profiles com campos relacionados a pagamento
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- 2. Criar tabela para armazenar transações de pagamento (se não existir)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT,
  subscription_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  status TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar ou substituir a função para atualizar o timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para atualização automática de timestamp
DROP TRIGGER IF EXISTS update_payment_transactions_timestamp ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_timestamp
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- 5. Configurar RLS (Row Level Security) para a tabela payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas existentes para evitar erros de duplicação
DROP POLICY IF EXISTS "Administradores podem ver todas as transações" ON public.payment_transactions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON public.payment_transactions;
DROP POLICY IF EXISTS "Administradores podem inserir transações para qualquer usuário" ON public.payment_transactions;

-- 7. Criar políticas de segurança para payment_transactions

-- Política para administradores poderem ver todas as transações
CREATE POLICY "Administradores podem ver todas as transações"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.plan_type = 'admin'
  )
);

-- Política para usuários verem suas próprias transações
CREATE POLICY "Usuários podem ver suas próprias transações"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política para administradores poderem inserir transações para qualquer usuário
CREATE POLICY "Administradores podem inserir transações para qualquer usuário"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.plan_type = 'admin'
  )
);

-- 8. Criar tabela para configurações do aplicativo (se não existir)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualização automática de timestamp
DROP TRIGGER IF EXISTS update_app_settings_timestamp ON public.app_settings;
CREATE TRIGGER update_app_settings_timestamp
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Definir configurações padrão
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES 
  ('free_trial_days', '14', 'Número de dias para período de teste de usuários gratuitos')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Políticas de segurança para app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros de duplicação
DROP POLICY IF EXISTS "Administradores podem gerenciar configurações" ON public.app_settings;
DROP POLICY IF EXISTS "Usuários autenticados podem ler configurações" ON public.app_settings;

-- Política para administradores gerenciarem configurações
CREATE POLICY "Administradores podem gerenciar configurações"
ON public.app_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.plan_type = 'admin'
  )
);

-- Política para qualquer usuário autenticado ler configurações
CREATE POLICY "Usuários autenticados podem ler configurações"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Mostrar as tabelas e políticas criadas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND 
  table_name IN ('payment_transactions', 'app_settings');

-- Mostrar políticas para as tabelas
SELECT * FROM pg_policies WHERE tablename = 'payment_transactions' OR tablename = 'app_settings'; 