import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    paidUsers: 0,
    freeUsers: 0,
    pendingFeedbacks: 0
  });
  
  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('plan_type')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao verificar permissões:', error);
          toast.error('Erro ao verificar permissões de administrador');
          router.push('/dashboard');
          return;
        }
        
        if (data && data.plan_type === 'admin') {
          setIsAdmin(true);
          // Carregar estatísticas
          loadStats();
        } else {
          toast.error('Acesso restrito. Você não tem permissões de administrador.');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Erro:', err);
        toast.error('Ocorreu um erro ao verificar suas permissões');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user, supabase, router]);
  
  // Carregar estatísticas para o dashboard de administração
  const loadStats = async () => {
    try {
      // Obter contagem total de usuários
      const { count: totalUsers, error: totalError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) throw totalError;
      
      // Contar usuários admin
      const { count: adminUsers, error: adminError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'admin');
      
      if (adminError) throw adminError;
      
      // Contar usuários pagos
      const { count: paidUsers, error: paidError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'paid');
      
      if (paidError) throw paidError;
      
      // Contar usuários gratuitos
      const { count: freeUsers, error: freeError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'free');
      
      if (freeError) throw freeError;
      
      // Contar feedbacks pendentes
      const { count: pendingCount, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente');
      
      if (feedbackError) throw feedbackError;
      
      // Atualizar estado
      setStats({
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        paidUsers: paidUsers || 0,
        freeUsers: freeUsers || 0,
        pendingFeedbacks: pendingCount || 0
      });
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Não foi possível carregar estatísticas');
    }
  };
  
  if (loading) {
    return (
      <Layout title="Painel de Administração">
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) {
    return null; // Redirecionamento já é tratado no useEffect
  }
  
  return (
    <Layout title="Painel de Administração">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Painel de Administração</h1>
        <p className="text-gray-600">
          Gerencie usuários, configurações e feedback do aplicativo
        </p>
      </div>
      
      {/* Cards com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Usuários</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          <div className="mt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Administradores:</span>
              <span className="font-medium">{stats.adminUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Usuários pagos:</span>
              <span className="font-medium">{stats.paidUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Usuários gratuitos:</span>
              <span className="font-medium">{stats.freeUsers}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Feedbacks</h3>
          <p className="text-3xl font-bold text-orange-500">{stats.pendingFeedbacks}</p>
          <p className="text-sm text-gray-600 mt-2">
            Feedbacks pendentes de resposta
          </p>
          {stats.pendingFeedbacks > 0 && (
            <Link 
              href="/admin/feedback" 
              className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos →
            </Link>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Configurações</h3>
          <div className="flex flex-col space-y-2 mt-4">
            <Link
              href="/admin/settings"
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Configurações do Aplicativo
            </Link>
          </div>
        </div>
      </div>
      
      {/* Menu de navegação administrativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Gerenciamento de Usuários</h3>
          <ul className="space-y-2">
            <li>
              <Link 
                href="/admin/users" 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Lista de Usuários
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/users/new" 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                Adicionar Novo Usuário
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/trial-periods" 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Gerenciar Períodos de Teste
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Comunicação e Feedback</h3>
          <ul className="space-y-2">
            <li>
              <Link 
                href="/admin/feedback" 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                Gerenciar Feedbacks
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/announcements" 
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
                Criar Anúncio
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
} 