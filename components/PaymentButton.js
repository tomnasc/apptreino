import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function PaymentButton({ className, buttonText = 'Assinar Premium', variant = 'primary' }) {
  const [loading, setLoading] = useState(false);

  const handlePaymentClick = async () => {
    try {
      setLoading(true);
      toast.loading('Preparando checkout...', { id: 'checkout' });
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        // Redirecionar para a página de checkout do Stripe
        toast.dismiss('checkout');
        window.location.href = data.url;
      } else {
        console.error('Erro ao criar sessão de checkout:', data.error);
        toast.error('Não foi possível iniciar o checkout', { id: 'checkout' });
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error('Erro ao conectar ao serviço de pagamento', { id: 'checkout' });
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