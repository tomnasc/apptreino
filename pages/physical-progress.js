import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
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

export default function PhysicalProgressPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [dateRange, setDateRange] = useState('6m'); // 6m, 1y, all
  const [comparisonDates, setComparisonDates] = useState({
    start: null,
    end: null
  });
  
  // Métricas disponíveis para visualização
  const metrics = [
    { value: 'weight', label: 'Peso (kg)' },
    { value: 'body_fat_percentage', label: 'Gordura Corporal (%)' },
    { value: 'muscle_mass', label: 'Massa Muscular (kg)' },
    { value: 'chest', label: 'Peitoral (cm)' },
    { value: 'waist', label: 'Cintura (cm)' },
    { value: 'hips', label: 'Quadril (cm)' },
    { value: 'right_arm', label: 'Braço Direito (cm)' },
    { value: 'left_arm', label: 'Braço Esquerdo (cm)' },
    { value: 'right_thigh', label: 'Coxa Direita (cm)' },
    { value: 'left_thigh', label: 'Coxa Esquerda (cm)' },
    { value: 'right_calf', label: 'Panturrilha Direita (cm)' },
    { value: 'left_calf', label: 'Panturrilha Esquerda (cm)' },
    { value: 'neck', label: 'Pescoço (cm)' },
    { value: 'shoulders', label: 'Ombros (cm)' }
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadMeasurements();
  }, [user, dateRange]);

  const loadMeasurements = async () => {
    try {
      setLoading(true);
      
      // Calcular data inicial com base no range selecionado
      let startDate = new Date();
      if (dateRange === '6m') {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (dateRange === '1y') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        startDate = new Date(0); // Desde o início
      }
      
      const { data, error } = await supabase
        .from('user_body_measurements')
        .select('*')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      if (error) {
        console.error('Detalhes do erro ao carregar medidas:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      setMeasurements(data || []);
      
      // Definir datas para comparação
      if (data && data.length >= 2) {
        setComparisonDates({
          start: data[0].date,
          end: data[data.length - 1].date
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar medidas:', error);
      toast.error(`Erro ao carregar histórico de medidas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Preparar dados para o gráfico
  const chartData = {
    labels: measurements.map(m => new Date(m.date).toLocaleDateString()),
    datasets: [
      {
        label: metrics.find(m => m.value === selectedMetric)?.label || selectedMetric,
        data: measurements.map(m => m[selectedMetric]),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3
      }
    ]
  };

  // Opções do gráfico
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Evolução ao Longo do Tempo'
      }
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  // Calcular variação entre duas medidas
  const calculateVariation = (metric) => {
    if (!measurements.length || !comparisonDates.start || !comparisonDates.end) {
      return null;
    }

    const startMeasurement = measurements.find(m => m.date === comparisonDates.start);
    const endMeasurement = measurements.find(m => m.date === comparisonDates.end);

    if (!startMeasurement || !endMeasurement) {
      return null;
    }

    const variation = endMeasurement[metric] - startMeasurement[metric];
    const percentage = (variation / startMeasurement[metric]) * 100;

    return {
      absolute: variation.toFixed(2),
      percentage: percentage.toFixed(1),
      improved: metric === 'waist' ? variation < 0 : variation > 0
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Relatório de Evolução Física</h1>
          <p className="dark-text-secondary">Acompanhe seu progresso ao longo do tempo.</p>
        </div>

        {/* Controles */}
        <div className="dark-card rounded-lg shadow-md p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium dark-text-tertiary mb-1">
                Métrica
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="dark-input w-full"
              >
                {metrics.map(metric => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium dark-text-tertiary mb-1">
                Período
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="dark-input w-full"
              >
                <option value="6m">Últimos 6 meses</option>
                <option value="1y">Último ano</option>
                <option value="all">Todo histórico</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadMeasurements}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="dark-card rounded-lg shadow-md p-4 mb-6">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Comparação de Medidas */}
        <div className="dark-card rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold dark-text-primary mb-4">Comparação de Medidas</h2>
          
          {measurements.length >= 2 ? (
            <>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium dark-text-tertiary mb-1">
                    Data Inicial
                  </label>
                  <select
                    value={comparisonDates.start}
                    onChange={(e) => setComparisonDates(prev => ({ ...prev, start: e.target.value }))}
                    className="dark-input w-full"
                  >
                    {measurements.map(m => (
                      <option key={m.date} value={m.date}>
                        {new Date(m.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium dark-text-tertiary mb-1">
                    Data Final
                  </label>
                  <select
                    value={comparisonDates.end}
                    onChange={(e) => setComparisonDates(prev => ({ ...prev, end: e.target.value }))}
                    className="dark-input w-full"
                  >
                    {measurements.map(m => (
                      <option key={m.date} value={m.date}>
                        {new Date(m.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {metrics.map(metric => {
                  const variation = calculateVariation(metric.value);
                  if (!variation) return null;

                  return (
                    <div
                      key={metric.value}
                      className={`p-4 rounded-lg border ${
                        variation.improved
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <h3 className="text-sm font-medium dark-text-tertiary">{metric.label}</h3>
                      <p className={`text-lg font-semibold ${
                        variation.improved
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {variation.absolute} {metric.value.includes('percentage') ? '%' : ''}
                        <span className="text-sm ml-1">
                          ({variation.percentage}%)
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="dark-text-secondary">
              Registre pelo menos duas medidas para ver a comparação.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
} 