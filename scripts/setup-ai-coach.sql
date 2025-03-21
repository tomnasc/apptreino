-- Script para configurar o módulo de IA Coach no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela para armazenar avaliações físicas (anonimizadas)
CREATE TABLE IF NOT EXISTS user_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  height NUMERIC(5,2),  -- altura em cm
  weight NUMERIC(5,2),  -- peso em kg
  age INT,              -- idade
  experience_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  fitness_goal TEXT,    -- 'weight_loss', 'muscle_gain', 'endurance', 'general_fitness'
  health_limitations TEXT[], -- array de limitações de saúde
  available_equipment TEXT[], -- equipamentos disponíveis
  workout_days_per_week INT, -- dias por semana
  workout_duration INT,  -- duração média de treino em minutos
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  anonymized_id TEXT,    -- ID anonimizado para uso com serviços externos
  UNIQUE (user_id, assessment_date)
);

-- Tabela para armazenar treinos sugeridos pela IA
CREATE TABLE IF NOT EXISTS ai_suggested_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES user_assessments(id) ON DELETE CASCADE,
  workout_name TEXT NOT NULL,
  workout_description TEXT,
  workout_metadata JSONB, -- metadados adicionais sobre o treino
  exercises JSONB NOT NULL, -- array de exercícios com detalhes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_feedback INT, -- avaliação do usuário (1-5)
  user_feedback_notes TEXT, -- comentários sobre o treino
  selected BOOLEAN DEFAULT FALSE -- indica se o usuário selecionou esse treino
);

-- Funções para anonimização de IDs
CREATE OR REPLACE FUNCTION generate_anonymized_id() 
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para gerar ID anonimizado automaticamente
CREATE OR REPLACE FUNCTION set_anonymized_id() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.anonymized_id := generate_anonymized_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se o trigger já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_set_anonymized_id' 
    AND tgrelid = 'user_assessments'::regclass
  ) THEN
    CREATE TRIGGER trigger_set_anonymized_id
    BEFORE INSERT ON user_assessments
    FOR EACH ROW EXECUTE FUNCTION set_anonymized_id();
  END IF;
END
$$;

-- Políticas RLS (Row Level Security)
ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggested_workouts ENABLE ROW LEVEL SECURITY;

-- Políticas para user_assessments
CREATE POLICY "Usuários podem ver suas próprias avaliações"
  ON user_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias avaliações"
  ON user_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias avaliações"
  ON user_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para ai_suggested_workouts
CREATE POLICY "Usuários podem ver seus próprios treinos sugeridos"
  ON ai_suggested_workouts FOR SELECT
  USING (assessment_id IN (SELECT id FROM user_assessments WHERE user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar feedback de seus treinos sugeridos"
  ON ai_suggested_workouts FOR UPDATE
  USING (assessment_id IN (SELECT id FROM user_assessments WHERE user_id = auth.uid()));

-- Política para administradores verem dados agregados
CREATE POLICY "Administradores podem ver todas as avaliações"
  ON user_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.plan_type = 'admin'
    )
  );

CREATE POLICY "Administradores podem ver todos os treinos sugeridos"
  ON ai_suggested_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.plan_type = 'admin'
    )
  ); 