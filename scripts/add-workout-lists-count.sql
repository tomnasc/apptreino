-- Script para adicionar o campo workout_lists_count à tabela user_assessments existente
-- Execute este script no SQL Editor do Supabase

-- Verificar se a coluna já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_assessments' 
        AND column_name = 'workout_lists_count'
    ) THEN
        -- Adicionar a coluna com valor padrão 3
        ALTER TABLE user_assessments ADD COLUMN workout_lists_count INT DEFAULT 3;
        
        -- Atualizar registros existentes
        UPDATE user_assessments SET workout_lists_count = 3 WHERE workout_lists_count IS NULL;
        
        RAISE NOTICE 'Coluna workout_lists_count adicionada com sucesso à tabela user_assessments';
    ELSE
        RAISE NOTICE 'A coluna workout_lists_count já existe na tabela user_assessments';
    END IF;
END $$; 