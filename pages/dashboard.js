import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../components/Layout';
import Link from 'next/link';

export default function Dashboard() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [workoutLists, setWorkoutLists] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar listas de treinos
      const { data: listsData, error: listsError } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (listsError) throw listsError;
      setWorkoutLists(listsData || []);

      // Buscar treinos recentes
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('*, workout_list:workout_list_id(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (workoutsError) throw workoutsError;
      setRecentWorkouts(workoutsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearWorkoutHistory = async () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de treinos? Esta ação não pode ser desfeita.')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('workout_sessions')
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Atualizar a lista de treinos recentes após a limpeza
        setRecentWorkouts([]);
        alert('Histórico de treinos removido com sucesso!');
      } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        alert('Ocorreu um erro ao limpar o histórico de treinos.');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Bem-vindo ao seu dashboard de treinos
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-blue-50 border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-800 mb-4">
                Resumo
              </h2>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium">{workoutLists.length}</span> listas de treinos
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">{recentWorkouts.length}</span> treinos realizados
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/workout-lists"
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  Ver todas as listas
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="card bg-green-50 border border-green-100">
              <h2 className="text-lg font-semibold text-green-800 mb-4">
                Iniciar Treino
              </h2>
              <p className="text-gray-700 mb-4">
                Selecione uma lista de treinos para começar a treinar agora
              </p>
              {loading ? (
                <p>Carregando...</p>
              ) : workoutLists.length > 0 ? (
                <div className="space-y-2">
                  {workoutLists.slice(0, 3).map((list) => (
                    <Link
                      key={list.id}
                      href={`/workout-mode/${list.id}`}
                      className="btn-secondary block text-center"
                    >
                      {list.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  Você ainda não tem listas de treinos.{' '}
                  <Link href="/workout-lists/new" className="text-blue-600 hover:text-blue-800">
                    Crie uma agora
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Treinos recentes</h2>
            {recentWorkouts.length > 0 && (
              <button
                onClick={clearWorkoutHistory}
                className="px-3 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100"
                disabled={loading}
              >
                {loading ? 'Limpando...' : 'Limpar Histórico'}
              </button>
            )}
          </div>
          
          {loading ? (
            <p>Carregando...</p>
          ) : recentWorkouts.length > 0 ? (
            <>
              <div className="block sm:hidden">
                {/* Versão em Cards para telas pequenas (mobile) */}
                <div className="space-y-4">
                  {recentWorkouts.map((session) => (
                    <div key={session.id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium">{formatDate(session.created_at)}</div>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            session.completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {session.completed ? 'Concluído' : 'Em progresso'}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="font-medium text-gray-900">
                          {session.workout_list?.name || 'Lista removida'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Duração: {session.duration ? `${Math.round(session.duration / 60)} min` : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        {!session.completed ? (
                          <Link
                            href={`/workout-mode/${session.workout_list_id}?session=${session.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Retomar Treino
                          </Link>
                        ) : (
                          <Link
                            href={`/workout-report/${session.id}`}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Ver Relatório
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="hidden sm:block overflow-x-auto">
                {/* Versão em Tabela para telas maiores */}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Data
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Lista de Treino
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Duração
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-sm font-medium"
                      >
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentWorkouts.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.workout_list?.name || 'Lista removida'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.duration ? `${Math.round(session.duration / 60)} min` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.completed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {session.completed ? 'Concluído' : 'Em progresso'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!session.completed ? (
                            <Link
                              href={`/workout-mode/${session.workout_list_id}?session=${session.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Retomar Treino
                            </Link>
                          ) : (
                            <Link
                              href={`/workout-report/${session.id}`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Ver Relatório
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              Você ainda não realizou nenhum treino.{' '}
              {workoutLists.length > 0 ? (
                <Link
                  href={`/workout-mode/${workoutLists[0]?.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Comece agora
                </Link>
              ) : (
                <Link href="/workout-lists/new" className="text-blue-600 hover:text-blue-800">
                  Crie uma lista de treinos
                </Link>
              )}
              .
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
} 