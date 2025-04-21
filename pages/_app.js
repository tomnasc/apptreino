import { useState, useEffect } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => {
    // Verificação das variáveis de ambiente no lado do cliente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não encontradas no cliente:');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não definida');
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'Não definida');
    }
    
    // Criação do cliente com tratamento de erros
    try {
      return createPagesBrowserClient();
    } catch (error) {
      console.error('Erro ao criar cliente Supabase:', error);
      // Retornamos um cliente vazio que não faz chamadas reais
      return null;
    }
  });

  // Registrar service worker para PWA
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registrado com sucesso:', registration);
          })
          .catch(error => {
            console.error('Erro ao registrar Service Worker:', error);
          });
      });
    }
  }, []);

  // Verificação para evitar erro quando supabaseClient não está disponível
  if (!supabaseClient && typeof window !== 'undefined') {
    // Exibir mensagem amigável para o usuário
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro de configuração</h1>
        <p className="mb-6">
          Houve um problema ao conectar com nossos serviços. 
          Por favor, tente novamente mais tarde ou entre em contato com o suporte.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Head>
        <title>Treino na Mão - Seu assistente de treinos</title>
        <meta name="description" content="Aplicativo para acompanhamento e gerenciamento de treinos" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Treino na Mão" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="theme-color" content="#3b82f6" />
      </Head>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <ToastProvider>
          <Component {...pageProps} />
          <Toaster position="bottom-center" />
        </ToastProvider>
      </SessionContextProvider>
    </ThemeProvider>
  );
}

export default MyApp; 