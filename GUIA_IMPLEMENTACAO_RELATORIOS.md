# Guia de Implementação: Relatórios Avançados e Metas de Fitness

Este guia explica como implementar os recursos de relatórios avançados e sistema de metas de fitness no aplicativo Treino na Mão.

## 1. Configuração do Banco de Dados

Execute o script SQL a seguir no Console SQL do Supabase para criar as tabelas necessárias:

```sql
-- Executar o arquivo sql/setup-user-metrics.sql
```

Este script criará as seguintes tabelas:
- `user_body_metrics` - Armazena medidas corporais do usuário
- `user_fitness_goals` - Armazena metas de fitness definidas pelo usuário
- `user_strength_progress` - Rastreia progresso de força nos exercícios
- `user_workout_frequency` - Monitora frequência de treinos por semana
- `user_fitness_profile` - Perfil de fitness detalhado do usuário

## 2. Páginas Implementadas

Foram criadas as seguintes páginas:

1. **Perfil de Fitness** (`pages/fitness-profile.js`) 
   - Coleta informações detalhadas sobre condicionamento físico, objetivos e medidas corporais
   - Estas informações são usadas para gerar treinos personalizados e relatórios de progresso

2. **API Avançada de Sugestões** (`pages/api/advanced-workout-suggestions.js`)
   - Utiliza dados avançados do perfil de fitness para gerar treinos altamente personalizados
   - Substitui a API simples anterior com uma versão mais contextualizada

## 3. Páginas a Implementar 

As seguintes páginas devem ser criadas para completar o sistema:

1. **Metas de Fitness** (`pages/fitness-goals.js`)
   - Interface para definir e gerenciar metas de fitness 
   - Tipos de metas: peso, % gordura, medidas corporais, força
   - Acompanhamento visual do progresso

2. **Relatórios de Progresso** (`pages/fitness-reports.js`)
   - Dashboard com gráficos de acompanhamento de progresso
   - Histórico de medidas corporais
   - Progresso nas cargas de exercícios
   - Frequência de treinos

3. **Registro de Progresso** (`pages/record-progress.js`)
   - Formulário para atualizar métricas corporais
   - Interface para registrar cargas máximas em exercícios

## 4. Componentes Gráficos Recomendados

Para visualização de dados, recomendamos:

1. **Chart.js** - Biblioteca leve para gráficos
   ```
   npm install chart.js react-chartjs-2
   ```

2. **Recharts** - Biblioteca de gráficos em React
   ```
   npm install recharts
   ```

## 5. Integrações a Realizar

1. **Modificar o Menu de Navegação**
   - Adicionar links para as novas páginas
   - Sugestão: Adicionar seção "Fitness" no menu lateral

2. **Atualizar Página de Perfil**
   - Adicionar cartões com links para os novos recursos
   - Mostrar resumo das métricas do usuário

3. **Ajustar Página de Dashboard**
   - Incluir widgets com resumo de progresso
   - Adicionar link rápido para registrar medidas

## 6. Sequência de Implementação Recomendada

1. Execute o script SQL para criar as tabelas
2. Implemente a página de Perfil de Fitness
3. Implemente a API avançada de sugestões
4. Implemente a página de Metas de Fitness
5. Implemente a página de Relatórios
6. Realize integrações no menu e dashboard
7. Realize testes de fluxo completo
8. Implemente melhorias de UX baseadas no feedback

## 7. Considerações de UX

- Utilizar gráficos interativos onde o usuário pode selecionar intervalos de tempo
- Focar em visualizações comparativas (antes/depois)
- Utilizar códigos de cores para indicar progresso (verde para avanço, vermelho para retrocesso)
- Implementar dicas contextuais sobre como interpretar os dados
- Garantir que os relatórios sejam responsivos para visualização em dispositivos móveis

## 8. Segurança e Privacidade

- Todas as tabelas têm políticas RLS (Row Level Security) implementadas
- Cada usuário só pode ver e manipular seus próprios dados
- Garantir que não haja exposição de dados sensíveis nas APIs públicas
- Considerar adicionar uma opção de exportação de dados para o usuário 