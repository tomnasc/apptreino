import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    age: '',
    height: '',
    experience_level: 'beginner'
  });
  const [error, setError] = useState(null);

  // Verificar autenticação
  useEffect(() => {
    if (user === null) {
      router.push('/login');
    } else if (user !== undefined) {
      // Carregar perfil apenas quando tivermos certeza que temos um usuário
      loadProfile();
    }
  }, [user, router]);

  // Carregar dados do perfil
  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Se o perfil não existir, tentamos criar um novo
        if (error.code === 'PGRST116') {
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert([{ 
                id: user.id,
                email: user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .select()
              .single();
              
            if (createError) throw createError;
            
            if (newProfile) {
              setProfileData(newProfile);
              setFormData({
                name: newProfile.name || '',
                email: newProfile.email || user.email || '',
                bio: newProfile.bio || '',
                age: newProfile.age || '',
                height: newProfile.height || '',
                experience_level: newProfile.experience_level || 'beginner'
              });
            }
          } catch (createError) {
            console.error('Erro ao criar perfil:', createError);
            setError('Não foi possível criar seu perfil. Tente novamente mais tarde.');
            toast.error('Erro ao criar perfil');
          }
        } else {
          console.error('Erro ao carregar perfil:', error);
          setError('Não foi possível carregar seu perfil. Tente novamente mais tarde.');
          toast.error('Erro ao carregar perfil');
        }
      } else if (data) {
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
      setError('Não foi possível carregar seu perfil. Tente novamente mais tarde.');
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Salvar alterações do perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          name: formData.name,
          email: formData.email,
          bio: formData.bio,
          age: formData.age ? Number(formData.age) : null,
          height: formData.height ? Number(formData.height) : null,
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
    } finally {
      setLoading(false);
    }
  };

  // Atualizar campos do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Renderização de carregamento
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Renderização de erro
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Erro</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-300">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                loadProfile();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Renderização principal
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Dados Pessoais</h2>
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
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Biografia</label>
                <textarea
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 h-24"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Idade</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age || ''}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height || ''}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nível de Experiência</label>
                <select
                  name="experience_level"
                  value={formData.experience_level || 'beginner'}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</h3>
                <p>{profileData?.name || 'Não informado'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
                <p>{profileData?.email || user?.email || 'Não informado'}</p>
              </div>

              {profileData?.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Biografia</h3>
                  <p>{profileData.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData?.age && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Idade</h3>
                    <p>{profileData.age} anos</p>
                  </div>
                )}

                {profileData?.height && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Altura</h3>
                    <p>{profileData.height} cm</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível de Experiência</h3>
                <p>
                  {profileData?.experience_level === 'beginner' && 'Iniciante'}
                  {profileData?.experience_level === 'intermediate' && 'Intermediário'}
                  {profileData?.experience_level === 'advanced' && 'Avançado'}
                  {!profileData?.experience_level && 'Não informado'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 