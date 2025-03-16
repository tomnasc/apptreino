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
            <button
              onClick={handleSignOut}
              className="btn-danger"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
} 