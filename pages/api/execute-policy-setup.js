import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verificar se a requisição é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicializa o cliente Supabase com a chave de serviço
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Iniciando configuração do banco de dados...');

    // Executar queries SQL diretamente usando o cliente Supabase
    try {
      console.log('Criando tabela workout_session_details...');
      const { data, error } = await supabase.from('workout_session_details').select('id').limit(1);
      
      if (error) {
        console.log('Tabela não existe, criando...');
        
        // Se a tabela não existe, tentamos criá-la usando SQL query
        const createTableResult = await supabase
          .from('_exec_sql')
          .select('*')
          .rpc('query', { 
            query: `
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
              
              ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
            `
          });
        
        if (createTableResult.error) {
          console.error('Erro ao criar tabela:', createTableResult.error);
          return res.status(500).json({ 
            error: 'Erro ao criar tabela', 
            message: createTableResult.error.message 
          });
        }
      }
      
      // Verificar se a coluna exercise_name existe e adicionar se necessário
      console.log('Verificando e adicionando coluna exercise_name se necessário...');
      await supabase
        .from('_exec_sql')
        .select('*')
        .rpc('query', { 
          query: `
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
          `
        });
      
      // Criando a view workout_session_averages
      console.log('Criando view workout_session_averages...');
      await supabase
        .from('_exec_sql')
        .select('*')
        .rpc('query', { 
          query: `
            CREATE OR REPLACE VIEW workout_session_averages AS
            SELECT 
              session_id,
              exercise_id,
              AVG(execution_time) as avg_execution_time,
              AVG(rest_time) as avg_rest_time,
              COUNT(*) as total_sets
            FROM workout_session_details
            GROUP BY session_id, exercise_id;
          `
        });
      
      // Configurando políticas de segurança
      console.log('Configurando políticas de segurança...');
      await supabase
        .from('_exec_sql')
        .select('*')
        .rpc('query', { 
          query: `
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
          `
        });

      return res.status(200).json({ 
        message: 'Configuração concluída com sucesso!',
        table: 'workout_session_details criada ou já existente',
        view: 'workout_session_averages criada',
        policies: 'Políticas de segurança configuradas'
      });
      
    } catch (dbError) {
      console.error('Erro ao executar operações no banco de dados:', dbError);
      return res.status(500).json({ 
        error: 'Erro ao executar operações no banco de dados', 
        message: typeof dbError === 'object' ? JSON.stringify(dbError) : String(dbError) 
      });
    }
  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      message: typeof error === 'object' ? JSON.stringify(error) : String(error)
    });
  }
} 