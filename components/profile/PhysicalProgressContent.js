import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';

export default function PhysicalProgressContent({ userId }) {
  const supabase = useSupabaseClient();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [dateRange, setDateRange] = useState('3m'); // 1m, 3m, 6m, 1y, all

  const metrics = [
    { id: 'weight', label: 'Peso', unit: 'kg' },
    { id: 'body_fat', label: 'Gordura Corporal', unit: '%' },
    { id: 'muscle_mass', label: 'Massa Muscular', unit: 'kg' },
    { id: 'chest', label: 'Tórax', unit: 'cm' },
    { id: 'waist', label: 'Cintura', unit: 'cm' },
    { id: 'hips', label: 'Quadril', unit: 'cm' },
    { id: 'arms', label: 'Braços', unit: 'cm' },
    { id: 'thighs', label: 'Coxas', unit: 'cm' }
  ];

  // Carregamento inicial de dados
  useEffect(() => {
    loadMeasurements();
  }, [dateRange]);

  const loadMeasurements = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('user_body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measurement_date', { ascending: true });

      // Aplicar filtro de data
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case '1m':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          // 'all' - não aplica filtro
          break;
      }

      if (dateRange !== 'all') {
        query = query.gte('measurement_date', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Erro ao carregar medidas:', error);
      toast.error('Erro ao carregar histórico de medidas');
    } finally {
      setLoading(false);
    }
  };

  const calculateVariation = (metric) => {
    if (measurements.length < 2) return null;
    const oldest = measurements[0][metric];
    const newest = measurements[measurements.length - 1][metric];
    
    // Verificar se os valores são válidos antes de calcular
    if (oldest === null || newest === null || isNaN(oldest) || isNaN(newest)) return null;
    
    const diff = newest - oldest;
    const percentage = (diff / oldest) * 100;
    return {
      absolute: diff.toFixed(1),
      percentage: percentage.toFixed(1),
      improved: metric === 'waist' ? diff < 0 : diff > 0
    };
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
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium dark-text-tertiary mb-1">
            Métrica
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="dark-input w-full"
          >
            {metrics.map(metric => (
              <option key={metric.id} value={metric.id}>
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
            <option value="1m">Último Mês</option>
            <option value="3m">Últimos 3 Meses</option>
            <option value="6m">Últimos 6 Meses</option>
            <option value="1y">Último Ano</option>
            <option value="all">Todo o Histórico</option>
          </select>
        </div>
      </div>

      {measurements.length === 0 ? (
        <p className="text-center dark-text-secondary py-8">
          Nenhuma medida registrada no período selecionado.
        </p>
      ) : (
        <>
          <div className="mb-8 dark-card p-4 rounded-lg">
            <div className="text-center dark-text-secondary p-6">
              <p>O gráfico de evolução será implementado em breve.</p>
              <p>Por enquanto, você pode visualizar as variações abaixo.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {metrics.map(metric => {
              const variation = calculateVariation(metric.id);
              if (!variation) return null;

              return (
                <div key={metric.id} className="dark-card p-4 rounded-lg">
                  <h3 className="font-medium dark-text-primary mb-2">{metric.label}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-semibold ${
                      variation.improved ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {variation.absolute > 0 ? '+' : ''}{variation.absolute} {metric.unit}
                    </span>
                    <span className={`text-sm ${
                      variation.improved ? 'text-green-500' : 'text-red-500'
                    }`}>
                      ({variation.percentage > 0 ? '+' : ''}{variation.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
} 