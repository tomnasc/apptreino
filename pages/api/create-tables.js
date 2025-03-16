import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Função para criar as tabelas necessárias
export default async function handler(req, res) {
  // Verifica se a requisição é POST e se há uma chave de autenticação
  if (req.method !== 'POST' || req.headers.authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Inicializa o cliente Supabase com a chave de serviço
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Criar tabela workout_session_details
    const { error: detailsError } = await supabase
      .rpc('create_workout_session_details_table', {});

    if (detailsError) {
      console.error('Erro ao criar tabela de detalhes de sessão:', detailsError);
      return res.status(500).json({ error: 'Erro ao criar tabela de detalhes de sessão' });
    }

    // Configurar as políticas de RLS
    const { error: policiesError } = await supabase
      .rpc('setup_workout_session_details_policies', {});

    if (policiesError) {
      console.error('Erro ao configurar políticas:', policiesError);
      return res.status(500).json({ error: 'Erro ao configurar políticas de segurança' });
    }

    return res.status(200).json({ message: 'Tabelas criadas com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    return res.status(500).json({ error: 'Erro interno ao criar tabelas' });
  }
} 