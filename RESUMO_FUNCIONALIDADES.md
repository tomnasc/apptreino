# Resumo das Funcionalidades e Recursos da Aplicação

Este documento fornece um resumo das principais funcionalidades e recursos do aplicativo **Treino na Mão**.

## Visão Geral

O **Treino na Mão** é um aplicativo para gerenciamento de treinos de academia, permitindo aos usuários criar, acompanhar e analisar seus treinos. A aplicação também integra inteligência artificial para sugestões de treino personalizadas.

## Funcionalidades Principais

-   **Autenticação de Usuários:**
    -   Login com email e senha.
    -   Níveis de acesso: Gratuito, Pago, Administrador.
    -   Verificação de email e recuperação de senha.
-   **Gerenciamento de Treinos:**
    -   Criação de listas de treino personalizadas.
    -   Adição e organização de exercícios dentro das listas.
-   **Geração de Treinos com IA:**
    -   Utiliza a API do Hugging Face (modelo Mistral-7B-Instruct) para gerar sugestões de treino com base em dados do usuário (avaliação física).
    -   Tratamento robusto de erros durante a geração.
-   **Modo de Treino Interativo:**
    -   Interface para acompanhar a execução do treino em tempo real.
    -   Controle de séries, repetições, carga e tempo (com cronômetros).
    -   Temporizador de descanso entre séries.
    -   Integração com vídeos do YouTube para demonstração de exercícios.
    -   Alertas para progressão de carga.
    -   Funcionalidade para pular exercícios ou ir para um específico.
    -   Wake Lock para manter a tela ativa durante o treino.
    -   Notificações (visuais e sonoras, com permissão) para fim de descanso/série.
    -   Persistência do estado do treino (localStorage) para retomada.
    -   Verificação e opção de retomar treinos não finalizados.
-   **Histórico e Relatórios:**
    -   Armazenamento detalhado do histórico de treinos concluídos.
    -   Visualização de estatísticas e relatórios de desempenho.
-   **Sistema de Pagamento (Stripe):**
    -   Integração para assinaturas premium (usuário Pago).
    -   Checkout seguro via Stripe.
    -   Webhook para processamento de pagamentos e atualização de status.
-   **Interface e Experiência do Usuário:**
    -   Interface responsiva (Mobile/Desktop).
    -   Modo escuro/claro.
    -   Notificações toast para feedback.

## Tecnologias

-   **Frontend:** Next.js, React, TailwindCSS.
-   **Backend:** Supabase (PostgreSQL, Auth, Storage), Next.js API Routes.
-   **IA:** Hugging Face API.
-   **Pagamentos:** Stripe.
-   **Hospedagem:** Vercel.

## Estrutura do Projeto

-   Organização padrão do Next.js.
-   Pastas dedicadas para componentes, contextos, libs, páginas (incluindo admin, api, modo de treino), scripts SQL, estilos e utilitários.

Para informações mais detalhadas, consulte o arquivo completo `DOCUMENTACAO.md`. 