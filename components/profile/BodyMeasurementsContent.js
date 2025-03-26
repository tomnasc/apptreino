import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';

export default function BodyMeasurementsContent({ userId }) {
  const supabase = useSupabaseClient();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMeasurement, setNewMeasurement] = useState({
    weight: '',
    body_fat: '',
    muscle_mass: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    calves: '',
    shoulders: '',
    neck: ''
  });

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measurement_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Erro ao carregar medidas:', error);
      toast.error('Erro ao carregar medidas corporais');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('user_body_measurements')
        .insert([
          {
            user_id: userId,
            measurement_date: new Date().toISOString(),
            ...newMeasurement
          }
        ]);

      if (error) throw error;

      toast.success('Medidas registradas com sucesso!');
      setNewMeasurement({
        weight: '',
        body_fat: '',
        muscle_mass: '',
        chest: '',
        waist: '',
        hips: '',
        arms: '',
        thighs: '',
        calves: '',
        shoulders: '',
        neck: ''
      });
      loadMeasurements();
    } catch (error) {
      console.error('Erro ao registrar medidas:', error);
      toast.error('Erro ao registrar medidas');
    }
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
        <h2 className="text-xl font-semibold dark-text-primary">Medidas Corporais</h2>
        <button
          onClick={() => document.getElementById('newMeasurementForm').classList.toggle('hidden')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
        >
          <FiPlus className="h-5 w-5" />
          <span>Novas Medidas</span>
        </button>
      </div>

      <form id="newMeasurementForm" onSubmit={handleSubmit} className="hidden mb-8 space-y-4 dark-card p-4 rounded-lg">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.weight}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, weight: e.target.value })}
              className="dark-input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Gordura Corporal (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.body_fat}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, body_fat: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Massa Muscular (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.muscle_mass}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, muscle_mass: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Tórax (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.chest}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, chest: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Cintura (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.waist}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, waist: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Quadril (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.hips}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, hips: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Braços (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.arms}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, arms: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Coxas (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.thighs}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, thighs: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Panturrilhas (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.calves}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, calves: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Ombros (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.shoulders}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, shoulders: e.target.value })}
              className="dark-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark-text-tertiary mb-1">
              Pescoço (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newMeasurement.neck}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, neck: e.target.value })}
              className="dark-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md"
          >
            Registrar Medidas
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {measurements.length === 0 ? (
          <p className="text-center dark-text-secondary py-8">
            Você ainda não registrou suas medidas corporais. Registre suas primeiras medidas!
          </p>
        ) : (
          measurements.map((measurement) => (
            <div key={measurement.id} className="dark-card p-4 rounded-lg">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium dark-text-tertiary">Peso</h3>
                  <p className="dark-text-primary">{measurement.weight} kg</p>
                </div>
                {measurement.body_fat && (
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Gordura Corporal</h3>
                    <p className="dark-text-primary">{measurement.body_fat}%</p>
                  </div>
                )}
                {measurement.muscle_mass && (
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Massa Muscular</h3>
                    <p className="dark-text-primary">{measurement.muscle_mass} kg</p>
                  </div>
                )}
                {measurement.chest && (
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Tórax</h3>
                    <p className="dark-text-primary">{measurement.chest} cm</p>
                  </div>
                )}
                {measurement.waist && (
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Cintura</h3>
                    <p className="dark-text-primary">{measurement.waist} cm</p>
                  </div>
                )}
                {measurement.hips && (
                  <div>
                    <h3 className="text-sm font-medium dark-text-tertiary">Quadril</h3>
                    <p className="dark-text-primary">{measurement.hips} cm</p>
                  </div>
                )}
              </div>
              <p className="text-sm dark-text-tertiary mt-4">
                Registrado em: {new Date(measurement.measurement_date).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 