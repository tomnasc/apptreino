-- Criação da tabela de medidas corporais
CREATE TABLE IF NOT EXISTS user_body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  body_fat_percentage NUMERIC(5,2),
  muscle_mass NUMERIC(5,2),
  chest NUMERIC(5,2),
  waist NUMERIC(5,2),
  hips NUMERIC(5,2),
  right_arm NUMERIC(5,2),
  left_arm NUMERIC(5,2),
  right_thigh NUMERIC(5,2),
  left_thigh NUMERIC(5,2),
  right_calf NUMERIC(5,2),
  left_calf NUMERIC(5,2),
  neck NUMERIC(5,2),
  shoulders NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índice para pesquisas por usuário e data
CREATE INDEX IF NOT EXISTS idx_user_body_measurements_user_date ON user_body_measurements (user_id, date);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_body_measurements ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (caso existam)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias medidas" ON user_body_measurements;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias medidas" ON user_body_measurements;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias medidas" ON user_body_measurements;
DROP POLICY IF EXISTS "Usuários podem excluir suas próprias medidas" ON user_body_measurements;

-- Criar políticas de segurança
-- Política de seleção: usuários podem ver apenas seus próprios registros
CREATE POLICY "Usuários podem ver suas próprias medidas"
  ON user_body_measurements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política de inserção: usuários podem inserir apenas seus próprios registros
CREATE POLICY "Usuários podem inserir suas próprias medidas"
  ON user_body_measurements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de atualização: usuários podem atualizar apenas seus próprios registros
CREATE POLICY "Usuários podem atualizar suas próprias medidas"
  ON user_body_measurements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política de exclusão: usuários podem excluir apenas seus próprios registros
CREATE POLICY "Usuários podem excluir suas próprias medidas"
  ON user_body_measurements
  FOR DELETE
  USING (auth.uid() = user_id);

-- Criar função de trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar o campo updated_at automaticamente
DROP TRIGGER IF EXISTS update_user_body_measurements_updated_at ON user_body_measurements;
CREATE TRIGGER update_user_body_measurements_updated_at
BEFORE UPDATE ON user_body_measurements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Garantir que anon tenha acesso à tabela através das políticas RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON user_body_measurements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_body_measurements TO authenticated;
