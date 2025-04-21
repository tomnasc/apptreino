# Sistema de Afiliados - Documentação

## Visão Geral

O sistema de afiliados permite que usuários convidem novas pessoas para a plataforma e recebam recompensas quando esses novos usuários realizarem assinaturas. O processo foi implementado seguindo as seguintes etapas:

1. Cada usuário recebe um código único de afiliado ao se cadastrar
2. Os usuários podem compartilhar esse código ou enviar convites diretamente por email
3. Quando um novo usuário se cadastra usando um código de afiliado e depois realiza uma assinatura, o usuário que o convidou recebe 1 mês grátis
4. Os bônus podem ser acumulados e são aplicados na renovação da assinatura

## Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas no banco de dados:

1. **user_profiles**: Tabela existente que foi expandida para incluir:
   - `affiliate_code`: Código único para cada usuário
   - `referred_by`: ID do usuário que convidou (se aplicável)
   - `affiliate_bonuses`: Contador de bônus acumulados

2. **affiliate_invites**: Registra os convites enviados
   - `sender_id`: ID do usuário que enviou o convite
   - `email`: Email para o qual o convite foi enviado
   - `code`: Código único para este convite específico
   - `status`: Status do convite (pending, accepted, expired)
   - `accepted_at`: Data/hora em que o convite foi aceito
   - `subscription_created`: Indica se o convite gerou uma assinatura

3. **affiliate_bonuses**: Registra os bônus obtidos
   - `user_id`: ID do usuário que receberá o bônus
   - `referred_user_id`: ID do usuário convidado que gerou o bônus
   - `status`: Status do bônus (pending, applied, expired)
   - `bonus_months`: Quantidade de meses de bônus (padrão: 1)
   - `applied_at`: Data/hora em que o bônus foi aplicado

## Funções no Banco de Dados

O sistema utiliza as seguintes funções no banco de dados:

1. **generate_affiliate_code()**: Gera um código alfanumérico único para cada usuário
2. **process_affiliate_registration()**: Processa o registro de um usuário que foi convidado
3. **register_affiliate_bonus()**: Registra um bônus quando um usuário convidado assina
4. **apply_affiliate_bonus()**: Aplica um bônus pendente na renovação da assinatura

## Componentes Frontend

O sistema inclui os seguintes componentes:

1. **AffiliateSystem.js**: Componente principal que exibe:
   - Link de convite para compartilhar
   - Formulário para enviar convites por email
   - Estatísticas de convites enviados/aceitos
   - Lista de convites enviados
   - Lista de bônus pendentes/aplicados

2. **ToastContext.js**: Contexto para exibir notificações aos usuários

## APIs

O sistema utiliza as seguintes APIs:

1. **/api/send-invite.js**: Envia convites por email (simulado nesta implementação)
2. **/api/register-affiliate-bonus.js**: Registra um bônus quando um usuário convidado assina
3. **/api/apply-affiliate-bonus.js**: Aplica um bônus pendente na renovação da assinatura

## Fluxo do Usuário

1. **Envio de Convites**:
   - O usuário acessa a seção de afiliados no seu perfil
   - Pode copiar o link de convite para compartilhar ou enviar por email

2. **Registro do Convidado**:
   - O novo usuário clica no link de convite
   - O código de afiliado é automaticamente preenchido no formulário de registro
   - Ao se registrar, o sistema registra a relação de indicação

3. **Geração do Bônus**:
   - Quando o usuário convidado realiza uma assinatura
   - O sistema registra um bônus para o usuário que o convidou

4. **Aplicação do Bônus**:
   - Na renovação da assinatura, se o usuário tiver bônus pendentes
   - O sistema aplica o bônus, estendendo a assinatura por 1 mês

## Próximos Passos

Para melhorar ainda mais o sistema de afiliados, considere:

1. **Implementação Real de Emails**: Integrar com serviços como SendGrid ou Amazon SES
2. **Gamificação**: Adicionar níveis de afiliados com recompensas crescentes
3. **Dashboard de Afiliados**: Criar uma página dedicada com mais estatísticas
4. **Campanhas**: Permitir campanhas temporárias com códigos promocionais especiais
5. **Notificações Push**: Alertar usuários quando receberem novos bônus

## Considerações de Segurança

1. Todas as tabelas estão protegidas com Row Level Security (RLS)
2. As funções sensíveis usam SECURITY DEFINER para execução segura
3. Validações são feitas tanto no frontend quanto no backend
4. As APIs verificam autenticação adequadamente 