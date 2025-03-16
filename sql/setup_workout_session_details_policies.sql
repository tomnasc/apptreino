CREATE OR REPLACE FUNCTION setup_workout_session_details_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Política para SELECT (leitura)
  DROP POLICY IF EXISTS "Usuários podem ver detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem ver detalhes de suas próprias sessões"
    ON workout_session_details
    FOR SELECT
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para INSERT (inserção)
  DROP POLICY IF EXISTS "Usuários podem inserir detalhes em suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem inserir detalhes em suas próprias sessões"
    ON workout_session_details
    FOR INSERT
    WITH CHECK (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para UPDATE (atualização)
  DROP POLICY IF EXISTS "Usuários podem atualizar detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem atualizar detalhes de suas próprias sessões"
    ON workout_session_details
    FOR UPDATE
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );

  -- Política para DELETE (exclusão)
  DROP POLICY IF EXISTS "Usuários podem excluir detalhes de suas próprias sessões" ON workout_session_details;
  CREATE POLICY "Usuários podem excluir detalhes de suas próprias sessões"
    ON workout_session_details
    FOR DELETE
    USING (
      session_id IN (
        SELECT id FROM workout_sessions WHERE user_id = auth.uid()
      )
    );
END;
$$; 