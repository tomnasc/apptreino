-- Função para permitir que usuários excluam suas próprias contas
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Obter o ID do usuário atual
  uid := auth.uid();
  
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado para excluir sua conta';
  END IF;
  
  -- Excluir o usuário da tabela auth.users (isso vai acionar a exclusão em cascata)
  DELETE FROM auth.users WHERE id = uid;
END;
$$; 