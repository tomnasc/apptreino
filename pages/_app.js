import { useState, useEffect } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  // Define a favicon e meta tags
  useEffect(() => {
    // Verifique se o service worker é suportado
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Desregistrar service workers existentes para evitar problemas
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>App Treino - Seu assistente de treinos</title>
        <meta name="description" content="Aplicativo para acompanhamento e gerenciamento de treinos" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <Component {...pageProps} />
        <Toaster position="bottom-center" />
      </SessionContextProvider>
    </>
  );
}

export default MyApp; 