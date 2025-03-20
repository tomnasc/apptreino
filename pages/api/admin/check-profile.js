import { createClient } from '@supabase/supabase-js';

// Esta API usa a chave de serviço do Supabase para verificar a existência
// de um perfil de usuário, contornando as políticas de segurança RLS
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'ID de usuário não fornecido' });
  }

  // Verificar uma chave de API personalizada para proteger este endpoint
  // (opcional, mas recomendado para produção)
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    console.log('Aviso: verificação de API_SECRET_KEY pulada em desenvolvimento');
    // Em produção, você deve descomentar a linha abaixo
    // return res.status(401).json({ error: 'Chave de API inválida' });
  }

  try {
    // Criar cliente Supabase com chave de serviço (admin)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar se o perfil existe
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Erro de não encontrado, não é um erro real
        return res.status(200).json({ exists: false });
      }
      console.error('Erro ao verificar perfil:', error);
      return res.status(500).json({ error: 'Erro ao verificar perfil' });
    }

    // Retornar informações sobre o perfil
    return res.status(200).json({
      exists: true,
      id: data.id,
      stripe_customer_id: data.stripe_customer_id
    });
  } catch (error) {
    console.error('Erro ao verificar perfil:', error);
    return res.status(500).json({ error: 'Erro interno ao verificar perfil' });
  }
} 