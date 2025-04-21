import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [affiliateCode, setAffiliateCode] = useState('');
  
  useEffect(() => {
    // Se já estiver logado, redirecionar para o dashboard
    if (user) {
      router.push('/dashboard');
    }
    
    // Verificar se há um código de afiliado na URL
    if (router.query.ref && typeof router.query.ref === 'string') {
      setAffiliateCode(router.query.ref);
    }
  }, [user, router]);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Criar o usuário
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            affiliate_code: affiliateCode || null, // Guardar o código do afiliado
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (data) {
        showToast('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.', 'success');
        
        // Se tiver um código de afiliado, processa a relação
        if (affiliateCode) {
          try {
            // Processar o código de afiliado
            await supabase.rpc('process_affiliate_registration', {
              new_user_id: data.user.id,
              affiliate_code: affiliateCode
            });
            
            showToast('Você foi registrado usando um código de convite!', 'success');
          } catch (affiliateError) {
            console.error('Erro ao processar código de afiliado:', affiliateError);
            // Não interromper o fluxo se houver erro no processamento do afiliado
          }
        }
        
        // Redirecionar para a página de login ou dashboard
        router.push('/login?registration=success');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      if (error.message.includes('already registered')) {
        setError('Este email já está registrado. Por favor, faça login.');
      } else {
        setError('Erro ao cadastrar: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout title="Registro" hideNav>
      <div className="flex min-h-[80vh] flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight dark-text-primary">
            Criar nova conta
          </h2>
          <p className="mt-2 text-center text-sm dark-text-tertiary">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Faça login
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="dark-card rounded-lg shadow py-8 px-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleRegister}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium dark-text-primary">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium dark-text-primary">
                  Senha
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium dark-text-primary">
                  Confirmar Senha
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Código de afiliado */}
              <div>
                <label htmlFor="affiliateCode" className="block text-sm font-medium dark-text-primary">
                  Código de Convite (opcional)
                </label>
                <div className="mt-1">
                  <input
                    id="affiliateCode"
                    name="affiliateCode"
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800"
                    placeholder="Digite o código de convite, se tiver"
                  />
                </div>
                {affiliateCode && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Você está se registrando com um código de convite!
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 