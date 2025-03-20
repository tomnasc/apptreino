export default function handler(req, res) {
  try {
    // Verificar se a variável de ambiente está definida
    if (!process.env.STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID não está definido nas variáveis de ambiente');
      return res.status(500).json({ 
        error: 'Configuração incompleta',
        message: 'ID do preço não está configurado no servidor'
      });
    }
    
    // Retornar o ID do preço configurado
    return res.status(200).json({ 
      priceId: process.env.STRIPE_PRICE_ID 
    });
  } catch (error) {
    console.error('Erro ao buscar ID do preço:', error);
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message || 'Erro desconhecido' 
    });
  }
} 