import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Head from 'next/head';

// Componente principal da página de treino
export default function WorkoutModePage() {
  const [isClient, setIsClient] = useState(false);

  // Este useEffect garante que o código seja executado apenas no lado do cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Renderizamos o conteúdo real apenas do lado do cliente
  if (!isClient) {
    return (
      <Layout title="Carregando...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  // Se estamos no cliente, é seguro renderizar o componente completo
  return <WorkoutMode />;
}

// Componente que contém a lógica de treino - agora é interno ao arquivo
// para evitar problemas de referência cíclica
function WorkoutMode() {
  const router = useRouter();
  const { id, session: sessionUrlParam } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [workoutList, setWorkoutList] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchWorkoutList();
      fetchExercises();
    }
  }, [id, user]);

  const fetchWorkoutList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setWorkoutList(data);
      } else {
        setError("Lista de treino não encontrada");
        setTimeout(() => {
          router.push('/workout-lists');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao buscar lista de treinos:', error);
      setError('Não foi possível carregar a lista de treinos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_list_id', id)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const startWorkout = async () => {
    try {
      // Iniciar nova sessão de treino
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([
          { 
            user_id: user.id,
            workout_list_id: id,
            completed: false,
            started_at: new Date().toISOString()
          }
        ])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Definir estado para iniciar o treino
        setIsWorkoutActive(true);
        // Outras inicializações importantes...
      }
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      setError('Ocorreu um erro ao iniciar o treino. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <Layout title="Carregando treino...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Treino: ${workoutList?.name || ''}`}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TreinoPro" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 rounded-lg shadow-lg p-3 text-white">
          <h1 className="text-xl font-bold">
            {isWorkoutActive ? 'Treino em Andamento' : 'Iniciar Treino'}
          </h1>
          <div className="flex space-x-2">
            {isWorkoutActive ? (
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                Treino ativo
              </div>
            ) : (
              <>
                <button
                  onClick={() => router.push('/workout-lists')}
                  className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 font-medium py-2 px-4 rounded-full shadow transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={startWorkout}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-all transform hover:scale-105"
                  disabled={exercises.length === 0}
                >
                  Iniciar Treino
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isWorkoutActive ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">
                Lista de Treino: {workoutList?.name}
              </h2>
              
              {workoutList?.description && (
                <p className="dark-text-secondary mb-6">{workoutList.description}</p>
              )}
              
              <div className="space-y-6">
                <h3 className="text-lg font-medium dark-text-primary">Exercícios ({exercises.length})</h3>
                
                {exercises.length > 0 ? (
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="dark-card border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium dark-text-primary">
                            {index + 1}. {exercise.name}
                          </h4>
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <p className="text-xs dark-text-tertiary">Séries</p>
                            <p className="font-medium dark-text-secondary">{exercise.sets}</p>
                          </div>
                          <div>
                            {exercise.reps ? (
                              <>
                                <p className="text-xs dark-text-tertiary">Repetições</p>
                                <p className="font-medium dark-text-secondary">{exercise.reps}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs dark-text-tertiary">Tempo</p>
                                <p className="font-medium dark-text-secondary">{exercise.time}s</p>
                              </>
                            )}
                          </div>
                          <div>
                            <p className="text-xs dark-text-tertiary">Carga</p>
                            <p className="font-medium dark-text-secondary">{exercise.weight ? `${exercise.weight}kg` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs dark-text-tertiary">Descanso</p>
                            <p className="font-medium dark-text-secondary">{exercise.rest_time}s</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="dark-text-tertiary mb-2">Não há exercícios nesta lista de treino</p>
                    <button
                      onClick={() => router.push(`/workout-lists/${id}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Adicionar exercícios
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
            <p className="dark-text-secondary">Treino em andamento...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}