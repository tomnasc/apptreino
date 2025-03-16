import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verificar se a requisição é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar o token de autorização
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autorização inválido' });
  }

  try {
    // Inicializa o cliente Supabase com a chave de serviço
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar o token e obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Usuário não autenticado ou token inválido' });
    }
    
    // Excluir o usuário usando a chave de serviço
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Erro ao excluir usuário:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir conta de usuário' });
    }
    
    return res.status(200).json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao processar exclusão de conta:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir conta' });
  }
} 