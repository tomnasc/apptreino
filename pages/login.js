import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Login() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState('');

  useEffect(() => {
    // Define redirectUrl apenas no lado do cliente
    setRedirectUrl(`${window.location.origin}/dashboard`);
    
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Head>
        <title>Login - Treino na Mão</title>
        <meta name="description" content="Faça login para acessar o Treino na Mão" />
      </Head>

      <div className="dark-card max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2 dark-text-primary">Login</h1>
          <p className="dark-text-secondary text-center">
            Entre com sua conta para acessar seus treinos
          </p>
        </div>

        {/* Renderize o componente Auth apenas do lado do cliente, quando redirectUrl estiver disponível */}
        {redirectUrl && (
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'var(--primary)',
                    brandAccent: 'var(--primary-dark)',
                  }
                }
              }
            }}
            theme={typeof window !== 'undefined' && 
                  window.document.documentElement.classList.contains('dark') 
                  ? 'dark' 
                  : 'light'}
            providers={[]}
            redirectTo={redirectUrl}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  link_text: 'Já tem uma conta? Entre',
                  email_input_placeholder: 'Seu endereço de email',
                  password_input_placeholder: 'Sua senha',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Cadastrar',
                  loading_button_label: 'Cadastrando...',
                  link_text: 'Não tem uma conta? Cadastre-se',
                  email_input_placeholder: 'Seu endereço de email',
                  password_input_placeholder: 'Sua senha',
                },
                forgotten_password: {
                  button_label: 'Enviar instruções',
                  loading_button_label: 'Enviando...',
                  link_text: 'Esqueceu sua senha?',
                  email_input_placeholder: 'Seu endereço de email',
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
} 