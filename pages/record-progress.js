import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function RecordProgress() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastMetrics, setLastMetrics] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [metrics, setMetrics] = useState({
    weight: '',
    body_fat_percentage: '',
    muscle_mass: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    calves: '',
    notes: ''
  });

  const [strengthRecord, setStrengthRecord] = useState({
    exercise_id: '',
    exercise_name: '',
    weight: '',
    reps: '',
    sets: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Carregar últimas métricas
      const { data: lastMetricsData, error: metricsError } = await supabaseClient
        .from('user_body_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        throw metricsError;
      }

      // Carregar exercícios
      const { data: exercisesData, error: exercisesError } = await supabaseClient
        .from('workout_exercises')
        .select('id, name')
        .order('name');

      if (exercisesError) throw exercisesError;

      setLastMetrics(lastMetricsData || null);
      setExercises(exercisesData || []);
    } catch (error) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMetricsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Filtrar apenas métricas preenchidas
      const filledMetrics = Object.entries(metrics).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (Object.keys(filledMetrics).length === 0) {
        toast.error('Preencha pelo menos uma métrica');
        return;
      }

      const { error } = await supabaseClient
        .from('user_body_metrics')
        .insert([{
          ...filledMetrics,
          user_id: user.id,
          date: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Métricas registradas com sucesso!');
      setMetrics({
        weight: '',
        body_fat_percentage: '',
        muscle_mass: '',
        chest: '',
        waist: '',
        hips: '',
        arms: '',
        thighs: '',
        calves: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar métricas: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStrengthSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!strengthRecord.exercise_id || !strengthRecord.weight || !strengthRecord.reps) {
        toast.error('Preencha os campos obrigatórios');
        return;
      }

      const exercise = exercises.find(e => e.id === strengthRecord.exercise_id);
      if (!exercise) {
        toast.error('Exercício não encontrado');
        return;
      }

      const { error } = await supabaseClient
        .from('user_strength_progress')
        .insert([{
          ...strengthRecord,
          user_id: user.id,
          exercise_name: exercise.name,
          date: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Recorde de força registrado com sucesso!');
      setStrengthRecord({
        exercise_id: '',
        exercise_name: '',
        weight: '',
        reps: '',
        sets: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Erro ao salvar recorde: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout title="Registrar Progresso">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Registrar Progresso
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Formulário de métricas corporais */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Métricas Corporais
            </h2>

            <form onSubmit={handleMetricsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.weight}
                    onChange={(e) => setMetrics({ ...metrics, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.weight ? `Último: ${lastMetrics.weight}kg` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gordura Corporal (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.body_fat_percentage}
                    onChange={(e) => setMetrics({ ...metrics, body_fat_percentage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.body_fat_percentage ? `Último: ${lastMetrics.body_fat_percentage}%` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Massa Muscular (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.muscle_mass}
                    onChange={(e) => setMetrics({ ...metrics, muscle_mass: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.muscle_mass ? `Último: ${lastMetrics.muscle_mass}kg` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peito (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.chest}
                    onChange={(e) => setMetrics({ ...metrics, chest: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.chest ? `Último: ${lastMetrics.chest}cm` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cintura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.waist}
                    onChange={(e) => setMetrics({ ...metrics, waist: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.waist ? `Último: ${lastMetrics.waist}cm` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quadril (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.hips}
                    onChange={(e) => setMetrics({ ...metrics, hips: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.hips ? `Último: ${lastMetrics.hips}cm` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Braços (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.arms}
                    onChange={(e) => setMetrics({ ...metrics, arms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.arms ? `Último: ${lastMetrics.arms}cm` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Coxas (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.thighs}
                    onChange={(e) => setMetrics({ ...metrics, thighs: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.thighs ? `Último: ${lastMetrics.thighs}cm` : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Panturrilhas (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metrics.calves}
                    onChange={(e) => setMetrics({ ...metrics, calves: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder={lastMetrics?.calves ? `Último: ${lastMetrics.calves}cm` : ''}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={metrics.notes}
                  onChange={(e) => setMetrics({ ...metrics, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  rows="3"
                  placeholder="Adicione observações sobre suas medidas..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Métricas'}
                </button>
              </div>
            </form>
          </div>

          {/* Formulário de recorde de força */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Recorde de Força
            </h2>

            <form onSubmit={handleStrengthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exercício
                </label>
                <select
                  value={strengthRecord.exercise_id}
                  onChange={(e) => setStrengthRecord({ ...strengthRecord, exercise_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">Selecione um exercício</option>
                  {exercises.map(exercise => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={strengthRecord.weight}
                    onChange={(e) => setStrengthRecord({ ...strengthRecord, weight: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repetições
                  </label>
                  <input
                    type="number"
                    value={strengthRecord.reps}
                    onChange={(e) => setStrengthRecord({ ...strengthRecord, reps: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Séries
                  </label>
                  <input
                    type="number"
                    value={strengthRecord.sets}
                    onChange={(e) => setStrengthRecord({ ...strengthRecord, sets: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={strengthRecord.notes}
                  onChange={(e) => setStrengthRecord({ ...strengthRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  rows="3"
                  placeholder="Adicione observações sobre o recorde..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Recorde'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 