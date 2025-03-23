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

    return res.status(200).json({
      success: true,
      data: workoutSuggestions,
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
  }[level.toLowerCase()] || { sets: '3', reps: '10-12', rest: '60s' };

  // Treinos padrão por categoria
  const workouts = {
    'Perda de peso': [
      {
        name: 'Treino Metabólico A',
        description: `Treino de circuito para queima calórica. Realize ${intensity.sets} voltas com ${intensity.rest} de descanso entre exercícios.`,
        exercises: [
          { name: 'Agachamento', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Polichinelo', sets: intensity.sets, reps: '30s', rest: intensity.rest },
          { name: 'Flexão de braço', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Mountain climber', sets: intensity.sets, reps: '30s', rest: intensity.rest },
          { name: 'Abdominal', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }
        ]
      },
      {
        name: 'Treino Metabólico B',
        description: `Treino intervalado de alta intensidade. Realize ${intensity.sets} voltas com ${intensity.rest} de descanso entre exercícios.`,
        exercises: [
          { name: 'Burpee', sets: intensity.sets, reps: '45s', rest: intensity.rest },
          { name: 'Corrida no lugar', sets: intensity.sets, reps: '45s', rest: intensity.rest },
          { name: 'Prancha', sets: intensity.sets, reps: '45s', rest: intensity.rest },
          { name: 'Pular corda', sets: intensity.sets, reps: '45s', rest: intensity.rest },
          { name: 'Agachamento com salto', sets: intensity.sets, reps: '45s', rest: intensity.rest }
        ]
      }
    ],
    'Hipertrofia': [
      {
        name: 'Treino de Força A',
        description: `Treino focado em membros superiores com ${intensity.sets} séries por exercício.`,
        exercises: [
          { name: 'Supino reto', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Remada curvada', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Desenvolvimento ombro', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Rosca direta', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Tríceps corda', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }
        ]
      },
      {
        name: 'Treino de Força B',
        description: `Treino focado em membros inferiores com ${intensity.sets} séries por exercício.`,
        exercises: [
          { name: 'Agachamento livre', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Leg press', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Extensora', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Flexora', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest },
          { name: 'Panturrilha em pé', sets: intensity.sets, reps: intensity.reps, rest: intensity.rest }
        ]
      }
    ],
    'Condicionamento': [
      {
        name: 'Treino Cardio A',
        description: `Treino para melhorar a resistência aeróbica. Realize ${intensity.sets} voltas.`,
        exercises: [
          { name: 'Corrida leve', sets: '1', reps: '15 min', rest: '0' },
          { name: 'Escada (stepping)', sets: intensity.sets, reps: '1 min', rest: '30s' },
          { name: 'Bicicleta estacionária', sets: '1', reps: '10 min', rest: '0' },
          { name: 'Jumping jack', sets: intensity.sets, reps: '1 min', rest: '30s' },
        ]
      },
      {
        name: 'Treino Cardio B',
        description: `Treino intervalado para resistência. Realize ${intensity.sets} voltas.`,
        exercises: [
          { name: 'Sprint', sets: intensity.sets, reps: '30s', rest: '1 min' },
          { name: 'Caminhada', sets: intensity.sets, reps: '2 min', rest: '0' },
          { name: 'Pular corda', sets: intensity.sets, reps: '1 min', rest: '1 min' },
          { name: 'Marcha estacionária', sets: intensity.sets, reps: '2 min', rest: '0' },
        ]
      }
    ],
    'Flexibilidade': [
      {
        name: 'Treino de Mobilidade',
        description: 'Treino para melhorar a amplitude de movimento e reduzir rigidez muscular.',
        exercises: [
          { name: 'Alongamento de isquiotibiais', sets: '1', reps: '30s cada lado', rest: '0' },
          { name: 'Cat-cow (yoga)', sets: '1', reps: '1 min', rest: '0' },
          { name: 'Rotação de ombros', sets: '1', reps: '1 min', rest: '0' },
          { name: 'Alongamento de quadríceps', sets: '1', reps: '30s cada lado', rest: '0' },
          { name: 'Alongamento lateral (tronco)', sets: '1', reps: '30s cada lado', rest: '0' }
        ]
      },
      {
        name: 'Yoga Básico',
        description: 'Sequência básica de posturas de yoga para melhorar flexibilidade e equilíbrio.',
        exercises: [
          { name: 'Postura da montanha', sets: '1', reps: '1 min', rest: '0' },
          { name: 'Postura do cachorro olhando para baixo', sets: '1', reps: '1 min', rest: '0' },
          { name: 'Postura da cobra', sets: '1', reps: '30s', rest: '0' },
          { name: 'Postura da criança', sets: '1', reps: '1 min', rest: '0' },
          { name: 'Postura da árvore', sets: '1', reps: '30s cada lado', rest: '0' }
        ]
      }
    ]
  };

  // Selecionar treinos apropriados com base nos objetivos
  let suggestedWorkouts = [];
  
  if (goals && goals.length > 0) {
    // Usar os objetivos informados
    for (const goal of goals) {
      if (workouts[goal]) {
        suggestedWorkouts = suggestedWorkouts.concat(workouts[goal]);
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