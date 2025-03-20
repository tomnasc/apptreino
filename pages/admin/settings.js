import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../../components/Layout';

export default function AdminSettings() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    free_trial_days: '14',
  });
  const [originalSettings, setOriginalSettings] = useState({});
  
  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('plan_type')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao verificar permissões:', error);
          toast.error('Erro ao verificar permissões de administrador');
          router.push('/dashboard');
          return;
        }
        
        if (data && data.plan_type === 'admin') {
          setIsAdmin(true);
          // Carregar configurações
          loadSettings();
        } else {
          toast.error('Acesso restrito. Você não tem permissões de administrador.');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Erro:', err);
        toast.error('Ocorreu um erro ao verificar suas permissões');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user, supabase, router]);
  
  // Carregar configurações do aplicativo
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');
      
      if (error) throw error;
      
      const settingsObj = {};
      data.forEach(item => {
        settingsObj[item.setting_key] = item.setting_value;
      });
      
      setSettings(settingsObj);
      setOriginalSettings(settingsObj);
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Não foi possível carregar as configurações');
    }
  };
  
  // Salvar configurações
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    
    try {
      // Validar o número de dias de teste
      const trialDays = parseInt(settings.free_trial_days);
      if (isNaN(trialDays) || trialDays < 1) {
        toast.error('O período de teste deve ser um número válido maior que zero');
        return;
      }
      
      // Atualizar a configuração de dias de teste
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'free_trial_days',
          setting_value: settings.free_trial_days,
          description: 'Número de dias para período de teste de usuários gratuitos',
          updated_at: new Date()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
      setOriginalSettings({...settings});
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingSettings(false);
    }
  };
  
  // Verificar se houve alterações nas configurações
  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };
  
  if (loading) {
    return (
      <Layout title="Configurações do Aplicativo">
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) {
    return null; // Redirecionamento já é tratado no useEffect
  }
  
  return (
    <Layout title="Configurações do Aplicativo">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Gerencie as configurações globais do TreinoPro
        </h1>
        <p className="text-gray-600">
          Gerencie as configurações globais do TreinoPro
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">
            Configurações de Usuários
          </h2>
          
          <div className="mb-4">
            <label htmlFor="free_trial_days" className="block text-sm font-medium text-gray-700 mb-1">
              Período de Teste para Usuários Gratuitos (dias)
            </label>
            <div className="flex items-center">
              <input
                type="number"
                id="free_trial_days"
                name="free_trial_days"
                value={settings.free_trial_days || ''}
                onChange={(e) => setSettings({...settings, free_trial_days: e.target.value})}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 sm:text-sm border-gray-300 rounded-md"
                min="1"
              />
              <span className="ml-2 text-sm text-gray-500">dias</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Este é o número de dias que os usuários gratuitos terão acesso completo ao aplicativo.
            </p>
          </div>
          
          <h2 className="text-lg font-semibold mb-4 mt-8 pb-2 border-b border-gray-200">
            Ações
          </h2>
          
          <div className="mt-4 pb-2">
            <button
              type="button"
              onClick={() => loadSettings()}
              className="mr-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Restaurar Padrões
            </button>
            
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={!hasChanges() || savingSettings}
              className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                !hasChanges() || savingSettings ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Voltar para o Painel de Administração
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
} 