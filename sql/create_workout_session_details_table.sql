CREATE OR REPLACE FUNCTION create_workout_session_details_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Criar a tabela workout_session_details se não existir
  CREATE TABLE IF NOT EXISTS workout_session_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    exercise_index INTEGER NOT NULL,
    set_index INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_used DECIMAL(5,2),
    execution_time INTEGER, -- tempo em segundos
    rest_time INTEGER, -- tempo de descanso em segundos
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, exercise_id, set_index)
  );

  -- Ativar Row Level Security
  ALTER TABLE workout_session_details ENABLE ROW LEVEL SECURITY;
END;
$$; 