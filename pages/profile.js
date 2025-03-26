import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { FiUser, FiTarget, FiRuler, FiActivity, FiFileText } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [selectedTab, setSelectedTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    age: '',
    height: '',
    experience_level: 'beginner'
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      loadProfile();
    }
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
        setProfileData(data);
        setFormData({
          name: data.name || '',
          email: data.email || user.email || '',
          bio: data.bio || '',
          age: data.age || '',
          height: data.height || '',
          experience_level: data.experience_level || 'beginner'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        age: formData.age,
        height: formData.height,
        experience_level: formData.experience_level,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setEditMode(false);
      loadProfile();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const tabs = [
    {
      id: 'profile',
      label: 'Dados Pessoais',
      icon: FiUser
    },
    {
      id: 'goals',
      label: 'Objetivos',
      icon: FiTarget
    },
    {
      id: 'measurements',
      label: 'Medidas Corporais',
      icon: FiRuler
    },
    {
      id: 'progress',
      label: 'Evolução Física',
      icon: FiActivity
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: FiFileText
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
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
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } flex items-center space-x-2 whitespace-nowrap py-4 px-6 border-b-2 font-medium transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Conteúdo das abas */}
        <div className="dark-card rounded-lg shadow-md p-6">
          {selectedTab === 'profile' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold dark-text-primary">Dados Pessoais</h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  {editMode ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {editMode ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium dark-text-tertiary mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="dark-input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark-text-tertiary mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="dark-input w-full"
                      required
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark-text-tertiary mb-1">
                      Biografia
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="dark-input w-full h-24"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium dark-text-tertiary mb-1">
                        Idade
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        className="dark-input w-full"
                      />
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
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark-text-tertiary mb-1">
                      Nível de Experiência
                    </label>
                    <select
                      name="experience_level"
                      value={formData.experience_level}
                      onChange={handleChange}
                      className="dark-input w-full"
                    >
                      <option value="beginner">Iniciante</option>
                      <option value="intermediate">Intermediário</option>
                      <option value="advanced">Avançado</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Nome</h3>
                    <p className="dark-text-primary">{profileData?.name || 'Não informado'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Email</h3>
                    <p className="dark-text-primary">{profileData?.email || user?.email || 'Não informado'}</p>
                  </div>

                  {profileData?.bio && (
                    <div>
                      <h3 className="text-sm font-medium dark-text-tertiary">Biografia</h3>
                      <p className="dark-text-primary">{profileData.bio}</p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {profileData?.age && (
                      <div>
                        <h3 className="text-sm font-medium dark-text-tertiary">Idade</h3>
                        <p className="dark-text-primary">{profileData.age} anos</p>
                      </div>
                    )}

                    {profileData?.height && (
                      <div>
                        <h3 className="text-sm font-medium dark-text-tertiary">Altura</h3>
                        <p className="dark-text-primary">{profileData.height} cm</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Nível de Experiência</h3>
                    <p className="dark-text-primary">
                      {profileData?.experience_level === 'beginner' && 'Iniciante'}
                      {profileData?.experience_level === 'intermediate' && 'Intermediário'}
                      {profileData?.experience_level === 'advanced' && 'Avançado'}
                      {!profileData?.experience_level && 'Não informado'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'goals' && (
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Objetivos</h2>
              <p className="dark-text-secondary">Esta seção está em manutenção. Tente novamente mais tarde.</p>
            </div>
          )}

          {selectedTab === 'measurements' && (
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Medidas Corporais</h2>
              <p className="dark-text-secondary">Esta seção está em manutenção. Tente novamente mais tarde.</p>
            </div>
          )}

          {selectedTab === 'progress' && (
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Evolução Física</h2>
              <p className="dark-text-secondary">Esta seção está em manutenção. Tente novamente mais tarde.</p>
            </div>
          )}

          {selectedTab === 'reports' && (
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Relatórios</h2>
              <p className="dark-text-secondary">Esta seção está em manutenção. Tente novamente mais tarde.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 