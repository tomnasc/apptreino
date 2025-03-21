import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function PaymentButton({ 
  className, 
  buttonText = 'Assinar Premium', 
  variant = 'primary', 
  priceId,
  showToast = true
}) {
  const [loading, setLoading] = useState(false);

  const handlePaymentClick = async () => {
    // Validar se o priceId foi fornecido
    if (!priceId) {
      console.error('Erro: priceId não foi fornecido ao PaymentButton');
      
      if (showToast) {
        toast.error('Configuração incompleta do botão de pagamento');
      }
      
      return;
    }

    try {
      setLoading(true);
      
      if (showToast) {
        toast.loading('Preparando checkout...', { id: 'checkout' });
      }
      
      console.log('Iniciando checkout com priceId:', priceId);
      
      // Usar o endpoint básico que funciona corretamente
      const response = await fetch('/api/create-checkout-session-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });
      
      // Obter dados da resposta com tratamento de erro melhorado
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Erro ao processar resposta JSON:', jsonError);
        
        if (showToast) {
          toast.error('Erro ao processar resposta do servidor', { id: 'checkout' });
        }
        
        setLoading(false);
        return;
      }
      
      // Verificar resposta
      if (response.ok && data?.url) {
        // Redirecionar para a página de checkout do Stripe
        if (showToast) {
          toast.dismiss('checkout');
        }
        
        console.log('Redirecionando para:', data.url);
        window.location.href = data.url;
      } else {
        // Exibir erro detalhado
        const errorMessage = data?.details || data?.error || 'Erro desconhecido';
        console.error('Erro ao criar sessão de checkout:', errorMessage, data);
        
        if (showToast) {
          toast.error(`Erro no checkout: ${errorMessage}`, { id: 'checkout' });
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Exceção ao iniciar checkout:', error);
      
      if (showToast) {
        toast.error('Erro ao conectar ao serviço de pagamento', { id: 'checkout' });
      }
      
      setLoading(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (loading) {
      return `${baseClasses} bg-gray-300 text-gray-600 cursor-not-allowed ${className || ''}`;
    }
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${className || ''}`;
      case 'danger':
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 ${className || ''}`;
      case 'success':
        return `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 ${className || ''}`;
      case 'outline':
        return `${baseClasses} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 ${className || ''}`;
      default:
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${className || ''}`;
    }
  };

  return (
    <button
      onClick={handlePaymentClick}
      disabled={loading}
      className={getButtonClasses()}
    >
      {loading ? 'Processando...' : buttonText}
    </button>
  );
} 