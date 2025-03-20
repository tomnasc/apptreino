-- Criação da tabela de feedback dos usuários
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pending',
  response TEXT,
  response_date TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar comentários à tabela
COMMENT ON TABLE user_feedback IS 'Armazena feedback e mensagens dos usuários';
COMMENT ON COLUMN user_feedback.user_id IS 'ID do usuário que enviou o feedback';
COMMENT ON COLUMN user_feedback.subject IS 'Assunto do feedback';
COMMENT ON COLUMN user_feedback.message IS 'Conteúdo da mensagem do feedback';
COMMENT ON COLUMN user_feedback.category IS 'Categoria do feedback (sugestão, problema, dúvida, etc)';
COMMENT ON COLUMN user_feedback.status IS 'Status do feedback (pendente, respondido, encerrado)';
COMMENT ON COLUMN user_feedback.response IS 'Resposta da equipe administrativa';
COMMENT ON COLUMN user_feedback.response_date IS 'Data em que a resposta foi enviada';
COMMENT ON COLUMN user_feedback.responded_by IS 'ID do administrador que respondeu ao feedback';

-- Habilitar RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários comuns podem ver apenas seus próprios feedbacks
CREATE POLICY "Usuários podem ver seu próprio feedback" 
  ON user_feedback FOR SELECT 
  USING (auth.uid() = user_id);

-- Usuários comuns podem inserir novos feedbacks associados ao seu ID
CREATE POLICY "Usuários podem criar feedback" 
  ON user_feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Administradores podem ver todos os feedbacks
CREATE POLICY "Administradores podem ver todos os feedbacks" 
  ON user_feedback FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND plan_type = 'admin'
    )
  );

-- Administradores podem responder aos feedbacks (atualizar)
CREATE POLICY "Administradores podem responder feedbacks" 
  ON user_feedback FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND plan_type = 'admin'
    )
  );

-- Criar um gatilho para atualizar o timestamp updated_at
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_timestamp
BEFORE UPDATE ON user_feedback
FOR EACH ROW
EXECUTE FUNCTION update_user_feedback_updated_at();

-- Criar índices para melhorar o desempenho
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at); 