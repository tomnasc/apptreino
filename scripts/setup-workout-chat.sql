-- Script para configurar o módulo de Chat sobre Treinos no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela para armazenar histórico de conversas de chat sobre treinos
CREATE TABLE IF NOT EXISTS workout_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES user_assessments(id) ON DELETE SET NULL,
  workout_details JSONB NOT NULL, -- Detalhes do treino sobre o qual o usuário está perguntando
  user_message TEXT NOT NULL,     -- Mensagem enviada pelo usuário
  ai_response TEXT NOT NULL,      -- Resposta gerada pela IA
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  feedback_rating INT,           -- Opcional: avaliação do usuário sobre a resposta (1-5)
  feedback_comment TEXT          -- Opcional: comentário adicional sobre a resposta
);

-- Índices para melhorar a performance de consultas comuns
CREATE INDEX IF NOT EXISTS workout_chat_history_user_id_idx ON workout_chat_history(user_id);
CREATE INDEX IF NOT EXISTS workout_chat_history_assessment_id_idx ON workout_chat_history(assessment_id);
CREATE INDEX IF NOT EXISTS workout_chat_history_timestamp_idx ON workout_chat_history(timestamp);

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE workout_chat_history ENABLE ROW LEVEL SECURITY;

-- Criar política para usuários verem apenas seu próprio histórico de chat
CREATE POLICY "Usuários veem apenas seu próprio histórico de chat"
  ON workout_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Criar política para usuários inserirem apenas seu próprio histórico de chat
CREATE POLICY "Usuários inserem apenas seu próprio histórico de chat"
  ON workout_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Criar política para usuários atualizarem apenas o feedback do seu próprio histórico
CREATE POLICY "Usuários atualizam apenas feedback do seu próprio histórico"
  ON workout_chat_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Configurar permissões para administradores
-- Isso verifica se o usuário está no grupo 'admin'
CREATE POLICY "Administradores têm acesso completo ao histórico de chat"
  ON workout_chat_history
  FOR ALL
  USING (
    auth.jwt() -> 'role' ? 'admin'
  );

-- Comentário explicativo para ajudar administradores
COMMENT ON TABLE workout_chat_history IS 'Armazena histórico de conversas entre usuários e IA sobre treinos para análise e melhoria do sistema'; 