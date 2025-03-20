import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Head from 'next/head';

export default function Home() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Head>
        <title>Treino na Mão - Gerencie seus treinos</title>
        <meta name="description" content="Controle seus treinos de academia de forma simples e eficiente" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center">
          Bem-vindo ao <span className="text-blue-500">Treino na Mão</span>
        </h1>
        <p className="text-xl mb-8">
          Gerencie seus treinos de academia de forma simples e eficiente.
        </p>

        <div className="card max-w-lg w-full">
          <h2 className="text-2xl font-semibold mb-6">Entrar no aplicativo</h2>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary w-full mb-4"
          >
            Entrar com e-mail
          </button>
          <p className="text-sm text-gray-600">
            Ainda não tem uma conta? Você poderá criar uma ao fazer login.
          </p>
        </div>
      </main>

      <footer className="py-4 text-center">
        <p className="text-gray-600">© {new Date().getFullYear()} Treino na Mão - Todos os direitos reservados</p>
      </footer>
    </div>
  );
} 