import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

export default function BodyMeasurementsPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastMeasurements, setLastMeasurements] = useState(null);
  
  const [measurements, setMeasurements] = useState({
    weight: '',
    height: '',
    body_fat_percentage: '',
    muscle_mass: '',
    chest: '',
    waist: '',
    hips: '',
    right_arm: '',
    left_arm: '',
    right_thigh: '',
    left_thigh: '',
    right_calf: '',
    left_calf: '',
    neck: '',
    shoulders: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadLastMeasurements();
  }, [user]);

  const loadLastMeasurements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é o código para nenhum resultado encontrado
        throw error;
      }

      if (data) {
        setLastMeasurements(data);
      }
    } catch (error) {
      console.error('Erro ao carregar medidas:', error);
      toast.error('Erro ao carregar suas últimas medidas');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMeasurements(prev => ({
      ...prev,
      [name]: value
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
      setSaving(true);
      
      // Validar campos obrigatórios
      if (!measurements.weight || !measurements.height) {
        toast.error('Por favor, preencha pelo menos peso e altura');
        return;
      }
      
      // Inserir medidas no banco
      const { data, error } = await supabase
        .from('user_body_measurements')
        .insert({
          user_id: user.id,
          ...measurements
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Medidas salvas com sucesso!');
      
      // Atualizar últimas medidas
      setLastMeasurements(data);
      
      // Limpar formulário
      setMeasurements({
        weight: '',
        height: '',
        body_fat_percentage: '',
        muscle_mass: '',
        chest: '',
        waist: '',
        hips: '',
        right_arm: '',
        left_arm: '',
        right_thigh: '',
        left_thigh: '',
        right_calf: '',
        left_calf: '',
        neck: '',
        shoulders: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Erro ao salvar medidas:', error);
      toast.error('Erro ao salvar suas medidas');
    } finally {
      setSaving(false);
    }
  };
  
  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Você precisa estar logado</h2>
            <p className="dark-text-secondary mb-4">Faça login para registrar suas medidas</p>
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
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Registro de Medidas Corporais</h1>
          <p className="dark-text-secondary">Registre suas medidas para acompanhar seu progresso.</p>
        </div>
        
        {lastMeasurements && (
          <div className="dark-card rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Últimas Medidas</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm dark-text-tertiary">Peso</p>
                <p className="text-lg dark-text-primary">{lastMeasurements.weight} kg</p>
              </div>
              <div>
                <p className="text-sm dark-text-tertiary">Altura</p>
                <p className="text-lg dark-text-primary">{lastMeasurements.height} cm</p>
              </div>
              {lastMeasurements.body_fat_percentage && (
                <div>
                  <p className="text-sm dark-text-tertiary">Gordura Corporal</p>
                  <p className="text-lg dark-text-primary">{lastMeasurements.body_fat_percentage}%</p>
                </div>
              )}
            </div>
            <p className="text-sm dark-text-tertiary mt-2">
              Registrado em: {new Date(lastMeasurements.date).toLocaleDateString()}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="dark-card rounded-lg shadow-md p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Medidas básicas */}
            <div>
              <h3 className="text-lg font-medium dark-text-primary mb-4">Medidas Básicas</h3>
              
              <div className="mb-4">
                <label htmlFor="weight" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  min="30"
                  max="250"
                  step="0.1"
                  value={measurements.weight}
                  onChange={handleChange}
                  className="dark-input w-full"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="height" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Altura (cm) *
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  min="100"
                  max="250"
                  value={measurements.height}
                  onChange={handleChange}
                  className="dark-input w-full"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="body_fat_percentage" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Percentual de Gordura (%)
                </label>
                <input
                  type="number"
                  id="body_fat_percentage"
                  name="body_fat_percentage"
                  min="3"
                  max="50"
                  step="0.1"
                  value={measurements.body_fat_percentage}
                  onChange={handleChange}
                  className="dark-input w-full"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="muscle_mass" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Massa Muscular (kg)
                </label>
                <input
                  type="number"
                  id="muscle_mass"
                  name="muscle_mass"
                  min="20"
                  max="150"
                  step="0.1"
                  value={measurements.muscle_mass}
                  onChange={handleChange}
                  className="dark-input w-full"
                />
              </div>
            </div>
            
            {/* Medidas corporais */}
            <div>
              <h3 className="text-lg font-medium dark-text-primary mb-4">Medidas Corporais (cm)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label htmlFor="chest" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Peitoral
                  </label>
                  <input
                    type="number"
                    id="chest"
                    name="chest"
                    min="50"
                    max="200"
                    step="0.1"
                    value={measurements.chest}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="waist" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Cintura
                  </label>
                  <input
                    type="number"
                    id="waist"
                    name="waist"
                    min="50"
                    max="200"
                    step="0.1"
                    value={measurements.waist}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="hips" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Quadril
                  </label>
                  <input
                    type="number"
                    id="hips"
                    name="hips"
                    min="50"
                    max="200"
                    step="0.1"
                    value={measurements.hips}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="shoulders" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Ombros
                  </label>
                  <input
                    type="number"
                    id="shoulders"
                    name="shoulders"
                    min="50"
                    max="200"
                    step="0.1"
                    value={measurements.shoulders}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="right_arm" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Braço Direito
                  </label>
                  <input
                    type="number"
                    id="right_arm"
                    name="right_arm"
                    min="20"
                    max="100"
                    step="0.1"
                    value={measurements.right_arm}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="left_arm" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Braço Esquerdo
                  </label>
                  <input
                    type="number"
                    id="left_arm"
                    name="left_arm"
                    min="20"
                    max="100"
                    step="0.1"
                    value={measurements.left_arm}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="right_thigh" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Coxa Direita
                  </label>
                  <input
                    type="number"
                    id="right_thigh"
                    name="right_thigh"
                    min="30"
                    max="120"
                    step="0.1"
                    value={measurements.right_thigh}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="left_thigh" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Coxa Esquerda
                  </label>
                  <input
                    type="number"
                    id="left_thigh"
                    name="left_thigh"
                    min="30"
                    max="120"
                    step="0.1"
                    value={measurements.left_thigh}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="right_calf" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Panturrilha Direita
                  </label>
                  <input
                    type="number"
                    id="right_calf"
                    name="right_calf"
                    min="20"
                    max="80"
                    step="0.1"
                    value={measurements.right_calf}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="left_calf" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Panturrilha Esquerda
                  </label>
                  <input
                    type="number"
                    id="left_calf"
                    name="left_calf"
                    min="20"
                    max="80"
                    step="0.1"
                    value={measurements.left_calf}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="neck" className="block text-sm font-medium dark-text-tertiary mb-1">
                    Pescoço
                  </label>
                  <input
                    type="number"
                    id="neck"
                    name="neck"
                    min="20"
                    max="80"
                    step="0.1"
                    value={measurements.neck}
                    onChange={handleChange}
                    className="dark-input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Observações */}
          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium dark-text-tertiary mb-1">
              Observações
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={measurements.notes}
              onChange={handleChange}
              className="dark-input w-full"
              placeholder="Adicione observações relevantes sobre suas medidas..."
            />
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Medidas'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 