-- Script para configurar as tabelas necessárias para o sistema de pagamento

-- 1. Adicionar colunas relacionadas a pagamento na tabela de perfis de usuário
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;

-- 2. Criar tabela para armazenar transações de pagamento
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_id TEXT,
  subscription_id TEXT,
  status TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON public.payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON public.payment_transactions(subscription_id);

-- 3. Configurar RLS (Row Level Security) para a tabela de transações
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para administradores
CREATE POLICY "Administradores podem ver todas as transações"
  ON public.payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.plan_type = 'admin'
    )
  );

CREATE POLICY "Administradores podem inserir transações para qualquer usuário"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.plan_type = 'admin'
    )
  );

-- Políticas para usuários normais
CREATE POLICY "Usuários podem ver suas próprias transações"
  ON public.payment_transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- 4. Criar função para registrar alterações em transações
CREATE OR REPLACE FUNCTION public.handle_payment_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para atualizar timestamp quando a transação for modificada
CREATE TRIGGER payment_transaction_updated
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_transaction_update();

-- 6. Adicionar configurações padrão na tabela de configurações do aplicativo
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES 
  ('premium_plan_price', '99.00', 'Preço do plano premium anual em reais'),
  ('premium_plan_duration_days', '365', 'Duração do plano premium em dias')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Verificação final das tabelas e configurações
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'user_profiles' AND 
  (column_name = 'subscription_id' OR 
   column_name = 'subscription_status' OR 
   column_name = 'payment_status' OR 
   column_name = 'last_payment_date');

SELECT 
  table_name, 
  policy_name 
FROM 
  pg_policies 
WHERE 
  tablename = 'payment_transactions'; 