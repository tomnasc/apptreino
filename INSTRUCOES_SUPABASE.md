# Instruções para Criar a Tabela no Supabase

Para resolver o erro de "404 (Not Found)" ao tentar usar a tabela `user_body_measurements`, você precisará criar esta tabela no banco de dados Supabase seguindo estas etapas:

## 1. Acesse o Painel do Supabase

- Faça login em [https://app.supabase.io/](https://app.supabase.io/)
- Selecione seu projeto para o "Treino na Mão"

## 2. Crie a Tabela Usando o Editor SQL

1. No menu lateral esquerdo, clique em "SQL Editor"
2. Clique em "Novo query" ou abra uma nova query
3. Copie e cole todo o conteúdo do arquivo `setup-body-measurements.sql` no editor
4. Clique no botão "Run" (Executar) para criar a tabela e suas políticas de segurança

O script SQL vai:
- Criar a tabela `user_body_measurements` com todos os campos necessários
- Configurar as políticas de segurança por linha (RLS)
- Criar um trigger para atualizar o campo `updated_at` quando um registro for modificado
- Adicionar um índice para melhorar a performance das consultas

## 3. Verifique a Criação da Tabela

Após executar o script, você pode verificar se a tabela foi criada acessando:
1. No menu lateral, clique em "Table Editor"
2. Você deverá ver a tabela `user_body_measurements` na lista

## 4. Teste a Funcionalidade

Retorne ao aplicativo e tente novamente registrar medidas corporais. O erro 404 não deve mais ocorrer.

## Conteúdo do Script SQL

Para referência, aqui está o conteúdo do script que você deve executar:

```sql
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
CREATE TRIGGER update_user_body_measurements_updated_at
BEFORE UPDATE ON user_body_measurements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
``` 