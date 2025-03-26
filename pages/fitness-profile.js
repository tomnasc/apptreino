import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

export default function FitnessProfile() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado para o perfil de fitness
  const [profile, setProfile] = useState({
    fitness_level: 'beginner',
    primary_goal: 'general_fitness',
    secondary_goal: '',
    weekly_workout_target: 3,
    daily_activity_level: 'lightly_active',
    health_conditions: [],
    injuries: [],
    dietary_preferences: [],
    last_assessment_date: new Date().toISOString().split('T')[0]
  });
  
  // Estado para métricas corporais
  const [bodyMetrics, setBodyMetrics] = useState({
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
  
  // Opções para selects
  const fitnessLevels = [
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' }
  ];
  
  const fitnessGoals = [
    { value: 'weight_loss', label: 'Perda de peso' },
    { value: 'muscle_gain', label: 'Ganho de massa muscular' },
    { value: 'strength', label: 'Força' },
    { value: 'endurance', label: 'Resistência' },
    { value: 'general_fitness', label: 'Condicionamento geral' },
    { value: 'flexibility', label: 'Flexibilidade' },
    { value: 'rehabilitation', label: 'Reabilitação' }
  ];
  
  const activityLevels = [
    { value: 'sedentary', label: 'Sedentário (pouca ou nenhuma atividade)' },
    { value: 'lightly_active', label: 'Levemente ativo (exercício leve 1-3 dias/semana)' },
    { value: 'moderately_active', label: 'Moderadamente ativo (exercício moderado 3-5 dias/semana)' },
    { value: 'very_active', label: 'Muito ativo (exercício intenso 6-7 dias/semana)' },
    { value: 'extra_active', label: 'Extremamente ativo (exercício muito intenso, trabalho físico ou treinamento duplo)' }
  ];
  
  const healthConditionOptions = [
    { value: 'hypertension', label: 'Hipertensão' },
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'heart_disease', label: 'Doença cardíaca' },
    { value: 'asthma', label: 'Asma' },
    { value: 'arthritis', label: 'Artrite' },
    { value: 'obesity', label: 'Obesidade' },
    { value: 'cholesterol', label: 'Colesterol alto' },
    { value: 'none', label: 'Nenhuma condição de saúde' }
  ];
  
  const injuryOptions = [
    { value: 'back_injury', label: 'Lesão nas costas/coluna' },
    { value: 'knee_injury', label: 'Lesão no joelho' },
    { value: 'shoulder_injury', label: 'Lesão no ombro' },
    { value: 'ankle_injury', label: 'Lesão no tornozelo' },
    { value: 'wrist_injury', label: 'Lesão no pulso' },
    { value: 'neck_injury', label: 'Lesão no pescoço' },
    { value: 'hip_injury', label: 'Lesão no quadril' },
    { value: 'none', label: 'Nenhuma lesão' }
  ];
  
  const dietaryOptions = [
    { value: 'vegan', label: 'Vegano' },
    { value: 'vegetarian', label: 'Vegetariano' },
    { value: 'pescatarian', label: 'Pescetariano' },
    { value: 'keto', label: 'Cetogênica' },
    { value: 'paleo', label: 'Paleolítica' },
    { value: 'gluten_free', label: 'Sem glúten' },
    { value: 'lactose_free', label: 'Sem lactose' },
    { value: 'no_restrictions', label: 'Sem restrições' }
  ];
  
  // Efeito para carregar o perfil existente
  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Carregar perfil de fitness
      const { data: profileData, error: profileError } = await supabase
        .from('user_fitness_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', profileError);
        toast.error('Erro ao carregar perfil de fitness');
      }
      
      if (profileData) {
        setProfile(profileData);
      }
      
      // Carregar métricas corporais mais recentes
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_body_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);
      
      if (metricsError) {
        console.error('Erro ao carregar métricas:', metricsError);
        toast.error('Erro ao carregar métricas corporais');
      }
      
      if (metricsData && metricsData.length > 0) {
        setBodyMetrics(metricsData[0]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
      toast.error('Ocorreu um erro ao carregar seus dados');
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleMetricsChange = (e) => {
    const { name, value } = e.target;
    setBodyMetrics(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleMultiSelectChange = (e, fieldName) => {
    // Pegar todos os valores selecionados do select múltiplo
    const options = Array.from(e.target.selectedOptions).map(option => option.value);
    
    // Se 'none' for selecionado junto com outras opções, remover as outras opções
    if (options.includes('none')) {
      setProfile(prev => ({
        ...prev,
        [fieldName]: ['none']
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [fieldName]: options
      }));
    }
  };
  
  const saveProfile = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar seu perfil');
      router.push('/login');
      return;
    }
    
    try {
      setSaving(true);
      
      // Salvar o perfil de fitness
      const { data: profileData, error: profileError } = await supabase
        .from('user_fitness_profile')
        .upsert({
          user_id: user.id,
          fitness_level: profile.fitness_level,
          primary_goal: profile.primary_goal,
          secondary_goal: profile.secondary_goal,
          weekly_workout_target: parseInt(profile.weekly_workout_target),
          daily_activity_level: profile.daily_activity_level,
          health_conditions: profile.health_conditions,
          injuries: profile.injuries,
          dietary_preferences: profile.dietary_preferences,
          last_assessment_date: profile.last_assessment_date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      
      // Salvar as métricas corporais como um novo registro
      // Verificar se há pelo menos o peso informado
      if (bodyMetrics.weight) {
        const { error: metricsError } = await supabase
          .from('user_body_metrics')
          .insert({
            user_id: user.id,
            date: new Date().toISOString(),
            weight: bodyMetrics.weight ? parseFloat(bodyMetrics.weight) : null,
            body_fat_percentage: bodyMetrics.body_fat_percentage ? parseFloat(bodyMetrics.body_fat_percentage) : null,
            muscle_mass: bodyMetrics.muscle_mass ? parseFloat(bodyMetrics.muscle_mass) : null,
            chest: bodyMetrics.chest ? parseFloat(bodyMetrics.chest) : null,
            waist: bodyMetrics.waist ? parseFloat(bodyMetrics.waist) : null,
            hips: bodyMetrics.hips ? parseFloat(bodyMetrics.hips) : null,
            arms: bodyMetrics.arms ? parseFloat(bodyMetrics.arms) : null,
            thighs: bodyMetrics.thighs ? parseFloat(bodyMetrics.thighs) : null,
            calves: bodyMetrics.calves ? parseFloat(bodyMetrics.calves) : null,
            notes: bodyMetrics.notes || ''
          });
        
        if (metricsError) throw metricsError;
      }
      
      toast.success('Perfil salvo com sucesso!');
      
      // Redirecionar para a página de relatórios
      router.push('/fitness-reports');
      
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar seu perfil');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    saveProfile();
  };
  
  if (!user) {
    return (
      <Layout title="Perfil de Fitness">
        <div className="container mx-auto px-4 py-8">
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">É necessário estar logado</h2>
            <p className="dark-text-secondary mb-4">Para acessar seu perfil de fitness, por favor faça login primeiro.</p>
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
    <Layout title="Perfil de Fitness">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Perfil de Fitness</h1>
          <p className="dark-text-secondary">
            Preencha suas informações para personalizar sua experiência e permitir o acompanhamento de progresso.
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Perfil de Fitness */}
            <div className="dark-card rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Perfil de Fitness</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fitness_level" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Nível de Condicionamento
                  </label>
                  <select
                    id="fitness_level"
                    name="fitness_level"
                    value={profile.fitness_level}
                    onChange={handleProfileChange}
                    className="dark-input w-full"
                  >
                    {fitnessLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="primary_goal" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Objetivo Principal
                  </label>
                  <select
                    id="primary_goal"
                    name="primary_goal"
                    value={profile.primary_goal}
                    onChange={handleProfileChange}
                    className="dark-input w-full"
                  >
                    {fitnessGoals.map(goal => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="secondary_goal" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Objetivo Secundário (opcional)
                  </label>
                  <select
                    id="secondary_goal"
                    name="secondary_goal"
                    value={profile.secondary_goal}
                    onChange={handleProfileChange}
                    className="dark-input w-full"
                  >
                    <option value="">Nenhum</option>
                    {fitnessGoals.map(goal => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="weekly_workout_target" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Treinos por Semana
                  </label>
                  <input
                    type="number"
                    id="weekly_workout_target"
                    name="weekly_workout_target"
                    min="1"
                    max="7"
                    value={profile.weekly_workout_target}
                    onChange={handleProfileChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="daily_activity_level" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Nível de Atividade Diária
                  </label>
                  <select
                    id="daily_activity_level"
                    name="daily_activity_level"
                    value={profile.daily_activity_level}
                    onChange={handleProfileChange}
                    className="dark-input w-full"
                  >
                    {activityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="health_conditions" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Condições de Saúde (selecione múltiplas)
                  </label>
                  <select
                    id="health_conditions"
                    name="health_conditions"
                    multiple
                    size="4"
                    className="dark-input w-full"
                    onChange={(e) => handleMultiSelectChange(e, 'health_conditions')}
                    value={profile.health_conditions || []}
                  >
                    {healthConditionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Segure Ctrl/Cmd para selecionar múltiplas opções
                  </p>
                </div>
                
                <div>
                  <label htmlFor="injuries" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Lesões (selecione múltiplas)
                  </label>
                  <select
                    id="injuries"
                    name="injuries"
                    multiple
                    size="4"
                    className="dark-input w-full"
                    onChange={(e) => handleMultiSelectChange(e, 'injuries')}
                    value={profile.injuries || []}
                  >
                    {injuryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Segure Ctrl/Cmd para selecionar múltiplas opções
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="dietary_preferences" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Preferências Alimentares (selecione múltiplas)
                  </label>
                  <select
                    id="dietary_preferences"
                    name="dietary_preferences"
                    multiple
                    size="4"
                    className="dark-input w-full"
                    onChange={(e) => handleMultiSelectChange(e, 'dietary_preferences')}
                    value={profile.dietary_preferences || []}
                  >
                    {dietaryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Segure Ctrl/Cmd para selecionar múltiplas opções
                  </p>
                </div>
              </div>
            </div>
            
            {/* Métricas Corporais */}
            <div className="dark-card rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Métricas Corporais Atuais</h2>
              <p className="text-sm dark-text-tertiary mb-4">
                Registre suas medidas atuais para acompanhar seu progresso ao longo do tempo.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Peso (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    step="0.1"
                    min="30"
                    max="250"
                    value={bodyMetrics.weight}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="body_fat_percentage" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Gordura Corporal (%)
                  </label>
                  <input
                    type="number"
                    id="body_fat_percentage"
                    name="body_fat_percentage"
                    step="0.1"
                    min="3"
                    max="60"
                    value={bodyMetrics.body_fat_percentage}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="muscle_mass" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Massa Muscular (kg)
                  </label>
                  <input
                    type="number"
                    id="muscle_mass"
                    name="muscle_mass"
                    step="0.1"
                    min="10"
                    max="100"
                    value={bodyMetrics.muscle_mass}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="chest" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Peitoral (cm)
                  </label>
                  <input
                    type="number"
                    id="chest"
                    name="chest"
                    step="0.1"
                    min="50"
                    max="200"
                    value={bodyMetrics.chest}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="waist" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Cintura (cm)
                  </label>
                  <input
                    type="number"
                    id="waist"
                    name="waist"
                    step="0.1"
                    min="40"
                    max="200"
                    value={bodyMetrics.waist}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="hips" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Quadril (cm)
                  </label>
                  <input
                    type="number"
                    id="hips"
                    name="hips"
                    step="0.1"
                    min="50"
                    max="200"
                    value={bodyMetrics.hips}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="arms" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Braços (cm)
                  </label>
                  <input
                    type="number"
                    id="arms"
                    name="arms"
                    step="0.1"
                    min="15"
                    max="100"
                    value={bodyMetrics.arms}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="thighs" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Coxas (cm)
                  </label>
                  <input
                    type="number"
                    id="thighs"
                    name="thighs"
                    step="0.1"
                    min="30"
                    max="100"
                    value={bodyMetrics.thighs}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="calves" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Panturrilhas (cm)
                  </label>
                  <input
                    type="number"
                    id="calves"
                    name="calves"
                    step="0.1"
                    min="20"
                    max="60"
                    value={bodyMetrics.calves}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="md:col-span-3">
                  <label htmlFor="notes" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Observações
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows="3"
                    value={bodyMetrics.notes}
                    onChange={handleMetricsChange}
                    className="dark-input w-full"
                    placeholder="Observações adicionais sobre suas medidas ou condição física atual..."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md flex items-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : 'Salvar Perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
} 