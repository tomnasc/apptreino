import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';

export default function NewWorkoutList() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('O nome da lista de treinos é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('workout_lists')
        .insert([
          { 
            name, 
            description, 
            user_id: user.id 
          }
        ])
        .select();

      if (insertError) throw insertError;
      
      router.push(`/workout-lists/${data[0].id}`);
    } catch (error) {
      console.error('Erro ao criar lista de treinos:', error);
      setError('Ocorreu um erro ao criar a lista de treinos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout title="Nova Lista de Treinos">
        <div className="flex justify-center items-center h-64">
          <p className="dark-text-secondary text-center">
            Você precisa estar logado para criar uma nova lista de treinos.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Nova Lista de Treinos">
      <div className="py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Nova Lista de Treinos</h1>
          <p className="dark-text-secondary">
            Crie uma lista para organizar os seus exercícios e acompanhar seus treinos
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="dark-card rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Nome da Lista *
                </label>
                <input
                  type="text"
                  id="name"
                  className="dark-input mt-1 block w-full rounded-md"
                  placeholder="Ex: Treino A - Superior"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  rows="3"
                  className="dark-input mt-1 block w-full rounded-md"
                  placeholder="Descreva o objetivo desta lista de treinos"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => router.push('/workout-lists')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-medium rounded-md focus:outline-none disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Lista de Treinos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 