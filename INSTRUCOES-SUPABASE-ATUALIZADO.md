# Instruções para configurar o Sistema de Tipos de Usuário no Supabase

Para corrigir os erros relacionados à configuração de usuários admin, dividimos o script em duas partes que devem ser executadas sequencialmente.

## Passo 1: Acessar o Supabase

1. Faça login no [Dashboard do Supabase](https://app.supabase.io/)
2. Selecione o projeto onde o App Treino está hospedado

## Passo 2: Executar a Parte 1 do Script

1. No menu lateral esquerdo, clique em "SQL Editor"
2. Clique no botão "+ New Query" para criar uma nova consulta
3. Antes de executar o script, edite-o para substituir o email do administrador:
   - Localize a linha: `admin_email TEXT := 'admin@exemplo.com';`
   - Substitua 'admin@exemplo.com' pelo email do usuário que deve ser administrador
4. Copie todo o conteúdo do arquivo `setup-supabase-parte1.sql` no editor
5. Clique no botão "Run" para executar o script
6. Aguarde a conclusão da execução

A Parte 1 do script irá:
- Criar um tipo ENUM para tipos de usuário (admin, paid, free)
- Criar a tabela `user_profiles` para informações de usuários
- Criar a tabela `admin_users` para identificar administradores
- Criar a tabela `app_settings` para configurações
- Configurar políticas de segurança
- Popular perfis para usuários existentes
- Definir o administrador inicial

## Passo 3: Verificar se o Administrador foi Configurado

Antes de prosseguir, verifique se o administrador foi configurado corretamente:

```sql
SELECT u.email, p.plan_type, a.user_id IS NOT NULL as is_admin
FROM user_profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN admin_users a ON a.user_id = u.id
WHERE p.plan_type = 'admin' OR a.user_id IS NOT NULL;
```

Você deve ver pelo menos um usuário listado como administrador.

## Passo 4: Executar a Parte 2 do Script

1. Clique no botão "+ New Query" para criar uma nova consulta
2. Copie todo o conteúdo do arquivo `setup-supabase-parte2.sql` no editor
3. Clique no botão "Run" para executar o script
4. Aguarde a conclusão da execução

A Parte 2 do script irá:
- Criar o trigger para proteger a alteração do tipo de plano
- Criar funções para verificar acesso de usuários
- Configurar triggers para atualização de dados
- Configurar criação automática de perfis para novos usuários

## Passo 5: Verificar a Configuração Completa

Para verificar se tudo foi configurado corretamente:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'admin_users', 'app_settings');

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Verificar políticas de segurança
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## Passo 6: Atualizar uma Versão do App

Após concluir a configuração no banco de dados, volte ao App Treino e faça uma atualização para testar se os erros foram resolvidos.

## Observações Importantes

- É crucial executar os scripts na ordem correta: primeiro a Parte 1, verificar se o administrador foi definido, e só então executar a Parte 2.
- Se encontrar erros na execução da Parte 1, corrija-os antes de tentar executar a Parte 2.
- O administrador deve ser definido corretamente na Parte 1 para que o sistema de controle de acesso funcione.
- Depois de configurado, para adicionar novos administradores, use:

```sql
-- Adicionar um novo administrador
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'novo_admin@exemplo.com'
ON CONFLICT (user_id) DO NOTHING;

UPDATE user_profiles
SET plan_type = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'novo_admin@exemplo.com');
``` 