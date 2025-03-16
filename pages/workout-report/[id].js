import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function WorkoutReport() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [workoutList, setWorkoutList] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados da sessão de treino
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        setError('Sessão de treino não encontrada.');
        setLoading(false);
        return;
      }
      
      setSession(sessionData);
      
      // Buscar dados da lista de treino
      const { data: listData, error: listError } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('id', sessionData.workout_list_id)
        .single();
      
      if (listError) throw listError;
      setWorkoutList(listData);
      
      // Buscar exercícios da lista
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_list_id', sessionData.workout_list_id)
        .order('order_position', { ascending: true });
      
      if (exercisesError) throw exercisesError;
      setExercises(exercisesData || []);
      
      // Buscar detalhes da sessão da nossa nova tabela
      const { data: detailsData, error: detailsError } = await supabase
        .from('workout_session_details')
        .select('*')
        .eq('session_id', id)
        .order('exercise_index', { ascending: true })
        .order('set_index', { ascending: true });
      
      if (detailsError) {
        console.error('Erro ao buscar detalhes da sessão:', detailsError);
      } else {
        setSessionDetails(detailsData || []);
      }
      
    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error);
      setError('Não foi possível carregar o relatório de treino.');
    } finally {
      setLoading(false);
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
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min ${remainingSeconds}s`;
    } else {
      return `${minutes}min ${remainingSeconds}s`;
    }
  };

  if (loading) {
    return (
      <Layout title="Carregando Relatório...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Erro">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <Link href="/dashboard" className="btn-primary">
            Voltar para o Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatório de Treino">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Relatório de Treino
          </h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Voltar ao Dashboard
          </Link>
        </div>
        
        {/* Informações gerais do treino */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informações Gerais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Lista de Treino</h3>
              <p className="mt-1 text-lg text-gray-900">{workoutList?.name || 'Lista removida'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  session.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {session.completed ? 'Concluído' : 'Em progresso'}
                </span>
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Data de Início</h3>
              <p className="mt-1 text-lg text-gray-900">{formatDate(session.started_at)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Data de Término</h3>
              <p className="mt-1 text-lg text-gray-900">{formatDate(session.ended_at)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Duração Total</h3>
              <p className="mt-1 text-lg text-gray-900">{formatDuration(session.duration)}</p>
            </div>
          </div>
        </div>
        
        {/* Detalhes dos exercícios */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Detalhes dos Exercícios
          </h2>
          
          {exercises.length > 0 ? (
            <div className="space-y-6">
              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {index + 1}. {exercise.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
                    {exercise.weight && (
                      <div>
                        <span className="font-medium text-gray-500">Carga:</span>{' '}
                        <span>{exercise.weight} kg</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-500">Séries:</span>{' '}
                      <span>{exercise.sets}</span>
                    </div>
                    {exercise.reps && (
                      <div>
                        <span className="font-medium text-gray-500">Repetições Planejadas:</span>{' '}
                        <span>{exercise.reps}</span>
                      </div>
                    )}
                    {exercise.time && (
                      <div>
                        <span className="font-medium text-gray-500">Tempo Planejado:</span>{' '}
                        <span>{exercise.time} segundos</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Detalhes da execução das séries - se houver dados */}
                  {sessionDetails && sessionDetails.filter(d => d.exercise_id === exercise.id).length > 0 ? (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Detalhes de Execução</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Série
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Repetições Realizadas
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Carga
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tempo de Execução
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tempo de Descanso
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sessionDetails.filter(d => d.exercise_id === exercise.id).map((detail) => (
                              <tr key={`${detail.exercise_id}-${detail.set_index}`}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {detail.set_index + 1}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {detail.reps_completed || 'N/A'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {detail.weight_used ? `${detail.weight_used} kg` : 'N/A'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {detail.execution_time ? `${detail.execution_time}s` : 'N/A'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {detail.rest_time ? `${detail.rest_time}s` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-500 italic">
                      Detalhes de execução não disponíveis para este exercício.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Não há exercícios registrados para esta sessão de treino.</p>
          )}
        </div>
        
        {/* Observações/conclusões */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Resumo e Estatísticas
          </h2>
          
          <p className="text-gray-500 mb-4">
            Este relatório mostra um resumo da sessão de treino realizada. 
            Para dados mais detalhados, será necessário implementar um sistema de acompanhamento
            detalhado de cada série e repetição durante o treino.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Total de Exercícios</h3>
              <p className="text-2xl font-bold text-blue-600">{exercises.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-800 mb-2">Tempo Total</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatDuration(session.duration)}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="text-sm font-medium text-purple-800 mb-2">Séries Totais</h3>
              <p className="text-2xl font-bold text-purple-600">
                {exercises.reduce((total, ex) => total + (ex.sets || 0), 0)}
              </p>
            </div>
          </div>
          
          {sessionDetails && sessionDetails.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas Detalhadas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h4 className="text-sm font-medium text-indigo-800 mb-2">Média de Repetições</h4>
                  <p className="text-2xl font-bold text-indigo-600">
                    {sessionDetails.filter(d => d.reps_completed).length > 0 
                      ? Math.round(sessionDetails.reduce((sum, d) => sum + (d.reps_completed || 0), 0) / 
                          sessionDetails.filter(d => d.reps_completed).length)
                      : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                  <h4 className="text-sm font-medium text-pink-800 mb-2">Tempo Médio de Execução</h4>
                  <p className="text-2xl font-bold text-pink-600">
                    {sessionDetails.filter(d => d.execution_time).length > 0 
                      ? `${Math.round(sessionDetails.reduce((sum, d) => sum + (d.execution_time || 0), 0) / 
                          sessionDetails.filter(d => d.execution_time).length)}s`
                      : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Tempo Médio de Descanso</h4>
                  <p className="text-2xl font-bold text-yellow-600">
                    {sessionDetails.filter(d => d.rest_time).length > 0 
                      ? `${Math.round(sessionDetails.reduce((sum, d) => sum + (d.rest_time || 0), 0) / 
                          sessionDetails.filter(d => d.rest_time).length)}s`
                      : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="text-sm font-medium text-orange-800 mb-2">Carga Média</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {sessionDetails.filter(d => d.weight_used).length > 0 
                      ? `${(sessionDetails.reduce((sum, d) => sum + (parseFloat(d.weight_used) || 0), 0) / 
                          sessionDetails.filter(d => d.weight_used).length).toFixed(1)} kg`
                      : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-800 mb-3">Progresso ao Longo do Treino</h4>
                <div className="h-64">
                  <div className="h-full flex items-end justify-between space-x-1">
                    {sessionDetails
                      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                      .map((detail, index) => {
                        const height = detail.reps_completed 
                          ? `${Math.min(100, (detail.reps_completed / (exercises.find(e => e.id === detail.exercise_id)?.reps || 1)) * 100)}%`
                          : '20%';
                        
                        return (
                          <div 
                            key={index} 
                            className="bg-blue-500 rounded-t w-full"
                            style={{ 
                              height, 
                              transition: 'height 0.3s ease'
                            }}
                            title={`Exercício: ${(exercises.find(e => e.id === detail.exercise_id)?.name || 'Desconhecido')}
Série: ${detail.set_index + 1}
Repetições: ${detail.reps_completed || 'N/A'}
Carga: ${detail.weight_used ? `${detail.weight_used} kg` : 'N/A'}
Tempo: ${detail.execution_time ? `${detail.execution_time}s` : 'N/A'}`}
                          />
                        );
                      })
                    }
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Cada barra representa uma série (altura baseada no % de repetições completadas)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 