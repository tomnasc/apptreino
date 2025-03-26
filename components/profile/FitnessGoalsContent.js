import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

export default function FitnessGoalsContent({ userId }) {
  const supabase = useSupabaseClient();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target_date: '' });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
      toast.error('Erro ao carregar objetivos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .insert([
          {
            user_id: userId,
            title: newGoal.title,
            description: newGoal.description,
            target_date: newGoal.target_date,
            status: 'in_progress'
          }
        ]);

      if (error) throw error;

      toast.success('Objetivo adicionado com sucesso!');
      setNewGoal({ title: '', description: '', target_date: '' });
      loadGoals();
    } catch (error) {
      console.error('Erro ao adicionar objetivo:', error);
      toast.error('Erro ao adicionar objetivo');
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const { error } = await supabase
        .from('fitness_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Objetivo excluído com sucesso!');
      loadGoals();
    } catch (error) {
      console.error('Erro ao excluir objetivo:', error);
      toast.error('Erro ao excluir objetivo');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark-text-primary">Objetivos de Fitness</h2>
        <button
          onClick={() => document.getElementById('newGoalForm').classList.toggle('hidden')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
        >
          <FiPlus className="h-5 w-5" />
          <span>Novo Objetivo</span>
        </button>
      </div>

      <form id="newGoalForm" onSubmit={handleSubmit} className="hidden mb-8 space-y-4 dark-card p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium dark-text-tertiary mb-1">
            Título do Objetivo
          </label>
          <input
            type="text"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="dark-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark-text-tertiary mb-1">
            Descrição
          </label>
          <textarea
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            className="dark-input w-full h-24"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark-text-tertiary mb-1">
            Data Alvo
          </label>
          <input
            type="date"
            value={newGoal.target_date}
            onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
            className="dark-input w-full"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
          >
            Adicionar Objetivo
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-center dark-text-secondary py-8">
            Você ainda não tem objetivos definidos. Adicione seu primeiro objetivo!
          </p>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="dark-card p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium dark-text-primary">{goal.title}</h3>
                  <p className="dark-text-secondary mt-1">{goal.description}</p>
                  <p className="text-sm dark-text-tertiary mt-2">
                    Data Alvo: {new Date(goal.target_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
                >
                  <FiTrash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 