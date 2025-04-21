import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Criar cliente Supabase com chave de serviço para acessar recursos de serviço
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Esta API pode ser chamada por webhook ou pelo próprio aplicativo após uma assinatura bem-sucedida
    const { userId, source = 'app' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    // Se for um webhook, verificar assinatura ou chave de API
    // Se for uma chamada do app, verificar autenticação
    if (source === 'app') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const token = authHeader.split(' ')[1];
      const { data: authData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authData.user) {
        console.error('Erro de autenticação:', authError);
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Se o usuário logado não for admin e estiver tentando registrar para outro usuário
      const isAdmin = await checkIfAdmin(supabase, authData.user.id);
      if (!isAdmin && authData.user.id !== userId) {
        return res.status(403).json({ error: 'Permissão negada' });
      }
    }
    // Se for um webhook, verificar uma chave compartilhada ou assinatura (implementação depende do serviço)
    else if (source === 'webhook') {
      const webhookSecret = req.headers['x-webhook-secret'];
      if (webhookSecret !== process.env.WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Assinatura de webhook inválida' });
      }
    }

    // Verificar se o usuário foi convidado por alguém
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('referred_by')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Erro ao verificar perfil do usuário:', profileError);
      return res.status(500).json({ error: 'Erro ao verificar informações do usuário' });
    }

    if (!userProfile || !userProfile.referred_by) {
      return res.status(200).json({ 
        success: false, 
        message: 'Usuário não foi convidado por ninguém' 
      });
    }

    // Registrar o bônus para quem convidou
    const { data: result, error: bonusError } = await supabase
      .rpc('register_affiliate_bonus', {
        referred_user_id: userId
      });

    if (bonusError) {
      console.error('Erro ao registrar bônus de afiliado:', bonusError);
      return res.status(500).json({ error: 'Erro ao registrar bônus de afiliado' });
    }

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Bônus de afiliado registrado com sucesso',
      referrerId: userProfile.referred_by
    });

  } catch (error) {
    console.error('Erro ao processar registro de bônus:', error);
    return res.status(500).json({ error: 'Erro interno ao processar registro de bônus' });
  }
}

// Função auxiliar para verificar se um usuário é admin
async function checkIfAdmin(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Erro ao verificar se usuário é admin:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Erro ao verificar permissões de admin:', error);
    return false;
  }
} 