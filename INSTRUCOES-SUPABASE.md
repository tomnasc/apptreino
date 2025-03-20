# Instruções para configurar o Sistema de Tipos de Usuário no Supabase

Para corrigir os erros relacionados à tabela `user_profiles` que não existe, siga estas instruções para configurar manualmente as tabelas e políticas necessárias no Supabase.

## Passo 1: Acessar o Supabase

1. Faça login no [Dashboard do Supabase](https://app.supabase.io/)
2. Selecione o projeto onde o App Treino está hospedado

## Passo 2: Abrir o Editor SQL

1. No menu lateral esquerdo, clique em "SQL Editor"
2. Clique no botão "+ New Query" para criar uma nova consulta

## Passo 3: Executar o Script

1. Copie e cole todo o conteúdo do arquivo `setup-supabase.sql` no editor
2. Clique no botão "Run" para executar o script
3. Aguarde a conclusão da execução

O script irá:
- Criar um tipo ENUM para categorizar os tipos de usuário (admin, paid, free)
- Criar a tabela `user_profiles` para armazenar informações sobre os usuários
- Criar a tabela `app_settings` para configurações globais
- Criar políticas de segurança para acesso às tabelas
- Configurar funções e triggers para gerenciar os perfis
- Popular perfis para usuários existentes

## Passo 4: Definir um Administrador

Para definir manualmente um usuário como administrador:

```sql
UPDATE user_profiles
SET plan_type = 'admin'
WHERE email = 'seu_email@exemplo.com';
```

Substitua `'seu_email@exemplo.com'` pelo email do usuário que deve ser administrador.

## Passo 5: Verificar a Configuração

Para verificar se a tabela foi criada corretamente:

```sql
SELECT * FROM user_profiles LIMIT 10;
```

Você deverá ver os perfis de usuários existentes no sistema.

## Passo 6: Verificar Políticas de Segurança

Para verificar se as políticas foram criadas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

## Passo 7: Testar a Configuração

Após concluir a configuração, volte ao App Treino e verifique se os erros foram resolvidos. O sistema agora deve ser capaz de verificar os tipos de usuário e fornecer acesso adequado com base no tipo de plano de cada usuário. 