# Documentação do Projeto Treino na Mão

## Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Configuração do Ambiente](#configuração-do-ambiente)
5. [Configuração do Banco de Dados (Supabase)](#configuração-do-banco-de-dados-supabase)
6. [Sistema de Autenticação](#sistema-de-autenticação)
7. [Geração de Treinos com IA](#geração-de-treinos-com-ia)
8. [Sistema de Pagamento (Stripe)](#sistema-de-pagamento-stripe)
9. [Deploy e Hospedagem](#deploy-e-hospedagem)
10. [Manutenção](#manutenção)
11. [Guia de Solução de Problemas](#guia-de-solução-de-problemas)

## Visão Geral

O **Treino na Mão** é um aplicativo completo para gerenciamento de treinos de academia, que permite aos usuários criar listas de exercícios personalizadas, acompanhar sessões de treino e visualizar estatísticas detalhadas de desempenho. O aplicativo também oferece geração de treinos personalizados usando IA através da API do Hugging Face.

### Funcionalidades Principais:
- Autenticação de usuários (login com email/senha)
- Diferentes níveis de acesso (usuário gratuito, pago, administrador)
- Criação de listas de treinos personalizadas
- Geração de treinos com IA
- Modo de treino interativo
- Controle de séries, repetições, carga e tempo
- Histórico detalhado de treinos
- Relatórios de desempenho com estatísticas
- Integração com vídeos do YouTube para demonstração de exercícios
- Interface responsiva para dispositivos móveis e desktop
- Sistema de pagamento para contas premium
- Modo escuro/claro

## Estrutura do Projeto

O projeto segue a estrutura padrão do Next.js com algumas pastas adicionais para organização:

```
/
├── components/            # Componentes React reutilizáveis
├── context/               # Contextos React (tema, autenticação, etc.)
├── lib/                   # Funções utilitárias e bibliotecas
├── pages/                 # Páginas da aplicação
│   ├── admin/             # Páginas de administração
│   ├── api/               # Rotas de API
│   ├── workout-lists/     # Páginas de listas de treino
│   ├── workout-mode/      # Páginas do modo de treino
│   └── workout-report/    # Páginas de relatórios
├── public/                # Arquivos estáticos (imagens, ícones)
├── scripts/               # Scripts para geração de treinos
├── sql/                   # Scripts SQL para configuração do banco de dados
├── styles/                # Arquivos CSS globais
└── utils/                 # Funções utilitárias
```

### Principais Arquivos:
- `pages/_app.js`: Configuração global da aplicação
- `components/Layout.js`: Layout principal com navegação
- `context/ThemeContext.js`: Gerenciamento do tema (claro/escuro)
- `pages/api/ai-workout-suggestions.js`: API para geração de treinos com IA

## Tecnologias Utilizadas

### Frontend:
- **Next.js (v14.1.0)**: Framework React para renderização do lado do servidor
- **React (v18.2.0)**: Biblioteca para construção de interfaces
- **TailwindCSS (v3.3.5)**: Framework CSS utilitário
- **React Icons (v4.12.0)**: Biblioteca de ícones
- **React Hot Toast (v2.5.2)**: Notificações toast
- **React YouTube (v10.1.0)**: Componente para integração com vídeos do YouTube

### Backend:
- **Supabase**: Plataforma de backend-as-a-service
  - Banco de dados PostgreSQL
  - Autenticação e gerenciamento de usuários
  - Armazenamento de arquivos
- **Next.js API Routes**: APIs serverless para lógica de backend
- **Stripe (v14.25.0)**: Processamento de pagamentos
- **Hugging Face**: API para geração de treinos com IA

### Ferramentas de Desenvolvimento:
- **npm/Node.js**: Gerenciamento de pacotes e ambiente de execução
- **Git**: Controle de versão
- **Vercel**: Deploy e hospedagem

## Configuração do Ambiente

### Pré-requisitos:
- Node.js (v14 ou superior)
- npm ou yarn
- Conta no Supabase
- Conta no Stripe (para sistema de pagamentos)
- Conta no Hugging Face (para geração de treinos com IA)

### Variáveis de Ambiente:

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```
# Variáveis do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui

# Configurações do Hugging Face para geração de treinos
HF_API_TOKEN=seu-token-da-api-huggingface
HF_MODEL=modelo-para-geração-de-treinos  # Recomendado: mistralai/Mistral-7B-Instruct-v0.2

# Configurações do Stripe (opcional, para sistema de pagamento)
STRIPE_SECRET_KEY=sua-chave-secreta-stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sua-chave-publicavel-stripe
STRIPE_WEBHOOK_SECRET=seu-segredo-webhook-stripe

# Configuração de ambiente
NODE_ENV=development # ou production quando em produção
```

### Instalação:

```bash
# Clonar o repositório
git clone https://github.com/tomnasc/apptreino.git
cd apptreino

# Instalar dependências
npm install

# Executar em ambiente de desenvolvimento
npm run dev
```

## Configuração do Banco de Dados (Supabase)

O projeto utiliza o Supabase como backend, com várias tabelas e relações para armazenar os dados dos usuários, treinos, exercícios e muito mais.

### Passos para Configuração:

1. Crie uma conta no [Supabase](https://supabase.com/)
2. Crie um novo projeto
3. Obtenha as chaves de API (URL e chave anônima) no painel do Supabase em Project Settings > API
4. Execute os scripts SQL de configuração na seguinte ordem:

#### 1. Configuração Básica do Banco de Dados:

Execute o script `setup-supabase.sql` no Editor SQL do Supabase para criar as tabelas principais:
- `workout_lists`: Listas de treinos
- `workout_exercises`: Exercícios em cada lista
- `workout_sessions`: Sessões de treino realizadas
- `workout_session_details`: Detalhes de cada sessão de treino

#### 2. Configuração do Sistema de Usuários:

Execute os scripts `setup-supabase-parte1.sql` e `setup-supabase-parte2.sql` para configurar:
- Tipos de usuário (admin, paid, free)
- Tabela `user_profiles` para informações adicionais
- Tabela `admin_users` para identificar administradores
- Políticas de segurança Row Level Security (RLS)

#### 3. Configuração do Sistema de Relatórios:

Execute o script `setup-workout-session-details.sql` para configurar a tabela e as políticas de segurança para os detalhes das sessões de treino.

#### 4. Configuração do Sistema de Pagamento:

Execute o script `setup-payment-tables.sql` para criar as tabelas relacionadas ao sistema de pagamento:
- `subscriptions`: Assinaturas dos usuários
- `payment_history`: Histórico de pagamentos

### Estrutura do Banco de Dados:

- **Tabelas Principais**:
  - `workout_lists`: Listas de treino criadas pelos usuários
  - `workout_exercises`: Exercícios que compõem cada lista de treino
  - `workout_sessions`: Sessões de treino realizadas pelos usuários
  - `workout_session_details`: Detalhes de cada sessão (séries, repetições, etc.)
  - `user_profiles`: Informações adicionais dos usuários
  - `ai_suggested_workouts`: Treinos sugeridos pela IA

- **Tabelas de Pagamento**:
  - `subscriptions`: Assinaturas dos usuários
  - `payment_history`: Histórico de pagamentos
  - `payment_products`: Produtos disponíveis para compra

- **Tabelas Administrativas**:
  - `admin_users`: Usuários com privilégios de administrador
  - `app_settings`: Configurações gerais da aplicação

## Sistema de Autenticação

O projeto utiliza o sistema de autenticação do Supabase, que oferece funcionalidades como:
- Registro e login com email/senha
- Verificação de email
- Recuperação de senha
- Gerenciamento de sessões

### Níveis de Acesso:

O sistema possui três níveis de acesso:
1. **Usuário Free**: Acesso limitado à funcionalidades básicas
2. **Usuário Paid**: Acesso completo às funcionalidades
3. **Administrador**: Acesso a funcionalidades administrativas

### Implementação:

A autenticação é gerenciada pelos componentes `@supabase/auth-helpers-nextjs` e `@supabase/auth-helpers-react`, que oferecem hooks e utilitários para gerenciar o estado de autenticação:
- `useUser()`: Hook para acessar o usuário atual
- `useSupabaseClient()`: Hook para acessar o cliente do Supabase

O componente `Layout.js` verifica o estado de autenticação e exibe diferentes menus de navegação com base no nível de acesso do usuário.

## Geração de Treinos com IA

O projeto utiliza a API do Hugging Face para gerar treinos personalizados com base nos dados do usuário, como altura, peso, idade, nível de experiência, objetivos, etc.

### Implementação:

1. O usuário preenche um formulário de avaliação física (`pages/assessment.js`)
2. Os dados são enviados para a API do Hugging Face através de uma rota API do Next.js (`pages/api/ai-workout-suggestions.js`)
3. A API do Hugging Face processa a solicitação e retorna sugestões de treino
4. As sugestões são salvas no banco de dados e exibidas ao usuário (`pages/workout-suggestions.js`)

### Modelo de IA:

O projeto utiliza o modelo `mistralai/Mistral-7B-Instruct-v0.2` do Hugging Face, que é um modelo de linguagem grande (LLM) capaz de gerar textos complexos e estruturados. O modelo é instruído com um prompt específico para gerar treinos personalizados em formato JSON.

### Tratamento de Erros:

O sistema inclui um extenso tratamento de erros para lidar com possíveis falhas na geração de treinos:
- Timeout da API do Hugging Face
- Erros de parsing do JSON retornado
- Falhas na comunicação com a API

## Sistema de Pagamento (Stripe)

O projeto integra o Stripe para processar pagamentos de assinaturas e funcionalidades premium.

### Configuração do Stripe:

1. Crie uma conta no [Stripe](https://stripe.com/)
2. Obtenha as chaves de API (publicável e secreta)
3. Configure produtos e preços no dashboard do Stripe
4. Configure um webhook para processar eventos de pagamento

### Implementação:

- `components/PaymentButton.js`: Componente para iniciar o checkout do Stripe
- `pages/api/create-checkout-session-direct.js`: API para criar sessões de checkout
- `pages/api/webhook.js`: Webhook para processar eventos do Stripe
- `pages/payment.js`: Página de pagamento
- `pages/payment-success.js`: Página de sucesso após o pagamento

### Fluxo de Pagamento:

1. O usuário clica em "Upgrade para Premium"
2. O sistema cria uma sessão de checkout no Stripe
3. O usuário é redirecionado para a página de checkout do Stripe
4. Após o pagamento, o usuário é redirecionado para a página de sucesso
5. O webhook processa o evento de pagamento e atualiza o status da assinatura do usuário

## Deploy e Hospedagem

O projeto é configurado para deploy na plataforma Vercel, que oferece integração contínua e deploys automáticos a partir do repositório GitHub.

### Configuração do Vercel:

1. Crie uma conta no [Vercel](https://vercel.com/)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente no dashboard do Vercel
4. Configure um domínio personalizado (opcional)

O arquivo `vercel.json` contém configurações específicas para o deploy no Vercel, incluindo rotas e variáveis de ambiente.

### Pipeline de Deploy:

O projeto segue o fluxo de trabalho GitFlow:
1. Desenvolvimento no branch `app-treino-v2`
2. Merge para o branch `main` via Pull Request
3. Deploy automático no Vercel a partir do branch `main`

## Manutenção

### Atualizações de Dependências:

É recomendável atualizar periodicamente as dependências do projeto para garantir que todas as bibliotecas estejam atualizadas com as últimas correções de segurança e melhorias:

```bash
npm outdated  # Verificar dependências desatualizadas
npm update    # Atualizar dependências
```

### Monitoramento:

Use as ferramentas de monitoramento do Vercel e do Supabase para acompanhar o desempenho da aplicação:
- **Vercel**: Métricas de desempenho, logs, análise de uso
- **Supabase**: Monitoramento do banco de dados, logs de autenticação, métricas de uso

### Backup do Banco de Dados:

Realize backups periódicos do banco de dados do Supabase para evitar perda de dados:
1. Acesse o painel do Supabase
2. Navegue para Database > Backups
3. Crie um backup manual ou configure backups automáticos

## Guia de Solução de Problemas

### Problemas Comuns:

#### 1. Erro no Login/Autenticação:
- Verifique se as chaves do Supabase estão configuradas corretamente
- Verifique se o usuário existe no banco de dados
- Verifique se o usuário tem um perfil associado na tabela `user_profiles`

#### 2. Erro na Geração de Treinos com IA:
- Verifique se o token da API do Hugging Face está configurado corretamente
- Verifique se o modelo especificado está disponível
- Aumente o timeout da requisição para modelos mais pesados

#### 3. Erro no Processamento de Pagamentos:
- Verifique se as chaves do Stripe estão configuradas corretamente
- Verifique os logs do webhook para identificar possíveis erros
- Teste o checkout em modo de teste antes de passar para produção

#### 4. Erros no Deploy:
- Verifique os logs de build no Vercel
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique se o arquivo `vercel.json` está configurado corretamente

### Canais de Suporte:

Para problemas não resolvidos, entre em contato através de:
- GitHub Issues: https://github.com/tomnasc/apptreino/issues
- Email de suporte: suporte@treinonamao.app 