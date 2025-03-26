-- Script SQL para configuração das tabelas de métricas e metas dos usuários
-- Este script cria as tabelas necessárias para acompanhar o progresso físico dos usuários
-- e permitir a definição e acompanhamento de metas de fitness

-- 1. Tabela de métricas corporais (medições periódicas)
CREATE TABLE IF NOT EXISTS "user_body_metrics" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "date" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "weight" DECIMAL(5,2),                      -- Peso em kg
  "body_fat_percentage" DECIMAL(4,1),         -- Percentual de gordura corporal
  "muscle_mass" DECIMAL(5,2),                 -- Massa muscular em kg
  "chest" DECIMAL(5,1),                       -- Circunferência do peito em cm
  "waist" DECIMAL(5,1),                       -- Circunferência da cintura em cm
  "hips" DECIMAL(5,1),                        -- Circunferência do quadril em cm
  "arms" DECIMAL(4,1),                        -- Circunferência dos braços em cm
  "thighs" DECIMAL(4,1),                      -- Circunferência das coxas em cm
  "calves" DECIMAL(4,1),                      -- Circunferência das panturrilhas em cm
  "notes" TEXT,                               -- Notas adicionais sobre a medição
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de metas de fitness
CREATE TABLE IF NOT EXISTS "user_fitness_goals" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,                      -- Título da meta (ex: "Perder 5kg", "Aumentar massa muscular")
  "description" TEXT,                         -- Descrição detalhada da meta
  "goal_type" VARCHAR(50) NOT NULL,                  -- Tipo da meta: 'weight', 'body_fat', 'muscle_mass', 'strength', 'performance'
  "start_value" DECIMAL(6,2) NOT NULL,                 -- Valor inicial
  "current_value" DECIMAL(6,2),               -- Valor atual
  "target_value" DECIMAL(6,2) NOT NULL,       -- Valor alvo
  "unit" VARCHAR(20) NOT NULL,                       -- Unidade de medida (kg, %, cm, repetições, etc)
  "start_date" DATE NOT NULL,                 -- Data de início
  "target_date" DATE NOT NULL,                -- Data alvo para alcançar a meta
  "status" VARCHAR(20) DEFAULT 'in_progress', -- Status: 'not_started', 'in_progress', 'completed', 'failed', 'abandoned'
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de histórico de progresso de força (carga máxima por exercício)
CREATE TABLE IF NOT EXISTS "user_strength_progress" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "exercise_id" UUID NOT NULL,
  "exercise_name" VARCHAR(255) NOT NULL,              -- Nome do exercício (mesmo que exercise_id seja nulo)
  "weight" DECIMAL(6,2) NOT NULL,             -- Peso em kg
  "reps" INTEGER NOT NULL,                    -- Número de repetições
  "sets" INTEGER,                             -- Número de séries (opcional)
  "notes" TEXT,                               -- Notas adicionais sobre o progresso
  "date" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de histórico de frequência de treinos
CREATE TABLE IF NOT EXISTS "user_workout_frequency" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "week_starting" DATE NOT NULL,              -- Data de início da semana
  "planned_workouts" INTEGER NOT NULL,        -- Número de treinos planejados
  "completed_workouts" INTEGER NOT NULL,      -- Número de treinos realizados
  "total_duration" INTEGER,                   -- Duração total em minutos
  "notes" TEXT,                               -- Notas adicionais
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Tabela de perfil avançado do usuário (complementa a tabela user_profiles)
CREATE TABLE IF NOT EXISTS "user_fitness_profile" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "fitness_level" TEXT,                       -- Nível de fitness: 'beginner', 'intermediate', 'advanced'
  "primary_goal" TEXT,                        -- Meta primária: 'weight_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness'
  "secondary_goal" TEXT,                      -- Meta secundária (opcional)
  "weekly_workout_target" INTEGER,            -- Número alvo de treinos por semana
  "daily_activity_level" TEXT,                -- Nível de atividade diária: 'sedentary', 'lightly_active', 'moderately_active', 'very_active'
  "health_conditions" TEXT[],                 -- Condições de saúde (array de strings)
  "injuries" TEXT[],                          -- Lesões passadas ou atuais (array de strings)
  "dietary_preferences" TEXT[],               -- Preferências alimentares (array de strings)
  "last_assessment_date" DATE,                -- Data da última avaliação física
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "unique_user_fitness_profile" UNIQUE ("user_id")
);

-- Criar políticas de segurança RLS (Row Level Security)
ALTER TABLE "user_body_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_fitness_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_strength_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_workout_frequency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_fitness_profile" ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários visualizarem apenas seus próprios dados
CREATE POLICY "Usuários podem visualizar apenas suas próprias métricas corporais"
  ON "user_body_metrics"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar apenas suas próprias metas"
  ON "user_fitness_goals"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar apenas seu próprio progresso de força"
  ON "user_strength_progress"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar apenas sua própria frequência de treino"
  ON "user_workout_frequency"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem visualizar apenas seu próprio perfil de fitness"
  ON "user_fitness_profile"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para usuários inserirem seus próprios dados
