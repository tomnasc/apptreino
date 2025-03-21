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
    console.log('Iniciando configuração da tabela de feedback...');
    
    // SQL para criar a tabela de feedback
    const setupSQL = `
      -- Criar tabela de feedback do usuário
      CREATE TABLE IF NOT EXISTS user_feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        email TEXT,
        feedback_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        device_info TEXT,
        status TEXT DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Habilitar RLS
      ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
      
      -- Política para SELECT (leitura)
      DROP POLICY IF EXISTS "Usuários podem ver seus próprios feedbacks" ON user_feedback;
      CREATE POLICY "Usuários podem ver seus próprios feedbacks"
        ON user_feedback
        FOR SELECT
        USING (user_id = auth.uid());

      -- Política para INSERT (inserção)
      DROP POLICY IF EXISTS "Usuários podem criar feedbacks" ON user_feedback;
      CREATE POLICY "Usuários podem criar feedbacks"
        ON user_feedback
        FOR INSERT
        WITH CHECK (user_id = auth.uid());

      -- Política para UPDATE (atualização)
      DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios feedbacks" ON user_feedback;
      CREATE POLICY "Usuários podem atualizar seus próprios feedbacks"
        ON user_feedback
        FOR UPDATE
        USING (user_id = auth.uid());
    `;

    try {
      // Executar SQL diretamente via method query
      const { data, error } = await supabase
        .from('_exec_sql')
        .select('*')
        .rpc('query', { query: setupSQL });
        
      if (error) {
        console.error('Erro ao executar SQL:', error);
        return res.status(500).json({
          error: 'Erro ao configurar tabela',
          message: error.message
        });
      }
      
      return res.status(200).json({
        message: 'Tabela de feedback configurada com sucesso!'
      });
      
    } catch (sqlError) {
      console.error('Erro ao executar SQL:', sqlError);
      
      // Tentar criar a tabela diretamente sem usar RPC
      try {
        // Verificar se a tabela já existe
        const { error: checkError } = await supabase
          .from('user_feedback')
          .select('id')
          .limit(1);
          
        if (checkError) {
          // Tabela não existe, criar usando método padrão
          await supabase.rpc('create_user_feedback_table', {});
        }
        
        return res.status(200).json({
          message: 'Configuração alternativa realizada',
          details: 'Tabela verificada ou criada via RPC padrão'
        });
        
      } catch (fallbackError) {
        return res.status(500).json({
          error: 'Erro em todas as tentativas de configuração',
          message: sqlError.message,
          fallbackError: fallbackError.message
        });
      }
    }
  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message || 'Erro desconhecido'
    });
  }
} 