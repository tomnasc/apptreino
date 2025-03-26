import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import AddToHomeScreen from './AddToHomeScreen';
import ThemeToggle from './ThemeToggle';

export default function Layout({ children, title = 'Treino na Mão', hideNavigation = false }) {
  const router = useRouter();
  const supabaseClient = useSupabaseClient();
  const [session, setSession] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabaseClient) return;
    
    const getSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      setSession(session);
      
      if (!session) {
        // Não fazer redirecionamento automático ao inicializar
        // router.push('/login');
      } else {
        // Verificar se o usuário é administrador
        checkUserRole(session.user.id);
      }
    };
    
    getSession();
    
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          // Não fazer o redirecionamento automático aqui, deixar o handleSignOut cuidar disso
          // router.push('/login');
        } else {
          // Verificar se o usuário é administrador ao mudar de sessão
          checkUserRole(session.user.id);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabaseClient, router]);

  // Verificar o tipo de plano do usuário
  const checkUserRole = async (userId) => {
    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('plan_type')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao verificar perfil do usuário:', error);
        return;
      }
      
      if (data && data.plan_type === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Erro ao consultar perfil:', err);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
      // Substituir o uso do router por uma redireção direta para evitar conflitos
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-background">
      <Head>
        <title>{title} - Treino na Mão</title>
        <meta name="description" content="Gerencie seus treinos de academia" />
      </Head>

      <header className="bg-header dark:bg-header border-b border-header-border dark:border-header-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  Treino na Mão
                </Link>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`${router.pathname === '/dashboard'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/workout-lists"
                  className={`${router.pathname.startsWith('/workout-lists')
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Listas de Treinos
                </Link>
                <Link
                  href="/profile"
                  className={`${router.pathname === '/profile'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Perfil
                </Link>
                <Link
                  href="/fitness-goals"
                  className={`${router.pathname === '/fitness-goals'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Objetivos
                </Link>
                <Link
                  href="/fitness-reports"
                  className={`${router.pathname === '/fitness-reports'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Relatórios
                </Link>
                <Link
                  href="/payment-history"
                  className={`${router.pathname === '/payment-history'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Pagamentos
                </Link>
                <Link
                  href="/feedback"
                  className={`${router.pathname === '/feedback'
                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Feedback
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`${router.pathname.startsWith('/admin')
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Sair
              </button>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <ThemeToggle className="mr-2" />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              >
                <span className="sr-only">Abrir menu</span>
                {!isMobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-gray-800 transition-colors">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                className={`${router.pathname === '/dashboard'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Dashboard
              </Link>
              <Link
                href="/workout-lists"
                className={`${router.pathname.startsWith('/workout-lists')
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Listas de Treinos
              </Link>
              <Link
                href="/profile"
                className={`${router.pathname === '/profile'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Perfil
              </Link>
              <Link
                href="/fitness-goals"
                className={`${router.pathname === '/fitness-goals'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Objetivos
              </Link>
              <Link
                href="/fitness-reports"
                className={`${router.pathname === '/fitness-reports'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Relatórios
              </Link>
              <Link
                href="/payment-history"
                className={`${router.pathname === '/payment-history'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Pagamentos
              </Link>
              <Link
                href="/feedback"
                className={`${router.pathname === '/feedback'
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                Feedback
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`${router.pathname.startsWith('/admin')
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200'
                    } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="w-full text-left border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-800 dark:hover:text-gray-200 block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {hideNavigation ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 sm:px-0">{children}</div>
          </div>
        )}
      </main>

      <AddToHomeScreen />
    </div>
  );
} 