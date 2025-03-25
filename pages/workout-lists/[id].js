import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function EditWorkoutList() {
  const router = useRouter();
  const { id } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [workoutList, setWorkoutList] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  
  // Formulário da lista de treinos
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Formulário de exercício
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [time, setTime] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isTimeBasedExercise, setIsTimeBasedExercise] = useState(false);
  const [restTime, setRestTime] = useState('60');

  useEffect(() => {
    if (id && user) {
      fetchWorkoutList();
      fetchExercises();
    }
  }, [id, user]);

  const fetchWorkoutList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setWorkoutList(data);
        setName(data.name);
        setDescription(data.description || '');
      } else {
        router.push('/workout-lists');
      }
    } catch (error) {
      console.error('Erro ao buscar lista de treinos:', error);
      setError('Não foi possível carregar a lista de treinos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_list_id', id)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('O nome da lista de treinos é obrigatório');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('workout_lists')
        .update({ name, description })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setWorkoutList({ ...workoutList, name, description });
    } catch (error) {
      console.error('Erro ao atualizar lista de treinos:', error);
      setError('Ocorreu um erro ao salvar as alterações. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExercise = async (e) => {
    e.preventDefault();
    
    if (!exerciseName.trim()) {
      setError('O nome do exercício é obrigatório');
      return;
    }

    if (!sets || parseInt(sets) <= 0) {
      setError('O número de séries deve ser maior que zero');
      return;
    }

    if (isTimeBasedExercise) {
      if (!time || parseInt(time) <= 0) {
        setError('O tempo deve ser maior que zero');
        return;
      }
    } else {
      if (!reps || parseInt(reps) <= 0) {
        setError('O número de repetições deve ser maior que zero');
        return;
      }
    }

    if (!restTime || parseInt(restTime) < 0) {
      setError('Por favor, informe um tempo de descanso válido.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newExercise = {
        workout_list_id: id,
        name: exerciseName,
        weight: weight ? parseFloat(weight) : null,
        sets: parseInt(sets),
        reps: isTimeBasedExercise ? null : parseInt(reps),
        time: isTimeBasedExercise ? parseInt(time) : null,
        video_url: videoUrl || null,
        rest_time: parseInt(restTime),
        order_position: exercises.length,
      };

      if (editingExerciseId) {
        // Atualizar exercício existente
        const { error } = await supabase
          .from('workout_exercises')
          .update(newExercise)
          .eq('id', editingExerciseId);

        if (error) throw error;
        
        setExercises(exercises.map(ex => 
          ex.id === editingExerciseId ? { ...ex, ...newExercise } : ex
        ));
      } else {
        // Adicionar novo exercício
        const { data, error } = await supabase
          .from('workout_exercises')
          .insert([newExercise])
          .select();

        if (error) throw error;
        
        setExercises([...exercises, data[0]]);
      }
      
      // Limpar formulário
      resetExerciseForm();
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      setError('Ocorreu um erro ao salvar o exercício. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditExercise = (exercise) => {
    setExerciseName(exercise.name);
    setWeight(exercise.weight || '');
    setSets(exercise.sets || '');
    setReps(exercise.reps || '');
    setTime(exercise.time || '');
    setVideoUrl(exercise.video_url || '');
    setIsTimeBasedExercise(exercise.time ? true : false);
    setRestTime(exercise.rest_time || '60');
    setEditingExerciseId(exercise.id);
    setShowExerciseForm(true);
  };

  const handleDeleteExercise = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) {
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar a lista de exercícios
      setExercises(exercises.filter(ex => ex.id !== id));
      
      // Reordenar os exercícios restantes
      const updatedExercises = exercises
        .filter(ex => ex.id !== id)
        .map((ex, index) => ({ ...ex, order_position: index }));
      
      // Atualizar as posições no banco de dados
      for (const ex of updatedExercises) {
        await supabase
          .from('workout_exercises')
          .update({ order_position: ex.order_position })
          .eq('id', ex.id);
      }
    } catch (error) {
      console.error('Erro ao excluir exercício:', error);
      setError('Ocorreu um erro ao excluir o exercício. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveExercise = async (id, direction) => {
    const currentIndex = exercises.findIndex(ex => ex.id === id);
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === exercises.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newExercises = [...exercises];
    const temp = newExercises[currentIndex];
    newExercises[currentIndex] = newExercises[newIndex];
    newExercises[newIndex] = temp;

    // Atualizar as posições
    newExercises.forEach((ex, index) => {
      ex.order_position = index;
    });

    setExercises(newExercises);

    try {
      setSaving(true);
      
      // Atualizar as posições no banco de dados
      await Promise.all([
        supabase
          .from('workout_exercises')
          .update({ order_position: newExercises[currentIndex].order_position })
          .eq('id', newExercises[currentIndex].id),
        supabase
          .from('workout_exercises')
          .update({ order_position: newExercises[newIndex].order_position })
          .eq('id', newExercises[newIndex].id)
      ]);
    } catch (error) {
      console.error('Erro ao reordenar exercícios:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setWeight('');
    setSets('');
    setReps('');
    setTime('');
    setVideoUrl('');
    setIsTimeBasedExercise(false);
    setRestTime('60');
    setEditingExerciseId(null);
    setShowExerciseForm(false);
  };

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const searchYoutubeVideo = async (query) => {
    if (!query.trim()) return;
    
    try {
      setError(null);
      
      // Verificar se temos uma chave de API definida
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      
      // Se não tivermos uma chave de API, vamos direto para a abordagem alternativa
      if (!apiKey) {
        console.log('Chave da API do YouTube não encontrada. Usando abordagem alternativa.');
        await searchYoutubeWithoutAPI(query);
        return;
      }
      
      // Buscar resultados do YouTube para o exercício
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query + ' exercício')}&type=video&key=${apiKey}`);
      
      if (!response.ok) {
        // Se a API retornar erro, usamos a abordagem alternativa
        console.error('Erro na API do YouTube:', response.status, response.statusText);
        await searchYoutubeWithoutAPI(query);
        return;
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        setVideoUrl(`https://www.youtube.com/watch?v=${videoId}`);
      } else {
        setError('Nenhum vídeo encontrado para este exercício');
      }
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      
      // Abordagem alternativa se ocorrer qualquer erro
      await searchYoutubeWithoutAPI(query);
    }
  };
  
  // Método alternativo para buscar vídeos sem API key
  const searchYoutubeWithoutAPI = async (query) => {
    try {
      // Abre uma nova janela para realizar a busca diretamente no YouTube
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' exercício')}`, '_blank');
      
      // Exibe uma mensagem para o usuário
      alert('Uma busca foi aberta no YouTube. Por favor, copie o link do vídeo que você deseja usar e cole no campo.');
      
      return null;
    } catch (error) {
      console.error('Erro na busca sem API:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <Layout title="Carregando...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={workoutList ? `Editar: ${workoutList.name}` : 'Editar Lista de Treinos'}>
      <div className="py-6 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold dark-text-primary">
              {workoutList ? workoutList.name : 'Editar Lista de Treinos'}
            </h1>
            <Link
              href="/workout-mode/[id]"
              as={`/workout-mode/${id}`}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-md text-sm font-medium"
            >
              Iniciar Treino
            </Link>
          </div>
          <p className="dark-text-secondary mt-2">
            Edite os detalhes e adicione exercícios à sua lista de treinos
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 dark:border-gray-700 h-12 w-12"></div>
          </div>
        ) : error ? (
          <div className="dark-card rounded-lg shadow-md p-4 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push('/workout-lists')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium"
            >
              Voltar para Listas de Treinos
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Formulário de informações da lista */}
            <div className="dark-card rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Informações da Lista</h2>
              <form onSubmit={handleUpdateList}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium dark-text-tertiary mb-1">
                      Nome da lista *
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="dark-input mt-1 block w-full rounded-md"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium dark-text-tertiary mb-1">
                      Descrição (opcional)
                    </label>
                    <textarea
                      id="description"
                      className="dark-input mt-1 block w-full rounded-md min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50"
                      disabled={saving}
                    >
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Lista de exercícios */}
            <div className="dark-card rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold dark-text-primary">Exercícios</h2>
                <button
                  onClick={() => {
                    setShowExerciseForm(!showExerciseForm);
                    if (editingExerciseId) {
                      resetExerciseForm();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none"
                >
                  {showExerciseForm ? 'Cancelar' : 'Adicionar Exercício'}
                </button>
              </div>

              {/* Formulário de exercício */}
              {showExerciseForm && (
                <div className="dark-card bg-gray-50/60 dark:bg-gray-800/30 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-medium dark-text-primary mb-4">
                    {editingExerciseId ? 'Editar Exercício' : 'Novo Exercício'}
                  </h3>
                  <form onSubmit={handleAddExercise}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="exerciseName" className="block text-sm font-medium dark-text-tertiary mb-1">
                          Nome do exercício *
                        </label>
                        <input
                          type="text"
                          id="exerciseName"
                          className="dark-input mt-1 block w-full rounded-md"
                          value={exerciseName}
                          onChange={(e) => setExerciseName(e.target.value)}
                          placeholder="Ex: Supino reto"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="weight" className="block text-sm font-medium dark-text-tertiary mb-1">
                          Carga (kg)
                        </label>
                        <input
                          type="number"
                          id="weight"
                          className="dark-input mt-1 block w-full rounded-md"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="Ex: 20"
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label htmlFor="sets" className="block text-sm font-medium dark-text-tertiary mb-1">
                          Número de séries *
                        </label>
                        <input
                          type="number"
                          id="sets"
                          className="dark-input mt-1 block w-full rounded-md"
                          value={sets}
                          onChange={(e) => setSets(e.target.value)}
                          placeholder="Ex: 3"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <label className="flex items-center text-sm dark-text-tertiary">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400 rounded"
                              checked={isTimeBasedExercise}
                              onChange={() => setIsTimeBasedExercise(!isTimeBasedExercise)}
                            />
                            <span className="ml-2">Exercício baseado em tempo</span>
                          </label>
                        </div>
                        {isTimeBasedExercise ? (
                          <>
                            <label htmlFor="time" className="block text-sm font-medium dark-text-tertiary mb-1">
                              Tempo por série (segundos) *
                            </label>
                            <input
                              type="number"
                              id="time"
                              className="dark-input mt-1 block w-full rounded-md"
                              value={time}
                              onChange={(e) => setTime(e.target.value)}
                              placeholder="Ex: 30"
                              min="1"
                              required={isTimeBasedExercise}
                            />
                          </>
                        ) : (
                          <>
                            <label htmlFor="reps" className="block text-sm font-medium dark-text-tertiary mb-1">
                              Repetições por série *
                            </label>
                            <input
                              type="number"
                              id="reps"
                              className="dark-input mt-1 block w-full rounded-md"
                              value={reps}
                              onChange={(e) => setReps(e.target.value)}
                              placeholder="Ex: 12"
                              min="1"
                              required={!isTimeBasedExercise}
                            />
                          </>
                        )}
                      </div>
                      <div>
                        <label htmlFor="restTime" className="block text-sm font-medium dark-text-tertiary mb-1">
                          Tempo de descanso (segundos) *
                        </label>
                        <input
                          type="number"
                          id="restTime"
                          className="dark-input mt-1 block w-full rounded-md"
                          value={restTime}
                          onChange={(e) => setRestTime(e.target.value)}
                          placeholder="Ex: 60"
                          min="0"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="videoUrl" className="block text-sm font-medium dark-text-tertiary mb-1">
                          URL do vídeo (opcional)
                        </label>
                        <input
                          type="url"
                          id="videoUrl"
                          className="dark-input mt-1 block w-full rounded-md"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="Ex: https://youtube.com/watch?v=..."
                        />
                      </div>
                    </div>
                    
                    {error && (
                      <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
                        {error}
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? 'Salvando...' : editingExerciseId ? 'Atualizar Exercício' : 'Adicionar Exercício'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista de exercícios */}
              <div className="space-y-4">
                {exercises.length > 0 ? (
                  exercises.map((exercise, index) => (
                    <div key={exercise.id} className="dark-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between">
                        <h3 className="font-medium dark-text-primary text-lg">{exercise.name}</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditExercise(exercise)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteExercise(exercise.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="flex ml-1">
                            {index > 0 && (
                              <button
                                onClick={() => handleMoveExercise(exercise.id, 'up')}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-1"
                                aria-label="Mover para cima"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                            {index < exercises.length - 1 && (
                              <button
                                onClick={() => handleMoveExercise(exercise.id, 'down')}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                aria-label="Mover para baixo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <p className="text-xs dark-text-tertiary">Séries</p>
                          <p className="font-medium dark-text-secondary">{exercise.sets}</p>
                        </div>
                        <div>
                          {exercise.reps ? (
                            <>
                              <p className="text-xs dark-text-tertiary">Repetições</p>
                              <p className="font-medium dark-text-secondary">{exercise.reps}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs dark-text-tertiary">Tempo</p>
                              <p className="font-medium dark-text-secondary">{exercise.time}s</p>
                            </>
                          )}
                        </div>
                        <div>
                          <p className="text-xs dark-text-tertiary">Carga</p>
                          <p className="font-medium dark-text-secondary">{exercise.weight ? `${exercise.weight}kg` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs dark-text-tertiary">Descanso</p>
                          <p className="font-medium dark-text-secondary">{exercise.rest_time}s</p>
                        </div>
                      </div>
                      
                      {exercise.video_url && (
                        <div className="mt-2">
                          <a 
                            href={exercise.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            Ver vídeo
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="dark-text-tertiary mb-4">Ainda não há exercícios nesta lista</p>
                    <button
                      onClick={() => setShowExerciseForm(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium"
                    >
                      Adicionar Primeiro Exercício
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 