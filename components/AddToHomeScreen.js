import { useState, useEffect } from 'react';

export default function AddToHomeScreen() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Verificar se já está em modo standalone (instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone || document.referrer.includes('android-app://');
    
    setIsInStandaloneMode(isStandalone);
    
    // Detectar plataforma
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const android = /Android/.test(ua);
    
    setIsIOS(iOS);
    setIsAndroid(android);
    
    // Mostrar o prompt apenas se for um dispositivo móvel e não estiver instalado
    setShowPrompt((iOS || android) && !isStandalone);
    
    // Não mostrar se o usuário já fechou o prompt anteriormente
    const hasPrompted = localStorage.getItem('homeScreenPromptShown');
    if (hasPrompted) {
      setShowPrompt(false);
    }
  }, []);

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('homeScreenPromptShown', 'true');
  };

  const resetPrompt = () => {
    localStorage.removeItem('homeScreenPromptShown');
    setShowPrompt(true);
  };

  if (!showPrompt) {
    return (
      <div className="mb-2 text-center">
        <button 
          onClick={resetPrompt}
          className="text-sm text-blue-500 flex items-center justify-center gap-1 mx-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-phone" viewBox="0 0 16 16">
            <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
            <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </svg>
          Instalar na tela inicial
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t border-gray-200 z-50">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">Instale o App Treino</h3>
        <button 
          onClick={handleClose} 
          className="text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p className="text-sm mb-2">
        Instale o App Treino na sua tela inicial para acesso rápido e uma experiência completa.
      </p>
      
      {isIOS && (
        <div className="bg-gray-100 rounded-lg p-3 text-sm">
          <p className="font-semibold mb-1">No Safari:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Toque no botão de compartilhamento <span className="inline-block">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              </span>
            </li>
            <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
            <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
          </ol>
        </div>
      )}
      
      {isAndroid && (
        <div className="bg-gray-100 rounded-lg p-3 text-sm">
          <p className="font-semibold mb-1">No Chrome:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Toque no menu (3 pontos) <span className="inline-block">⋮</span> no canto superior direito</li>
            <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong></li>
            <li>Toque em <strong>"Instalar"</strong> na janela de confirmação</li>
          </ol>
          
          <p className="mt-2 text-xs text-gray-600">
            Nota: Se não vir esta opção, aguarde alguns segundos e tente novamente, ou use este app mais algumas vezes para que o Chrome permita a instalação.
          </p>
        </div>
      )}
      
      <button 
        onClick={handleClose}
        className="w-full mt-3 bg-blue-500 text-white py-2 rounded-lg font-medium"
      >
        Entendi
      </button>
    </div>
  );
} 