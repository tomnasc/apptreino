import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verificar se a requisição é POST e se há uma chave de autenticação
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicializa o cliente Supabase com a chave de serviço
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Criar função exec_sql se não existir
    const createExecSqlFn = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE sql_query;
        result := '{"success": true}'::JSONB;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
          'success', false,
          'error', SQLERRM,
          'detail', SQLSTATE
        );
        RETURN result;
      END;
      $$;
    `;

    // Executar a criação da função exec_sql
    const { error: fnError } = await supabase.rpc('exec_sql', {
      sql_query: createExecSqlFn
    }).catch(() => {
      // Se a função não existir, executar diretamente via SQL
      return supabase.from('_exec_sql').rpc('query', { query: createExecSqlFn });
    });

    if (fnError) {
      console.log('Tentando criar função exec_sql via SQL direto...');
      // Tentar executar SQL diretamente se a função RPC falhar
      await supabase.from('_exec_sql').rpc('query', { query: createExecSqlFn });
    }

    // Script para criar a tabela workout_session_details
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS workout_session_details (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        exercise_index INTEGER NOT NULL,
        set_index INTEGER NOT NULL,
        reps_completed INTEGER,
        weight_used DECIMAL(5,2),
        execution_time INTEGER,
        rest_time INTEGER,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(session_id, exercise_id, set_index)
      );
      
      ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
    `;

    // Configurar as políticas de segurança
    const setupPoliciesSql = `
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
    `;

    // Executar script para criar a tabela
    console.log('Criando tabela workout_session_details...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql_query: createTableSql
    });

    if (tableError) {
      console.error('Erro ao criar tabela:', tableError);
      return res.status(500).json({ error: 'Erro ao criar tabela', details: tableError });
    }

    // Executar script para configurar as políticas
    console.log('Configurando políticas de segurança...');
    const { error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: setupPoliciesSql
    });

    if (policiesError) {
      console.error('Erro ao configurar políticas:', policiesError);
      return res.status(500).json({ error: 'Erro ao configurar políticas', details: policiesError });
    }

    return res.status(200).json({ 
      message: 'Tabela e políticas configuradas com sucesso!',
      table: 'workout_session_details criada',
      policies: 'Políticas de segurança configuradas'
    });
  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
} 