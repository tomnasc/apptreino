import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

export default function AssessmentPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState({
    height: '',
    weight: '',
    age: '',
    experience_level: 'beginner',
    fitness_goal: 'general_fitness',
    health_limitations: [],
    available_equipment: [],
    workout_days_per_week: 3,
    workout_duration: 60
  });
  
  // Opções para dropdown
  const experienceLevels = [
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' }
  ];
  
  const fitnessGoals = [
    { value: 'weight_loss', label: 'Perda de peso' },
    { value: 'muscle_gain', label: 'Ganho de massa muscular' },
    { value: 'endurance', label: 'Resistência' },
    { value: 'general_fitness', label: 'Condicionamento geral' }
  ];
  
  const healthLimitationOptions = [
    { value: 'back_pain', label: 'Dor nas costas' },
    { value: 'knee_pain', label: 'Dor nos joelhos' },
    { value: 'shoulder_pain', label: 'Dor nos ombros' },
    { value: 'hypertension', label: 'Hipertensão' },
    { value: 'heart_condition', label: 'Condição cardíaca' },
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'arthritis', label: 'Artrite' }
  ];
  
  const equipmentOptions = [
    { value: 'dumbbells', label: 'Halteres' },
    { value: 'barbell', label: 'Barra' },
    { value: 'bench', label: 'Banco' },
    { value: 'resistance_bands', label: 'Elásticos' },
    { value: 'pull_up_bar', label: 'Barra de pull-up' },
    { value: 'gym_access', label: 'Acesso a academia' },
    { value: 'no_equipment', label: 'Sem equipamento' }
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAssessment(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleMultiSelectChange = (e, fieldName) => {
    const options = Array.from(e.target.selectedOptions).map(option => option.value);
    setAssessment(prev => ({
      ...prev,
      [fieldName]: options
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para prosseguir');
      router.push('/login');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validar campos obrigatórios
      if (!assessment.height || !assessment.weight || !assessment.age) {
        toast.error('Por favor, preencha altura, peso e idade');
        return;
      }
      
      // Inserir avaliação no banco
      const { data, error } = await supabase
        .from('user_assessments')
        .insert({
          user_id: user.id,
          height: parseFloat(assessment.height),
          weight: parseFloat(assessment.weight),
          age: parseInt(assessment.age),
          experience_level: assessment.experience_level,
          fitness_goal: assessment.fitness_goal,
          health_limitations: assessment.health_limitations,
          available_equipment: assessment.available_equipment,
          workout_days_per_week: parseInt(assessment.workout_days_per_week),
          workout_duration: parseInt(assessment.workout_duration)
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Avaliação salva com sucesso!');
      
      // Redirecionar para página de sugestão de treinos
      router.push(`/workout-suggestions?assessmentId=${data.id}`);
      
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast.error('Erro ao salvar sua avaliação');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Você precisa estar logado</h2>
            <p className="dark-text-secondary mb-4">Faça login para acessar a avaliação física</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
            >
              Ir para Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Avaliação Física</h1>
          <p className="dark-text-secondary">Preencha o formulário para receber sugestões de treino personalizadas.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="dark-card rounded-lg shadow-md p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dados básicos */}
            <div>
              <h3 className="text-lg font-medium dark-text-primary mb-4">Informações Básicas</h3>
              
              <div className="mb-4">
                <label htmlFor="height" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  min="100"
                  max="250"
                  value={assessment.height}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="weight" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  min="30"
                  max="250"
                  step="0.1"
                  value={assessment.weight}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="age" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Idade
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  min="15"
                  max="100"
                  value={assessment.age}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="experience_level" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Nível de Experiência
                </label>
                <select
                  id="experience_level"
                  name="experience_level"
                  value={assessment.experience_level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {experienceLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="fitness_goal" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Objetivo Principal
                </label>
                <select
                  id="fitness_goal"
                  name="fitness_goal"
                  value={assessment.fitness_goal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fitnessGoals.map(goal => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Preferências de treino */}
            <div>
              <h3 className="text-lg font-medium dark-text-primary mb-4">Preferências de Treino</h3>
              
              <div className="mb-4">
                <label htmlFor="health_limitations" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Limitações de Saúde
                </label>
                <select
                  id="health_limitations"
                  name="health_limitations"
                  multiple
                  value={assessment.health_limitations}
                  onChange={(e) => handleMultiSelectChange(e, 'health_limitations')}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                >
                  {healthLimitationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs dark-text-tertiary">Segure Ctrl para selecionar múltiplas opções</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="available_equipment" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Equipamentos Disponíveis
                </label>
                <select
                  id="available_equipment"
                  name="available_equipment"
                  multiple
                  value={assessment.available_equipment}
                  onChange={(e) => handleMultiSelectChange(e, 'available_equipment')}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                >
                  {equipmentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs dark-text-tertiary">Segure Ctrl para selecionar múltiplas opções</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="workout_days_per_week" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Dias de Treino por Semana
                </label>
                <select
                  id="workout_days_per_week"
                  name="workout_days_per_week"
                  value={assessment.workout_days_per_week}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'dia' : 'dias'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="workout_duration" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Duração do Treino (minutos)
                </label>
                <select
                  id="workout_duration"
                  name="workout_duration"
                  value={assessment.workout_duration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 dark-card border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[30, 45, 60, 75, 90, 120].map(num => (
                    <option key={num} value={num}>
                      {num} minutos
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Nota de Privacidade:</strong> Seus dados serão pseudonimizados e utilizados apenas para gerar recomendações de treino personalizadas. Nenhuma informação pessoal identificável será compartilhada com terceiros.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Gerar Sugestões de Treino'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 