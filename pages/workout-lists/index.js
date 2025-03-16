import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function WorkoutLists() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [workoutLists, setWorkoutLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWorkoutLists();
    }
  }, [user]);

  const fetchWorkoutLists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_lists')
        .select('*, exercises:workout_exercises(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkoutLists(data || []);
    } catch (error) {
      console.error('Erro ao buscar listas de treinos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta lista de treinos?')) {
      return;
    }

    try {
      setLoading(true);
      // Primeiro exclui os exercícios relacionados
      await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_list_id', id);

      // Depois exclui a lista
      const { error } = await supabase
        .from('workout_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza a lista após a exclusão
      setWorkoutLists(workoutLists.filter(list => list.id !== id));
    } catch (error) {
      console.error('Erro ao excluir lista de treinos:', error);
    } finally {
      setLoading(false);
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
    <Layout title="Listas de Treinos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Suas Listas de Treinos</h1>
          <Link
            href="/workout-lists/new"
            className="btn-primary"
          >
            Nova Lista
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <p>Carregando...</p>
          </div>
        ) : workoutLists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workoutLists.map((list) => (
              <div key={list.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-900">{list.name}</h2>
                  <div className="flex space-x-2">
                    <Link
                      href={`/workout-lists/${list.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mt-2">{list.description || 'Sem descrição'}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Criada em {formatDate(list.created_at)}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {list.exercises?.[0]?.count || 0} exercícios
                  </span>
                </div>
                <div className="mt-6 flex space-x-2">
                  <Link
                    href={`/workout-lists/${list.id}`}
                    className="btn-primary flex-1"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/workout-mode/${list.id}`}
                    className="btn-secondary flex-1"
                  >
                    Treinar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-600 mb-4">
              Você ainda não tem nenhuma lista de treinos.
            </p>
            <Link href="/workout-lists/new" className="btn-primary">
              Criar sua primeira lista
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
} 