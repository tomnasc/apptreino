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
    <Layout title={`Editar: ${workoutList?.name || ''}`}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Editar Lista de Treinos</h1>
          <div className="flex space-x-2">
            <Link
              href="/workout-lists"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Voltar
            </Link>
            <Link
              href={`/workout-mode/${id}`}
              className="btn-secondary"
            >
              Iniciar Treino
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulário de edição da lista */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações da Lista</h2>
          <form onSubmit={handleUpdateList}>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da lista *
                </label>
                <input
                  type="text"
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  className="input min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Lista de exercícios */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Exercícios</h2>
            <button
              onClick={() => setShowExerciseForm(!showExerciseForm)}
              className="btn-primary"
            >
              {showExerciseForm ? 'Cancelar' : 'Adicionar Exercício'}
            </button>
          </div>

          {/* Formulário de exercício */}
          {showExerciseForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingExerciseId ? 'Editar Exercício' : 'Novo Exercício'}
              </h3>
              <form onSubmit={handleAddExercise}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="exerciseName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do exercício *
                    </label>
                    <input
                      type="text"
                      id="exerciseName"
                      className="input"
                      value={exerciseName}
                      onChange={(e) => setExerciseName(e.target.value)}
                      placeholder="Ex: Supino reto"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                      Carga (kg)
                    </label>
                    <input
                      type="number"
                      id="weight"
                      className="input"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Ex: 20"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="sets" className="block text-sm font-medium text-gray-700 mb-1">
                      Número de séries *
                    </label>
                    <input
                      type="number"
                      id="sets"
                      className="input"
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                      placeholder="Ex: 3"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="isTimeBased"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={isTimeBasedExercise}
                        onChange={(e) => setIsTimeBasedExercise(e.target.checked)}
                      />
                      <label htmlFor="isTimeBased" className="ml-2 block text-sm font-medium text-gray-700">
                        Exercício baseado em tempo
                      </label>
                    </div>
                    {isTimeBasedExercise ? (
                      <>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                          Tempo (segundos) *
                        </label>
                        <input
                          type="number"
                          id="time"
                          className="input"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          placeholder="Ex: 30"
                          min="1"
                          required={isTimeBasedExercise}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor="reps" className="block text-sm font-medium text-gray-700 mb-1">
                          Repetições por série *
                        </label>
                        <input
                          type="number"
                          id="reps"
                          className="input"
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
                    <label htmlFor="restTime" className="block text-sm font-medium text-gray-700 mb-1">
                      Tempo de descanso (segundos) *
                    </label>
                    <input
                      type="number"
                      id="restTime"
                      className="input"
                      value={restTime}
                      onChange={(e) => setRestTime(e.target.value)}
                      placeholder="Ex: 60"
                      min="0"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Link do vídeo (YouTube)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        id="videoUrl"
                        className="input flex-grow"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Ex: https://www.youtube.com/watch?v=..."
                      />
                      <button
                        type="button"
                        onClick={() => searchYoutubeVideo(exerciseName)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm flex items-center"
                        disabled={!exerciseName.trim()}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 mr-1" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                        >
                          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                        </svg>
                        Buscar vídeo
                      </button>
                    </div>
                    {videoUrl && getYoutubeVideoId(videoUrl) && (
                      <div className="mt-2 p-1 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center">
                          <img 
                            src={`https://img.youtube.com/vi/${getYoutubeVideoId(videoUrl)}/default.jpg`}
                            alt="Thumbnail do vídeo"
                            className="w-20 h-auto rounded"
                          />
                          <span className="ml-2 text-xs text-gray-500 truncate">
                            Vídeo selecionado
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={resetExerciseForm}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : (editingExerciseId ? 'Atualizar' : 'Adicionar')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {exercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Nenhum exercício adicionado ainda. Clique em "Adicionar Exercício" para começar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{exercise.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {exercise.weight && (
                          <div>
                            <span className="font-medium text-gray-500">Carga:</span>{' '}
                            <span>{exercise.weight} kg</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-500">Séries:</span>{' '}
                          <span>{exercise.sets}</span>
                        </div>
                        {exercise.reps && (
                          <div>
                            <span className="font-medium text-gray-500">Repetições:</span>{' '}
                            <span>{exercise.reps}</span>
                          </div>
                        )}
                        {exercise.time && (
                          <div>
                            <span className="font-medium text-gray-500">Tempo:</span>{' '}
                            <span>{exercise.time} segundos</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-500">Descanso:</span>{' '}
                          <span>{exercise.rest_time || 60} segundos</span>
                        </div>
                      </div>
                      {exercise.video_url && (
                        <div className="mt-3">
                          <a
                            href={exercise.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Ver demonstração
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleMoveExercise(exercise.id, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Mover para cima"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveExercise(exercise.id, 'down')}
                        disabled={index === exercises.length - 1}
                        className={`p-1 rounded ${
                          index === exercises.length - 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Mover para baixo"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditExercise(exercise)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Excluir"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 