import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function FitnessGoals() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'weight',
    start_value: '',
    target_value: '',
    unit: 'kg',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
  });

  // Tipos de objetivos disponíveis
  const goalTypes = [
    { value: 'weight', label: 'Peso', defaultUnit: 'kg' },
    { value: 'body_fat', label: 'Gordura Corporal', defaultUnit: '%' },
    { value: 'muscle_mass', label: 'Massa Muscular', defaultUnit: 'kg' },
    { value: 'strength', label: 'Força', defaultUnit: 'kg' },
    { value: 'performance', label: 'Performance', defaultUnit: 'reps' },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadGoals();
  }, [user]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('user_fitness_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data);
    } catch (error) {
      toast.error('Erro ao carregar objetivos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabaseClient
        .from('user_fitness_goals')
        .insert([{
          ...formData,
          user_id: user.id,
          current_value: formData.start_value,
        }]);

      if (error) throw error;

      toast.success('Objetivo criado com sucesso!');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        goal_type: 'weight',
        start_value: '',
        target_value: '',
        unit: 'kg',
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
      });
      loadGoals();
    } catch (error) {
      toast.error('Erro ao criar objetivo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalTypeChange = (e) => {
    const selectedType = e.target.value;
    const defaultUnit = goalTypes.find(type => type.value === selectedType)?.defaultUnit || 'kg';
    setFormData(prev => ({
      ...prev,
      goal_type: selectedType,
      unit: defaultUnit
    }));
  };

  const calculateProgress = (goal) => {
    if (!goal.current_value) return 0;
    const range = Math.abs(goal.target_value - goal.start_value);
    const progress = Math.abs(goal.current_value - goal.start_value);
    return Math.min(100, (progress / range) * 100);
  };

  const updateGoalProgress = async (goalId, newValue) => {
    try {
      const { error } = await supabaseClient
        .from('user_fitness_goals')
        .update({ current_value: newValue })
        .eq('id', goalId);

      if (error) throw error;
      loadGoals();
      toast.success('Progresso atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar progresso: ' + error.message);
    }
  };

  const deleteGoal = async (goalId) => {
    if (!confirm('Tem certeza que deseja excluir este objetivo?')) return;

    try {
      const { error } = await supabaseClient
        .from('user_fitness_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      toast.success('Objetivo excluído com sucesso!');
      loadGoals();
    } catch (error) {
      toast.error('Erro ao excluir objetivo: ' + error.message);
    }
  };

  if (!user) return null;

  return (
    <Layout title="Objetivos de Fitness">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Objetivos de Fitness
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancelar' : 'Novo Objetivo'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: Perder 5kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Objetivo
                </label>
                <select
                  value={formData.goal_type}
                  onChange={handleGoalTypeChange}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  {goalTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor Inicial
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.start_value}
                  onChange={(e) => setFormData({ ...formData, start_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor Alvo
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Alvo
                </label>
                <input
                  type="date"
                  required
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  rows="3"
                  placeholder="Descreva seu objetivo em detalhes..."
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Objetivo'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhum objetivo definido ainda. Crie seu primeiro objetivo!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {goal.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {goal.description}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                  >
                    Excluir
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span>Progresso</span>
                      <span>{calculateProgress(goal).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${calculateProgress(goal)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Inicial: </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {goal.start_value} {goal.unit}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Atual: </span>
                      <input
                        type="number"
                        step="0.1"
                        value={goal.current_value || ''}
                        onChange={(e) => updateGoalProgress(goal.id, e.target.value)}
                        className="w-20 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-right"
                      />
                      <span className="ml-1 text-gray-900 dark:text-gray-100">{goal.unit}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Meta: </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {goal.target_value} {goal.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Início: {new Date(goal.start_date).toLocaleDateString()}</span>
                    <span>Meta: {new Date(goal.target_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 