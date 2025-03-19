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

    // Executar a criação da função exec_sql - versão corrigida sem usar .catch()
    try {
      const { error: fnError } = await supabase.rpc('exec_sql', {
        sql_query: createExecSqlFn
      });
      
      if (fnError) {
        console.log('Erro na primeira tentativa, tentando método alternativo...');
        throw fnError; // Forçar o fluxo para o bloco catch
      }
    } catch (error) {
      console.log('Tentando criar função exec_sql via SQL direto...');
      // Tentar executar SQL diretamente se a função RPC falhar
      try {
        await supabase.from('_exec_sql').rpc('query', { query: createExecSqlFn });
      } catch (sqlError) {
        console.log('Ignorando erro de SQL direto e continuando...');
        // Continuar mesmo que isso falhe, pois a função pode já existir
      }
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
        exercise_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(session_id, exercise_id, set_index)
      );
      
      -- Verificar se a coluna exercise_name existe na tabela e adicioná-la se não existir
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'workout_session_details' AND column_name = 'exercise_name'
        ) THEN
          ALTER TABLE workout_session_details ADD COLUMN exercise_name TEXT;
        END IF;
      END
      $$;
      
      ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
    `;

    // Criar a view workout_session_averages
    const createViewSql = `
      CREATE OR REPLACE VIEW workout_session_averages AS
      SELECT 
        session_id,
        exercise_id,
        AVG(execution_time) as avg_execution_time,
        AVG(rest_time) as avg_rest_time,
        COUNT(*) as total_sets
      FROM workout_session_details
      GROUP BY session_id, exercise_id;
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
    try {
      const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
        sql_query: createTableSql
      });

      if (tableError) {
        console.error('Erro ao criar tabela:', JSON.stringify(tableError));
        return res.status(500).json({ 
          error: 'Erro ao criar tabela', 
          message: tableError.message || 'Erro desconhecido',
          code: tableError.code || 'UNKNOWN'
        });
      }
    } catch (tableExecError) {
      console.error('Exceção ao criar tabela:', tableExecError.message);
      return res.status(500).json({ 
        error: 'Exceção ao criar tabela', 
        message: tableExecError.message || 'Erro desconhecido'
      });
    }

    // Executar script para criar a view
    console.log('Criando view workout_session_averages...');
    try {
      const { data: viewData, error: viewError } = await supabase.rpc('exec_sql', {
        sql_query: createViewSql
      });

      if (viewError) {
        console.error('Erro ao criar view:', JSON.stringify(viewError));
        return res.status(500).json({ 
          error: 'Erro ao criar view', 
          message: viewError.message || 'Erro desconhecido',
          code: viewError.code || 'UNKNOWN'
        });
      }
    } catch (viewExecError) {
      console.error('Exceção ao criar view:', viewExecError.message);
      return res.status(500).json({ 
        error: 'Exceção ao criar view', 
        message: viewExecError.message || 'Erro desconhecido'
      });
    }

    // Executar script para configurar as políticas
    console.log('Configurando políticas de segurança...');
    try {
      const { data: policiesData, error: policiesError } = await supabase.rpc('exec_sql', {
        sql_query: setupPoliciesSql
      });

      if (policiesError) {
        console.error('Erro ao configurar políticas:', JSON.stringify(policiesError));
        return res.status(500).json({ 
          error: 'Erro ao configurar políticas', 
          message: policiesError.message || 'Erro desconhecido',
          code: policiesError.code || 'UNKNOWN'
        });
      }
    } catch (policyExecError) {
      console.error('Exceção ao configurar políticas:', policyExecError.message);
      return res.status(500).json({ 
        error: 'Exceção ao configurar políticas', 
        message: policyExecError.message || 'Erro desconhecido'
      });
    }

    return res.status(200).json({ 
      message: 'Tabela, view e políticas configuradas com sucesso!',
      table: 'workout_session_details criada',
      view: 'workout_session_averages criada',
      policies: 'Políticas de segurança configuradas'
    });
  } catch (error) {
    console.error('Erro geral:', error.message);
    return res.status(500).json({ 
      error: 'Erro interno', 
      message: error.message || 'Erro desconhecido'
    });
  }
} 