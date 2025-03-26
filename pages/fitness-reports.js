import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function FitnessReports() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [dateRange, setDateRange] = useState('30d');

  const metricOptions = [
    { value: 'weight', label: 'Peso', unit: 'kg' },
    { value: 'body_fat_percentage', label: 'Gordura Corporal', unit: '%' },
    { value: 'muscle_mass', label: 'Massa Muscular', unit: 'kg' },
    { value: 'chest', label: 'Circunferência do Peito', unit: 'cm' },
    { value: 'waist', label: 'Circunferência da Cintura', unit: 'cm' },
    { value: 'hips', label: 'Circunferência do Quadril', unit: 'cm' },
    { value: 'arms', label: 'Circunferência dos Braços', unit: 'cm' },
    { value: 'thighs', label: 'Circunferência das Coxas', unit: 'cm' },
    { value: 'calves', label: 'Circunferência das Panturrilhas', unit: 'cm' },
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '180d', label: 'Últimos 180 dias' },
    { value: '365d', label: 'Último ano' },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, selectedMetric, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar métricas
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: metricsData, error: metricsError } = await supabaseClient
        .from('user_body_metrics')
        .select('*')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      if (metricsError) throw metricsError;

      // Carregar objetivos relacionados à métrica selecionada
      const { data: goalsData, error: goalsError } = await supabaseClient
        .from('user_fitness_goals')
        .select('*')
        .eq('goal_type', selectedMetric)
        .in('status', ['in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setMetrics(metricsData || []);
      setGoals(goalsData || []);
    } catch (error) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateChartData = () => {
    const dates = metrics.map(m => new Date(m.date).toLocaleDateString());
    const values = metrics.map(m => m[selectedMetric]);
    const currentGoal = goals[0]; // Pegar o objetivo mais recente

    const datasets = [
      {
        label: metricOptions.find(m => m.value === selectedMetric)?.label,
        data: values,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1,
      },
    ];

    // Adicionar linha de meta se houver um objetivo
    if (currentGoal) {
      const targetLine = new Array(dates.length).fill(currentGoal.target_value);
      datasets.push({
        label: 'Meta',
        data: targetLine,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderDash: [5, 5],
        tension: 0,
      });
    }

    return {
      labels: dates,
      datasets,
    };
  };

  const calculateProgress = () => {
    if (metrics.length < 2) return null;

    const firstValue = metrics[0][selectedMetric];
    const lastValue = metrics[metrics.length - 1][selectedMetric];
    const change = lastValue - firstValue;
    const percentChange = ((change / firstValue) * 100).toFixed(1);

    return {
      initial: firstValue,
      current: lastValue,
      change: change,
      percentChange: percentChange,
    };
  };

  if (!user) return null;

  const progress = calculateProgress();
  const selectedMetricInfo = metricOptions.find(m => m.value === selectedMetric);

  return (
    <Layout title="Relatórios de Fitness">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-0">
            Relatórios de Fitness
          </h1>

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {metricOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Nenhuma métrica registrada para o período selecionado.
          </div>
        ) : (
          <>
            {/* Cartões de resumo */}
            {progress && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Valor Inicial
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {progress.initial.toFixed(1)} {selectedMetricInfo.unit}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Valor Atual
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {progress.current.toFixed(1)} {selectedMetricInfo.unit}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Variação
                  </h3>
                  <p className={`text-2xl font-semibold ${progress.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {progress.change > 0 ? '+' : ''}{progress.change.toFixed(1)} {selectedMetricInfo.unit}
                    <span className="text-sm ml-1">({progress.percentChange}%)</span>
                  </p>
                </div>
              </div>
            )}

            {/* Gráfico */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <Line
                data={calculateChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                    },
                  },
                }}
              />
            </div>

            {/* Tabela de histórico */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Variação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {metrics.map((metric, index) => {
                      const previousValue = index > 0 ? metrics[index - 1][selectedMetric] : metric[selectedMetric];
                      const change = metric[selectedMetric] - previousValue;
                      const percentChange = ((change / previousValue) * 100).toFixed(1);

                      return (
                        <tr key={metric.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(metric.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {metric[selectedMetric]?.toFixed(1)} {selectedMetricInfo.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {index > 0 && (
                              <span className={change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {change > 0 ? '+' : ''}{change.toFixed(1)} {selectedMetricInfo.unit}
                                <span className="text-xs ml-1">({percentChange}%)</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
} 