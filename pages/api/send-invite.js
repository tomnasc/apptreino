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

    // Obter dados do convite
    const { inviteId, email, inviteCode, senderName = 'Usuário' } = req.body;

    if (!inviteId || !email || !inviteCode) {
      return res.status(400).json({ error: 'Dados de convite incompletos' });
    }

    // Obter o link de convite
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || req.headers.origin}/register?ref=${inviteCode}`;

    // Aqui você implementaria o envio de email usando um serviço como SendGrid, Mailgun, etc.
    // Exemplo com Sendgrid (você precisaria instalar o pacote @sendgrid/mail):
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL, // Email verificado no SendGrid
      subject: `${senderName} está te convidando para o App Treino!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Você recebeu um convite para o App Treino!</h2>
          <p>${senderName} está te convidando para experimentar o App Treino, seu assistente pessoal de treinos.</p>
          <p>Use o link abaixo para se registrar:</p>
          <p>
            <a href="${inviteLink}" style="background-color: #4a76a8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Aceitar Convite
            </a>
          </p>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p>${inviteLink}</p>
          <p>Obrigado!</p>
        </div>
      `,
    };
    
    await sgMail.send(msg);
    */

    // Como não temos um serviço de email configurado, vamos apenas simular o envio
    console.log(`[SIMULANDO EMAIL] Enviando convite para ${email} com código ${inviteCode} e link ${inviteLink}`);

    // Atualizar o status do convite (opcional - isso pode ser feito no frontend também)
    const { error: updateError } = await supabase
      .from('affiliate_invites')
      .update({ status: 'pending' })
      .eq('id', inviteId);

    if (updateError) {
      console.error('Erro ao atualizar status do convite:', updateError);
      // Não quebrar o fluxo por causa disso
    }

    // Resposta de sucesso
    return res.status(200).json({ 
      success: true, 
      message: 'Convite enviado com sucesso', 
      // Em ambiente real, removeria o inviteLink da resposta por segurança
      debug: { inviteLink } 
    });

  } catch (error) {
    console.error('Erro ao enviar convite:', error);
    return res.status(500).json({ error: 'Erro interno ao processar convite' });
  }
} 