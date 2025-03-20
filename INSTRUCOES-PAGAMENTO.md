# Instruções para Configuração do Sistema de Pagamento

Este documento descreve os passos necessários para configurar o sistema de pagamento usando o Stripe na aplicação AppTreino.

## 1. Configuração do Banco de Dados

Execute o script SQL para configurar as tabelas necessárias no banco de dados Supabase:

1. Acesse o painel do Supabase (https://app.supabase.com)
2. Navegue para a seção "SQL Editor"
3. Cole o conteúdo do arquivo `setup-payment-tables.sql` e execute
4. Verifique se as tabelas e colunas foram criadas corretamente

## 2. Configuração da Conta Stripe

### 2.1 Criar uma conta Stripe

Se ainda não tiver uma conta Stripe:
1. Acesse https://stripe.com/
2. Clique em "Começar agora" para criar uma conta
3. Siga as instruções para completar o registro

### 2.2 Obter as Chaves de API

1. No painel do Stripe, acesse "Desenvolvedores" > "Chaves de API"
2. Você verá duas chaves importantes:
   - **Chave publicável** (`pk_test_...`): segura para usar no navegador
   - **Chave secreta** (`sk_test_...`): deve ser mantida segura e usada apenas no servidor

### 2.3 Configurar Webhook

1. No painel do Stripe, acesse "Desenvolvedores" > "Webhooks"
2. Clique em "Adicionar endpoint"
3. URL do endpoint: `https://seu-dominio.com/api/webhook`
4. Eventos a escutar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
5. Após criar o webhook, copie o "Signing secret" (`whsec_...`)

## 3. Configuração do Ambiente

### 3.1 Instalar dependências

```bash
npm install stripe micro
```

### 3.2 Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` para adicionar as chaves do Stripe:

```
# Stripe configuration
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publicavel
```

Para ambiente de produção, use chaves de produção (iniciam com `pk_live_` e `sk_live_`).

### 3.3 Configurar Chave de Serviço do Supabase

No arquivo `.env.local`, adicione a chave de serviço do Supabase:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Esta chave é usada pelo webhook para atualizar os perfis dos usuários. Você pode encontrá-la no painel do Supabase em "Settings" > "API" > "Project API keys" > "service_role".

## 4. Teste do Sistema de Pagamento

### 4.1 Cartões de Teste

No ambiente de teste do Stripe, você pode usar estes cartões para simular pagamentos:

- **Pagamento bem-sucedido**: 4242 4242 4242 4242
- **Pagamento que requer autenticação**: 4000 0025 0000 3155
- **Pagamento recusado**: 4000 0000 0000 9995

Use qualquer data futura para expiração e qualquer CVC de 3 dígitos.

### 4.2 Teste Completo

1. Entre na aplicação com uma conta de usuário
2. Clique em "Upgrade para Premium" no dashboard
3. Complete o checkout usando um cartão de teste
4. Verifique se o webhook é acionado corretamente
5. Confirme que o perfil do usuário foi atualizado para "paid"

## 5. Monitoramento e Solução de Problemas

### 5.1 Logs do Webhook

Os eventos do webhook podem ser visualizados no painel do Stripe em:
- "Desenvolvedores" > "Webhooks" > [Seu Endpoint] > "Eventos recentes"

### 5.2 Verificar Assinaturas

As assinaturas ativas podem ser visualizadas em:
- "Assinaturas" no menu principal do Stripe

### 5.3 Solução de Problemas Comuns

- **Webhook não recebido**: Verifique se o URL está acessível e se o segredo de assinatura está correto
- **Atualização de perfil falha**: Verifique se a chave de serviço do Supabase está correta
- **Erro 400 no checkout**: Verifique o console do navegador para detalhes sobre o erro

---

Para mais detalhes, consulte a [documentação oficial do Stripe](https://stripe.com/docs). 