# Instruções para Configuração de Autenticação no Supabase

## 1. Corrigir "Auth OTP long expiry"

Este alerta indica que o tempo de expiração dos códigos OTP (One-Time Password) está configurado para mais de uma hora, o que não é recomendado por motivos de segurança.

### Passos para corrigir:

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **Authentication**
4. Vá para a guia **Providers**
5. Localize o provedor **Email** e clique em **Edit**
6. Na seção **OTP Login**, encontre o campo **OTP Expiry**
7. Altere o valor para um tempo menor que 60 minutos (recomendado: 30 minutos)
8. Clique em **Save**

![Configuração OTP](https://supabase.com/docs/img/auth-email-password-settings.png)

## 2. Ativar "Leaked Password Protection"

Este alerta indica que a proteção contra senhas vazadas está desativada. Esta funcionalidade verifica se a senha de um usuário foi comprometida em vazamentos de dados conhecidos.

### Passos para ativar:

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **Authentication**
4. Vá para a guia **Policies**
5. Na seção **Password Policies**, encontre a opção **Prevent Compromised Passwords**
6. Ative esta opção
7. Clique em **Save**

![Proteção contra senhas vazadas](https://supabase.com/docs/img/auth-password-strength.png)

## Verificação

Após fazer essas alterações, aguarde alguns minutos e verifique se os alertas foram removidos do painel do Supabase. Pode ser necessário atualizar a página (Ctrl+F5 ou Cmd+Shift+R) para ver as mudanças. 