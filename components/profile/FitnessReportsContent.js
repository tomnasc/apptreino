import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import { FiDownload, FiCalendar } from 'react-icons/fi';

export default function FitnessReportsContent({ userId }) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [workoutSessions, setWorkoutSessions] = useState([]);
  const [dateRange, setDateRange] = useState('1m'); // 1w, 1m, 3m, 6m, 1y
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    averageTime: 0,
    completedExercises: 0,
    totalWeight: 0
  });

  useEffect(() => {
    loadWorkoutData();
  }, [dateRange]);

  const loadWorkoutData = async () => {
    try {
      setLoading(true);
      
      // Calcular intervalo de datas
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case '1w':
          startDate.setDate(now.getDate() - 7);
          break;
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
      }

      // Buscar sessões de treino
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_session_details(*)
        `)
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      setWorkoutSessions(sessions || []);

      // Calcular estatísticas
      if (sessions) {
        const totalSessions = sessions.length;
        let totalTime = 0;
        let completedExercises = 0;
        let totalWeight = 0;

        sessions.forEach(session => {
          const duration = new Date(session.end_time) - new Date(session.start_time);
          totalTime += duration;

          if (session.workout_session_details) {
            completedExercises += session.workout_session_details.length;
            session.workout_session_details.forEach(detail => {
              if (detail.weight && detail.reps) {
                totalWeight += detail.weight * detail.reps;
              }
            });
          }
        });

        setStats({
          totalSessions,
          totalTime,
          averageTime: totalTime / totalSessions,
          completedExercises,
          totalWeight
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados de treino:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
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
        <h2 className="text-xl font-semibold dark-text-primary">Relatório de Treinos</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="dark-input"
        >
          <option value="1w">Última Semana</option>
          <option value="1m">Último Mês</option>
          <option value="3m">Últimos 3 Meses</option>
          <option value="6m">Últimos 6 Meses</option>
          <option value="1y">Último Ano</option>
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="dark-card p-4 rounded-lg">
          <h3 className="text-sm font-medium dark-text-tertiary mb-1">Total de Treinos</h3>
          <p className="text-2xl font-bold dark-text-primary">{stats.totalSessions}</p>
        </div>

        <div className="dark-card p-4 rounded-lg">
          <h3 className="text-sm font-medium dark-text-tertiary mb-1">Tempo Total</h3>
          <p className="text-2xl font-bold dark-text-primary">{formatDuration(stats.totalTime)}</p>
        </div>

        <div className="dark-card p-4 rounded-lg">
          <h3 className="text-sm font-medium dark-text-tertiary mb-1">Média por Treino</h3>
          <p className="text-2xl font-bold dark-text-primary">{formatDuration(stats.averageTime)}</p>
        </div>

        <div className="dark-card p-4 rounded-lg">
          <h3 className="text-sm font-medium dark-text-tertiary mb-1">Exercícios Realizados</h3>
          <p className="text-2xl font-bold dark-text-primary">{stats.completedExercises}</p>
        </div>

        <div className="dark-card p-4 rounded-lg">
          <h3 className="text-sm font-medium dark-text-tertiary mb-1">Peso Total Levantado</h3>
          <p className="text-2xl font-bold dark-text-primary">{Math.round(stats.totalWeight)} kg</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium dark-text-primary mb-4">Histórico de Treinos</h3>
        
        {workoutSessions.length === 0 ? (
          <p className="text-center dark-text-secondary py-8">
            Nenhum treino registrado no período selecionado.
          </p>
        ) : (
          workoutSessions.map((session) => (
            <div key={session.id} className="dark-card p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium dark-text-primary">{session.workout_name}</h4>
                  <div className="flex items-center space-x-2 text-sm dark-text-tertiary mt-1">
                    <FiCalendar className="h-4 w-4" />
                    <span>{new Date(session.start_time).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>
                      {formatDuration(new Date(session.end_time) - new Date(session.start_time))}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {/* Implementar download do relatório detalhado */}}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
                >
                  <FiDownload className="h-5 w-5" />
                </button>
              </div>
              
              {session.workout_session_details && (
                <div className="mt-3 text-sm dark-text-secondary">
                  <p>{session.workout_session_details.length} exercícios realizados</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 