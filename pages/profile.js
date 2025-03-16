import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../components/Layout';

export default function Profile() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalLists: 0,
    totalExercises: 0,
    lastWorkout: null
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Buscar total de treinos usando uma abordagem simplificada
      const { data: workoutSessionsData, error: workoutSessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id);
      
      if (workoutSessionsError) throw workoutSessionsError;
      const workoutsCount = workoutSessionsData?.length || 0;
      
      // Buscar total de listas usando uma abordagem simplificada
      const { data: workoutListsData, error: workoutListsError } = await supabase
        .from('workout_lists')
        .select('id')
        .eq('user_id', user.id);
      
      if (workoutListsError) throw workoutListsError;
      const listsCount = workoutListsData?.length || 0;
      const listIds = workoutListsData.map(list => list.id);
      
      // Buscar exercícios usando os IDs das listas de forma simplificada
      let exercises = [];
      if (listIds.length > 0) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('id')
          .in('workout_list_id', listIds);
        
        if (exercisesError) throw exercisesError;
        exercises = exercisesData || [];
      }
      
      // Buscar último treino de forma simplificada
      let lastWorkout = null;
      
      if (workoutsCount > 0) {
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workout_sessions')
          .select('id, created_at, workout_list_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (workoutsError) throw workoutsError;
        
        if (workoutsData && workoutsData.length > 0) {
          lastWorkout = workoutsData[0];
          
          // Buscar o nome da lista de treino separadamente
          if (lastWorkout.workout_list_id) {
            const { data: listData, error: listError } = await supabase
              .from('workout_lists')
              .select('name')
              .eq('id', lastWorkout.workout_list_id)
              .limit(1);
              
            if (!listError && listData && listData.length > 0) {
              lastWorkout.workout_list = { name: listData[0].name };
            } else {
              lastWorkout.workout_list = { name: 'Lista removida' };
            }
          }
        }
      }
      
      setStats({
        totalWorkouts: workoutsCount,
        totalLists: listsCount,
        totalExercises: exercises.length,
        lastWorkout: lastWorkout
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    
    try {
      // 1. Excluir dados de exercícios (via delete em cascata através de workout_lists)
      // 2. Excluir listas de treinos
      const { error: listsError } = await supabase
        .from('workout_lists')
        .delete()
        .eq('user_id', user.id);
        
      if (listsError) throw listsError;
      
      // 3. Excluir sessões de treino
      const { error: sessionsError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('user_id', user.id);
        
      if (sessionsError) throw sessionsError;
      
      // 4. Excluir detalhes de sessão (se existirem)
      try {
        await supabase
          .from('workout_session_details')
          .delete()
          .in('session_id', 
            supabase
              .from('workout_sessions')
              .select('id')
              .eq('user_id', user.id)
          );
      } catch (detailsError) {
        console.log('Aviso: Erro ao excluir detalhes de sessão ou tabela não existe', detailsError);
        // Não interrompe o fluxo se essa tabela não existir
      }
      
      // 5. Excluir o usuário - usando método padrão disponível para usuários
      const { error: userError } = await supabase.rpc('delete_user');
      
      if (userError) {
        // RPC personalizada não disponível, usar método alternativo
        console.log('Método RPC não disponível, usando alternativa');
        
        // Enviar para endpoint personalizado que lida com a exclusão
        const response = await fetch('/api/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Falha ao excluir conta via API');
        }
        
        // Deslogar o usuário
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        // RPC funcionou, deslogar o usuário e redirecionar
        await supabase.auth.signOut();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      setDeleteError('Ocorreu um erro ao excluir sua conta. Por favor, tente novamente mais tarde.');
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout title="Perfil">
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Seu Perfil</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Informações da Conta</h2>
              <div className="mt-2 grid grid-cols-1 gap-y-2">
                <div>
                  <span className="font-medium text-gray-500">Email:</span>{' '}
                  <span>{user?.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">ID:</span>{' '}
                  <span className="text-sm text-gray-500">{user?.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Conta criada em:</span>{' '}
                  <span>{user?.created_at ? formatDate(user.created_at) : 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Suas Estatísticas</h2>
              {loading ? (
                <p className="mt-2 text-gray-500">Carregando estatísticas...</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800">Total de Treinos</h3>
                    <p className="mt-1 text-3xl font-bold text-blue-600">{stats.totalWorkouts}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <h3 className="text-sm font-medium text-green-800">Listas de Treinos</h3>
                    <p className="mt-1 text-3xl font-bold text-green-600">{stats.totalLists}</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <h3 className="text-sm font-medium text-purple-800">Total de Exercícios</h3>
                    <p className="mt-1 text-3xl font-bold text-purple-600">{stats.totalExercises}</p>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                    <h3 className="text-sm font-medium text-yellow-800">Último Treino</h3>
                    {stats.lastWorkout ? (
                      <div className="mt-1">
                        <p className="font-medium">{stats.lastWorkout.workout_list?.name || 'Lista removida'}</p>
                        <p className="text-sm text-gray-600">{formatDate(stats.lastWorkout.created_at)}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-600">Nenhum treino realizado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleSignOut}
                className="btn-danger"
              >
                Sair da Conta
              </button>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger bg-red-600 hover:bg-red-700"
              >
                Excluir Conta
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de confirmação para exclusão de conta */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-red-600">Excluir Conta</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  <strong>ATENÇÃO:</strong> Você está prestes a excluir sua conta permanentemente.
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Esta ação <strong>NÃO PODE</strong> ser desfeita. Todos os seus dados serão excluídos:
                      </p>
                      <ul className="list-disc ml-5 mt-2 text-sm text-yellow-700">
                        <li>Listas de treino</li>
                        <li>Histórico de treinos</li>
                        <li>Estatísticas e relatórios</li>
                        <li>Informações da conta</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Você precisará criar uma nova conta se desejar usar o aplicativo novamente.
                </p>
              </div>
              
              {deleteError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{deleteError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 