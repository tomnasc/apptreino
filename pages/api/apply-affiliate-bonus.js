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

    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar se o usuário tem bônus disponíveis
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('affiliate_bonuses')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erro ao verificar perfil do usuário:', profileError);
      return res.status(500).json({ error: 'Erro ao verificar bônus disponíveis' });
    }

    if (!userProfile || userProfile.affiliate_bonuses <= 0) {
      return res.status(400).json({ 
        error: 'Sem bônus disponíveis',
        bonusesCount: userProfile?.affiliate_bonuses || 0 
      });
    }

    // Chamar a função do banco de dados para aplicar o bônus
    const { data: result, error: bonusError } = await supabase
      .rpc('apply_affiliate_bonus', {
        user_id: user.id
      });

    if (bonusError) {
      console.error('Erro ao aplicar bônus de afiliado:', bonusError);
      return res.status(500).json({ error: 'Erro ao aplicar bônus de afiliado' });
    }

    if (!result) {
      return res.status(400).json({ error: 'Bônus não pode ser aplicado' });
    }

    // Obter os dados atualizados do usuário
    const { data: updatedUser, error: updatedError } = await supabase
      .from('user_profiles')
      .select('expiry_date, affiliate_bonuses')
      .eq('id', user.id)
      .single();

    if (updatedError) {
      console.error('Erro ao obter dados atualizados:', updatedError);
      // Não quebrar o fluxo por isso
    }

    // Retornar sucesso com dados atualizados
    return res.status(200).json({
      success: true,
      message: 'Bônus aplicado com sucesso',
      expiryDate: updatedUser?.expiry_date || null,
      remainingBonuses: updatedUser?.affiliate_bonuses || 0
    });

  } catch (error) {
    console.error('Erro ao processar aplicação de bônus:', error);
    return res.status(500).json({ error: 'Erro interno ao processar bônus' });
  }
} 