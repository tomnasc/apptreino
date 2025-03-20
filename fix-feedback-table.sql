-- Verificar se a tabela existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_feedback') THEN
        -- Verifica se a coluna 'subject' não existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_name = 'user_feedback' AND column_name = 'subject') THEN
            -- Adiciona a coluna 'subject' se estiver faltando
            ALTER TABLE user_feedback ADD COLUMN subject TEXT;
            
            -- Atualiza a coluna para NOT NULL após ter adicionado dados
            -- Para tabelas com dados existentes, primeiro precisamos preencher valores
            UPDATE user_feedback SET subject = 'Sem assunto' WHERE subject IS NULL;
            
            -- Depois da atualização, configura como NOT NULL
            ALTER TABLE user_feedback ALTER COLUMN subject SET NOT NULL;
            
            RAISE NOTICE 'Coluna subject adicionada com sucesso à tabela user_feedback';
        ELSE
            RAISE NOTICE 'A coluna subject já existe na tabela user_feedback';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela user_feedback não existe. Execute primeiro o script setup-feedback.sql';
    END IF;
END $$; 