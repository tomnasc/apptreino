import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import PhysicalProgressPage from './physical-progress';
import dynamic from 'next/dynamic';

// Importação dinâmica dos componentes
const FitnessGoals = dynamic(() => import('./fitness-goals'));
const BodyMeasurements = dynamic(() => import('./body-measurements'));
const PhysicalProgress = dynamic(() => import('./physical-progress'));
const FitnessReports = dynamic(() => import('./fitness-reports'));

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('profile'); // profile, goals, reports, measurements, progress
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    birth_date: '',
    gender: '',
    height: '',
    fitness_level: 'beginner',
    training_frequency: '3',
    health_conditions: '',
    preferred_training_time: 'morning'
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          height: data.height || '',
          fitness_level: data.fitness_level || 'beginner',
          training_frequency: data.training_frequency || '3',
          health_conditions: data.health_conditions || '',
          preferred_training_time: data.preferred_training_time || 'morning'
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setEditMode(false);
      loadProfile();
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Meu Perfil</h1>
          <p className="dark-text-secondary">Gerencie suas informações pessoais e acompanhe seu progresso.</p>
        </div>

        {/* Abas de navegação */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex flex-wrap gap-4">
            <button
              onClick={() => setSelectedTab('profile')}
              className={`${
                selectedTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Dados Pessoais
            </button>
            <button
              onClick={() => setSelectedTab('goals')}
              className={`${
                selectedTab === 'goals'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Objetivos
            </button>
            <button
              onClick={() => setSelectedTab('measurements')}
              className={`${
                selectedTab === 'measurements'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Medidas Corporais
            </button>
            <button
              onClick={() => setSelectedTab('progress')}
              className={`${
                selectedTab === 'progress'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Evolução Física
            </button>
            <button
              onClick={() => setSelectedTab('reports')}
              className={`${
                selectedTab === 'reports'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Relatórios
            </button>
          </nav>
        </div>

        {/* Conteúdo das abas */}
        <div className="dark-card rounded-lg shadow-md p-6">
          {selectedTab === 'profile' && (
            <div>
              {editMode ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        name="birth_date"
                        value={formData.birth_date}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Gênero
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      >
                        <option value="">Selecione...</option>
                        <option value="male">Masculino</option>
                        <option value="female">Feminino</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        className="dark-input w-full"
                        min="100"
                        max="250"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Nível de Condicionamento
                      </label>
                      <select
                        name="fitness_level"
                        value={formData.fitness_level}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      >
                        <option value="beginner">Iniciante</option>
                        <option value="intermediate">Intermediário</option>
                        <option value="advanced">Avançado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Frequência de Treino (dias por semana)
                      </label>
                      <select
                        name="training_frequency"
                        value={formData.training_frequency}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      >
                        <option value="2">2 dias</option>
                        <option value="3">3 dias</option>
                        <option value="4">4 dias</option>
                        <option value="5">5 dias</option>
                        <option value="6">6 dias</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Condições de Saúde
                      </label>
                      <textarea
                        name="health_conditions"
                        value={formData.health_conditions}
                        onChange={handleChange}
                        className="dark-input w-full h-24"
                        placeholder="Liste quaisquer condições de saúde relevantes..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Horário Preferido para Treino
                      </label>
                      <select
                        name="preferred_training_time"
                        value={formData.preferred_training_time}
                        onChange={handleChange}
                        className="dark-input w-full"
                        required
                      >
                        <option value="morning">Manhã</option>
                        <option value="afternoon">Tarde</option>
                        <option value="evening">Noite</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Nome Completo</h3>
                      <p className="dark-text-primary mt-1">{profile?.full_name || '-'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Data de Nascimento</h3>
                      <p className="dark-text-primary mt-1">
                        {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString() : '-'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Gênero</h3>
                      <p className="dark-text-primary mt-1">
                        {profile?.gender === 'male' ? 'Masculino' :
                         profile?.gender === 'female' ? 'Feminino' :
                         profile?.gender === 'other' ? 'Outro' : '-'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Altura</h3>
                      <p className="dark-text-primary mt-1">{profile?.height ? `${profile.height} cm` : '-'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Nível de Condicionamento</h3>
                      <p className="dark-text-primary mt-1">
                        {profile?.fitness_level === 'beginner' ? 'Iniciante' :
                         profile?.fitness_level === 'intermediate' ? 'Intermediário' :
                         profile?.fitness_level === 'advanced' ? 'Avançado' : '-'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Frequência de Treino</h3>
                      <p className="dark-text-primary mt-1">
                        {profile?.training_frequency ? `${profile.training_frequency} dias por semana` : '-'}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium dark-text-tertiary">Condições de Saúde</h3>
                      <p className="dark-text-primary mt-1">{profile?.health_conditions || 'Nenhuma condição registrada'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Horário Preferido para Treino</h3>
                      <p className="dark-text-primary mt-1">
                        {profile?.preferred_training_time === 'morning' ? 'Manhã' :
                         profile?.preferred_training_time === 'afternoon' ? 'Tarde' :
                         profile?.preferred_training_time === 'evening' ? 'Noite' : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
                    >
                      Editar Perfil
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'goals' && (
            <div className="min-h-[500px]">
              <FitnessGoals />
            </div>
          )}

          {selectedTab === 'measurements' && (
            <div className="min-h-[500px]">
              <BodyMeasurements />
            </div>
          )}

          {selectedTab === 'progress' && (
            <div className="min-h-[500px]">
              <PhysicalProgress />
            </div>
          )}

          {selectedTab === 'reports' && (
            <div className="min-h-[500px]">
              <FitnessReports />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 