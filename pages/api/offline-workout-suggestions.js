// API de backup para geração de sugestões de treino offline
// Usada quando há problemas com a API do Hugging Face ou com as variáveis de ambiente

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { assessmentId, level, goals } = req.body;

    if (!assessmentId) {
      return res.status(400).json({ error: 'ID de avaliação é obrigatório' });
    }

    // Gerar treinos básicos conforme o nível e objetivo
    const workoutSuggestions = generateBasicWorkouts(level, goals);

    // Formatar os dados para corresponder ao que o frontend espera
    const workouts = workoutSuggestions.map((workout, index) => ({
      id: `offline-${index}`,
      workout_name: workout.name,
      workout_description: workout.description,
      exercises: workout.exercises,
      selected: false,
      user_feedback: null,
      user_feedback_notes: ''
    }));

    return res.status(200).json({
      success: true,
      workouts: workouts,
      isOffline: true // Indicador de que são sugestões offline
    });
  } catch (error) {
    console.error('Erro ao gerar sugestões de treino offline:', error);
    return res.status(500).json({
      error: 'Falha ao gerar sugestões de treino',
      details: error.message
    });
  }
}

// Função para gerar treinos básicos
function generateBasicWorkouts(level = 'iniciante', goals = []) {
  // Determinar nível para adaptar intensidade
  const intensity = {
    'iniciante': { sets: '3', reps: '10-12', rest: '60s' },
    'intermediário': { sets: '4', reps: '8-10', rest: '45s' },
    'avançado': { sets: '5', reps: '6-8', rest: '30s' },
  }[level?.toLowerCase()] || { sets: '3', reps: '10-12', rest: '60s' };

  // Função auxiliar para adicionar propriedades necessárias para cada exercício
  const createExercise = (exerciseData, muscleGroups, difficulty = 'iniciante') => {
    return {
      ...exerciseData,
      muscles: muscleGroups,
      difficulty: difficulty,
      execution: 'Mantenha a postura correta durante todo o movimento.'
    };
  };

  // Treinos padrão por categoria
  const workouts = {
    'Perda de peso': [
      {
        name: 'Treino Metabólico A',
        description: `Treino de circuito para queima calórica. Realize ${intensity.sets} voltas com ${intensity.rest} de descanso entre exercícios.`,
        exercises: [
          createExercise({ name: 'Agachamento', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Quadríceps', 'Glúteos', 'Isquiotibiais'], level),
          createExercise({ name: 'Polichinelo', sets: intensity.sets, reps: '30s', rest: intensity.rest }, 
            ['Ombros', 'Core', 'Quadríceps'], level),
          createExercise({ name: 'Flexão de braço', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Peito', 'Tríceps', 'Ombros'], level),
          createExercise({ name: 'Mountain climber', sets: intensity.sets, reps: '30s', rest: intensity.rest }, 
            ['Core', 'Ombros', 'Quadríceps'], level),
          createExercise({ name: 'Abdominal', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Abdômen', 'Core'], level)
        ]
      },
      {
        name: 'Treino Metabólico B',
        description: `Treino intervalado de alta intensidade. Realize ${intensity.sets} voltas com ${intensity.rest} de descanso entre exercícios.`,
        exercises: [
          createExercise({ name: 'Burpee', sets: intensity.sets, reps: '45s', rest: intensity.rest }, 
            ['Peito', 'Tríceps', 'Quadríceps', 'Core'], level),
          createExercise({ name: 'Corrida no lugar', sets: intensity.sets, reps: '45s', rest: intensity.rest }, 
            ['Quadríceps', 'Panturrilhas', 'Core'], level),
          createExercise({ name: 'Prancha', sets: intensity.sets, reps: '45s', rest: intensity.rest }, 
            ['Core', 'Ombros', 'Abdômen'], level),
          createExercise({ name: 'Pular corda', sets: intensity.sets, reps: '45s', rest: intensity.rest }, 
            ['Panturrilhas', 'Ombros', 'Core'], level),
          createExercise({ name: 'Agachamento com salto', sets: intensity.sets, reps: '45s', rest: intensity.rest }, 
            ['Quadríceps', 'Glúteos', 'Panturrilhas'], level)
        ]
      }
    ],
    'Hipertrofia': [
      {
        name: 'Treino de Força A',
        description: `Treino focado em membros superiores com ${intensity.sets} séries por exercício.`,
        exercises: [
          createExercise({ name: 'Supino reto', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Peito', 'Tríceps', 'Ombros'], level),
          createExercise({ name: 'Remada curvada', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Costas', 'Bíceps', 'Antebraço'], level),
          createExercise({ name: 'Desenvolvimento ombro', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Ombros', 'Tríceps'], level),
          createExercise({ name: 'Rosca direta', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Bíceps', 'Antebraço'], level),
          createExercise({ name: 'Tríceps corda', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Tríceps'], level)
        ]
      },
      {
        name: 'Treino de Força B',
        description: `Treino focado em membros inferiores com ${intensity.sets} séries por exercício.`,
        exercises: [
          createExercise({ name: 'Agachamento livre', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Quadríceps', 'Glúteos', 'Isquiotibiais'], level),
          createExercise({ name: 'Leg press', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Quadríceps', 'Glúteos'], level),
          createExercise({ name: 'Extensora', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Quadríceps'], level),
          createExercise({ name: 'Flexora', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Isquiotibiais'], level),
          createExercise({ name: 'Panturrilha em pé', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }, 
            ['Panturrilhas'], level)
        ]
      }
    ],
    'Condicionamento': [
      {
        name: 'Treino Cardio A',
        description: `Treino para melhorar a resistência aeróbica. Realize ${intensity.sets} voltas.`,
        exercises: [
          createExercise({ name: 'Corrida leve', sets: '1', reps: '15 min', rest: '0' }, 
            ['Quadríceps', 'Panturrilhas', 'Core'], level),
          createExercise({ name: 'Escada (stepping)', sets: intensity.sets, reps: '1 min', rest: '30s' }, 
            ['Quadríceps', 'Glúteos', 'Panturrilhas'], level),
          createExercise({ name: 'Bicicleta estacionária', sets: '1', reps: '10 min', rest: '0' }, 
            ['Quadríceps', 'Isquiotibiais', 'Glúteos'], level),
          createExercise({ name: 'Jumping jack', sets: intensity.sets, reps: '1 min', rest: '30s' }, 
            ['Ombros', 'Core', 'Quadríceps'], level)
        ]
      },
      {
        name: 'Treino Cardio B',
        description: `Treino intervalado para resistência. Realize ${intensity.sets} voltas.`,
        exercises: [
          createExercise({ name: 'Sprint', sets: intensity.sets, reps: '30s', rest: '1 min' }, 
            ['Quadríceps', 'Isquiotibiais', 'Panturrilhas'], level),
          createExercise({ name: 'Caminhada', sets: intensity.sets, reps: '2 min', rest: '0' }, 
            ['Quadríceps', 'Glúteos', 'Panturrilhas'], level),
          createExercise({ name: 'Pular corda', sets: intensity.sets, reps: '1 min', rest: '1 min' }, 
            ['Panturrilhas', 'Ombros', 'Core'], level),
          createExercise({ name: 'Marcha estacionária', sets: intensity.sets, reps: '2 min', rest: '0' }, 
            ['Quadríceps', 'Core'], level)
        ]
      }
    ],
    'Flexibilidade': [
      {
        name: 'Treino de Mobilidade',
        description: 'Treino para melhorar a amplitude de movimento e reduzir rigidez muscular.',
        exercises: [
          createExercise({ name: 'Alongamento de isquiotibiais', sets: '1', reps: '30s cada lado', rest: '0' }, 
            ['Isquiotibiais', 'Lombar'], 'iniciante'),
          createExercise({ name: 'Cat-cow (yoga)', sets: '1', reps: '1 min', rest: '0' }, 
            ['Lombar', 'Core', 'Abdômen'], 'iniciante'),
          createExercise({ name: 'Rotação de ombros', sets: '1', reps: '1 min', rest: '0' }, 
            ['Ombros', 'Trapézio'], 'iniciante'),
          createExercise({ name: 'Alongamento de quadríceps', sets: '1', reps: '30s cada lado', rest: '0' }, 
            ['Quadríceps'], 'iniciante'),
          createExercise({ name: 'Alongamento lateral (tronco)', sets: '1', reps: '30s cada lado', rest: '0' }, 
            ['Oblíquos', 'Intercostais'], 'iniciante')
        ]
      },
      {
        name: 'Yoga Básico',
        description: 'Sequência básica de posturas de yoga para melhorar flexibilidade e equilíbrio.',
        exercises: [
          createExercise({ name: 'Postura da montanha', sets: '1', reps: '1 min', rest: '0' }, 
            ['Core', 'Postura'], 'iniciante'),
          createExercise({ name: 'Postura do cachorro olhando para baixo', sets: '1', reps: '1 min', rest: '0' }, 
            ['Ombros', 'Isquiotibiais', 'Panturrilhas'], 'iniciante'),
          createExercise({ name: 'Postura da cobra', sets: '1', reps: '30s', rest: '0' }, 
            ['Lombar', 'Abdômen', 'Peito'], 'iniciante'),
          createExercise({ name: 'Postura da criança', sets: '1', reps: '1 min', rest: '0' }, 
            ['Lombar', 'Ombros', 'Quadril'], 'iniciante'),
          createExercise({ name: 'Postura da árvore', sets: '1', reps: '30s cada lado', rest: '0' }, 
            ['Core', 'Quadril', 'Pernas'], 'iniciante')
        ]
      }
    ]
  };

  // Mapear objetivos do frontend para categorias
  const goalMapping = {
    'weight_loss': 'Perda de peso',
    'muscle_gain': 'Hipertrofia',
    'endurance': 'Condicionamento',
    'flexibility': 'Flexibilidade',
    'general_fitness': 'Condicionamento'
  };

  // Selecionar treinos apropriados com base nos objetivos
  let suggestedWorkouts = [];
  
  if (goals && goals.length > 0) {
    // Usar os objetivos informados
    for (const goal of goals) {
      const mappedGoal = goalMapping[goal] || goal;
      if (workouts[mappedGoal]) {
        suggestedWorkouts = suggestedWorkouts.concat(workouts[mappedGoal]);
      }
    }
  }
  
  // Se não houver treinos selecionados, oferecer um mix básico
  if (suggestedWorkouts.length === 0) {
    // Adicionar um treino de cada categoria
    for (const category in workouts) {
      if (workouts[category] && workouts[category].length > 0) {
        suggestedWorkouts.push(workouts[category][0]);
      }
    }
  }

  return suggestedWorkouts;
} 