# Configuração do Sistema de Afiliados

## Visão Geral

O sistema de afiliados foi implementado com sucesso no aplicativo. Este documento fornece instruções sobre como configurar e testar o sistema.

## Variáveis de Ambiente Necessárias

Para o correto funcionamento do sistema de afiliados, as seguintes variáveis de ambiente são necessárias:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://suaurl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-de-servico

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL do seu aplicativo

# Stripe (para pagamentos e para registrar bônus após assinatura)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_sua_chave_publica
NEXT_PUBLIC_STRIPE_PRICE_ID=price_seu_id_do_produto

# Webhook (para processamento de eventos do Stripe)
WEBHOOK_SECRET=seu_segredo_de_webhook
```

Crie um arquivo `.env` na raiz do projeto com estas variáveis configuradas.

## Estrutura do Sistema

O sistema de afiliados consiste em:

1. **Banco de Dados**: Tabelas e funções SQL já configuradas
2. **Backend**: APIs para envio de convites, registro e aplicação de bônus
3. **Frontend**: Componentes para exibição do sistema de afiliados e integração com pagamentos

## Componentes Implementados

- `components/AffiliateSystem.js`: Componente que exibe o sistema de afiliados no perfil do usuário
- `context/ToastContext.js`: Sistema de notificações para feedback ao usuário
- `pages/register.js`: Página de registro com suporte a código de afiliado
- `pages/api/send-invite.js`: API para envio de convites por email
- `pages/api/register-affiliate-bonus.js`: API para registrar bônus quando um usuário convidado assina
- `pages/api/apply-affiliate-bonus.js`: API para aplicar bônus pendentes na renovação
- `components/PaymentButton.js`: Integração com o sistema de pagamento para registrar bônus

## Como Testar

1. **Convites**: Acesse a página de perfil e use o componente de afiliados para enviar convites
2. **Registro com Código**: Use o link de convite para registrar um novo usuário
3. **Pagamento e Bônus**: Faça uma assinatura com o usuário convidado para gerar um bônus
4. **Aplicação de Bônus**: Verifique a aplicação do bônus na próxima renovação

## Configuração de Email (Pendente)

Atualmente, o envio de emails está apenas simulado. Para implementar o envio real:

1. Escolha um provedor de email (SendGrid, Amazon SES, etc.)
2. Instale a biblioteca correspondente (ex: `npm install @sendgrid/mail`)
3. Descomente e configure o código de envio de email em `pages/api/send-invite.js`
4. Adicione as variáveis de ambiente do provedor de email escolhido

## Próximos Passos

- Implementar envio real de emails
- Criar dashboard de afiliados
- Adicionar gamificação ao sistema
- Implementar campanhas temporárias com códigos promocionais especiais 