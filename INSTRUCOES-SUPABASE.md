# Instruções para configurar o Sistema de Tipos de Usuário no Supabase

Para corrigir os erros relacionados à recursão infinita nas políticas de segurança, siga estas instruções para configurar manualmente as tabelas e políticas necessárias no Supabase.

## Passo 1: Acessar o Supabase

1. Faça login no [Dashboard do Supabase](https://app.supabase.io/)
2. Selecione o projeto onde o App Treino está hospedado

## Passo 2: Abrir o Editor SQL

1. No menu lateral esquerdo, clique em "SQL Editor"
2. Clique no botão "+ New Query" para criar uma nova consulta

## Passo 3: Executar o Script

1. Copie e cole todo o conteúdo do arquivo `setup-supabase.sql` no editor
2. Antes de executar, você pode modificar o email do administrador na linha:
   ```sql
   SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@exemplo.com' LIMIT 1;
   ```
   Substitua 'admin@exemplo.com' pelo seu email.
3. Clique no botão "Run" para executar o script
4. Aguarde a conclusão da execução

O script irá:
- Criar um tipo ENUM para categorizar os tipos de usuário (admin, paid, free)
- Criar a tabela `user_profiles` para armazenar informações sobre os usuários
- Criar a tabela `admin_users` para identificar administradores (evitando recursão)
- Criar a tabela `app_settings` para configurações globais
- Criar políticas de segurança para acesso às tabelas
- Configurar funções e triggers para gerenciar os perfis
- Popular perfis para usuários existentes
- Definir automaticamente um administrador (primeiro usuário ou um específico)

## Passo 4: Definir um Administrador Manualmente

Se desejar definir manualmente um usuário como administrador após a execução do script:

```sql
-- Adicionar à tabela admin_users
INSERT INTO admin_users (user_id)
SELECT id 
FROM auth.users 
WHERE email = 'seu_email@exemplo.com'
ON CONFLICT (user_id) DO NOTHING;

-- Atualizar também na tabela de perfis
UPDATE user_profiles
SET plan_type = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'seu_email@exemplo.com'
);
```

Substitua `'seu_email@exemplo.com'` pelo email do usuário que deve ser administrador.

## Passo 5: Verificar a Configuração

Para verificar se as tabelas foram criadas corretamente:

```sql
-- Verificar tabela de perfis
SELECT * FROM user_profiles LIMIT 10;

-- Verificar administradores
SELECT u.email, p.plan_type 
FROM admin_users a 
JOIN auth.users u ON a.user_id = u.id
JOIN user_profiles p ON p.id = u.id;
```

## Passo 6: Verificar Políticas de Segurança

Para verificar se as políticas foram criadas:

```sql
SELECT * FROM pg_policies WHERE tablename IN ('user_profiles', 'admin_users', 'app_settings');
```

## Passo 7: Testar a Configuração

Após concluir a configuração, volte ao App Treino e verifique se os erros foram resolvidos. O sistema agora deve ser capaz de verificar os tipos de usuário e fornecer acesso adequado com base no tipo de plano de cada usuário. 