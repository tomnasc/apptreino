# Configuração do Banco de Dados para o Sistema de Relatório

Para implementar completamente o sistema de relatório detalhado, é necessário executar os seguintes scripts SQL no painel do Supabase.

## Criação da Tabela de Detalhes da Sessão

Execute este script no Editor SQL do Supabase:

```sql
-- Função para criar a tabela workout_session_details
CREATE OR REPLACE FUNCTION create_workout_session_details_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Criar a tabela workout_session_details se não existir
  CREATE TABLE IF NOT EXISTS workout_session_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    exercise_index INTEGER NOT NULL,
    set_index INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_used DECIMAL(5,2),
    execution_time INTEGER, -- tempo em segundos
    rest_time INTEGER, -- tempo de descanso em segundos
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, exercise_id, set_index)
  );

  -- Ativar Row Level Security
  ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Executar a função para criar a tabela
SELECT create_workout_session_details_table();
```

## Configuração das Políticas de Segurança (RLS)

Execute este script no Editor SQL do Supabase:

```sql
-- Função para configurar as políticas de segurança
CREATE OR REPLACE FUNCTION setup_workout_session_details_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Política para SELECT (leitura)
  DROP POLICY IF EXISTS "Usuários podem ver detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem ver detalhes de suas próprias sessões"
    ON workout_session_details
    FOR SELECT
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para INSERT (inserção)
  DROP POLICY IF EXISTS "Usuários podem inserir detalhes em suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem inserir detalhes em suas próprias sessões"
    ON workout_session_details
    FOR INSERT
    WITH CHECK (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para UPDATE (atualização)
  DROP POLICY IF EXISTS "Usuários podem atualizar detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem atualizar detalhes de suas próprias sessões"
    ON workout_session_details
    FOR UPDATE
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para DELETE (exclusão)
  DROP POLICY IF EXISTS "Usuários podem excluir detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem excluir detalhes de suas próprias sessões"
    ON workout_session_details
    FOR DELETE
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );
END;
$$;

-- Executar a função para configurar as políticas
SELECT setup_workout_session_details_policies();
```

## Verificação

Após executar os scripts, verifique se a tabela foi criada executando:

```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'workout_session_details';
```

E verifique as políticas com:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'workout_session_details';
```

## Próximos Passos

Após a execução desses scripts, reinicie o aplicativo e o sistema de relatório estará pronto para uso. Ao realizar um treino, todos os detalhes serão registrados automaticamente e poderão ser visualizados no relatório. 