CREATE POLICY "Usuários podem inserir suas próprias métricas corporais"
  ON "user_body_metrics"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias metas"
  ON "user_fitness_goals"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio progresso de força"
  ON "user_strength_progress"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir sua própria frequência de treino"
  ON "user_workout_frequency"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil de fitness"
  ON "user_fitness_profile"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para usuários atualizarem seus próprios dados
CREATE POLICY "Usuários podem atualizar suas próprias métricas corporais"
  ON "user_body_metrics"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias metas"
  ON "user_fitness_goals"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio progresso de força"
  ON "user_strength_progress"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria frequência de treino"
  ON "user_workout_frequency"
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil de fitness"
  ON "user_fitness_profile"
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para usuários excluírem seus próprios dados
CREATE POLICY "Usuários podem excluir suas próprias métricas corporais"
  ON "user_body_metrics"
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias metas"
  ON "user_fitness_goals"
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seu próprio progresso de força"
  ON "user_strength_progress"
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir sua própria frequência de treino"
  ON "user_workout_frequency"
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seu próprio perfil de fitness"
  ON "user_fitness_profile"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS "idx_user_body_metrics_user_id" ON "user_body_metrics" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_body_metrics_date" ON "user_body_metrics" ("date");
CREATE INDEX IF NOT EXISTS "idx_user_fitness_goals_user_id" ON "user_fitness_goals" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_fitness_goals_status" ON "user_fitness_goals" ("status");
CREATE INDEX IF NOT EXISTS "idx_user_strength_progress_user_id" ON "user_strength_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_strength_progress_exercise_id" ON "user_strength_progress" ("exercise_id");
CREATE INDEX IF NOT EXISTS "idx_user_workout_frequency_user_id" ON "user_workout_frequency" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_workout_frequency_week" ON "user_workout_frequency" ("week_starting");
CREATE INDEX IF NOT EXISTS "idx_user_fitness_profile_user_id" ON "user_fitness_profile" ("user_id");

-- Funções para facilitar a atualização de datas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers para atualizar o campo updated_at automaticamente
CREATE TRIGGER set_updated_at_user_body_metrics
BEFORE UPDATE ON "user_body_metrics"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER set_updated_at_user_fitness_goals
BEFORE UPDATE ON "user_fitness_goals"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER set_updated_at_user_workout_frequency
BEFORE UPDATE ON "user_workout_frequency"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER set_updated_at_user_fitness_profile
BEFORE UPDATE ON "user_fitness_profile"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Função utilitária para calcular o progresso percentual de uma meta
CREATE OR REPLACE FUNCTION calculate_goal_progress(start_value NUMERIC, current_value NUMERIC, target_value NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  progress NUMERIC;
  range_total NUMERIC;
BEGIN
  -- Verificar se a meta é aumentar ou diminuir
  IF target_value > start_value THEN
    -- Meta é aumentar (ex: ganhar massa muscular)
    range_total := target_value - start_value;
    IF range_total = 0 THEN
      RETURN 100; -- Já atingiu a meta
    END IF;
    progress := current_value - start_value;
  ELSE
    -- Meta é diminuir (ex: perder peso)
    range_total := start_value - target_value;
    IF range_total = 0 THEN
      RETURN 100; -- Já atingiu a meta
    END IF;
    progress := start_value - current_value;
  END IF;
  
  -- Calcular e limitar o progresso entre 0 e 100%
  RETURN GREATEST(0, LEAST(100, (progress / range_total) * 100));
END;
$$ LANGUAGE plpgsql;

-- Criar view para facilitar a visualização do progresso das metas
CREATE OR REPLACE VIEW user_goals_progress AS
SELECT
  g.id,
  g.user_id,
  g.title,
  g.goal_type,
  g.start_value,
  g.current_value,
  g.target_value,
  g.unit,
  g.start_date,
  g.target_date,
  g.status,
  CASE
    WHEN g.status = 'completed' THEN 100
    WHEN g.current_value IS NULL THEN 0
    ELSE calculate_goal_progress(g.start_value, g.current_value, g.target_value)
  END AS progress_percentage,
  EXTRACT(DAY FROM (g.target_date - NOW())) AS days_remaining
FROM user_fitness_goals g
WHERE g.status NOT IN ('completed', 'failed', 'abandoned');

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_body_metrics_user_date ON user_body_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_fitness_goals_user_status ON user_fitness_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_strength_progress_user_exercise ON user_strength_progress(user_id, exercise_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_user_fitness_goals_updated_at
    BEFORE UPDATE ON user_fitness_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 