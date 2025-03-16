# Fluxo de Trabalho para Atualizações

Este documento descreve o processo para fazer alterações no código e sincronizá-las com o GitHub e a Vercel.

## Fluxo de Trabalho Diário

### 1. Antes de começar a trabalhar

Sincronize seu repositório local com o remoto:

```bash
git pull origin app-treino-v2
```

### 2. Desenvolvendo novas funcionalidades

Trabalhe no código normalmente. Quando terminar uma funcionalidade:

```bash
# Veja quais arquivos foram modificados
git status

# Adicione os arquivos modificados
git add .

# Faça um commit das alterações
git commit -m "Descrição detalhada da alteração"

# Envie para o GitHub
git push origin app-treino-v2
```

### 3. Aplicando alterações em produção

Quando estiver satisfeito com as alterações e quiser atualizar o site em produção:

1. Acesse o GitHub
2. Crie um Pull Request de `app-treino-v2` para `main`
3. Revise as alterações
4. Faça o merge do Pull Request

O Vercel detectará automaticamente as alterações no branch `main` e fará o deploy da nova versão.

## Comandos Git Úteis

### Verificar status
```bash
git status
```

### Ver histórico de commits
```bash
git log --oneline
```

### Descartar alterações locais em um arquivo
```bash
git checkout -- nome-do-arquivo
```

### Criar um novo branch para uma funcionalidade
```bash
git checkout -b nome-do-novo-branch
```

### Mudar de branch
```bash
git checkout nome-do-branch
```

### Juntar branches
```bash
git merge nome-do-branch
```

## Troubleshooting

### Se o push for rejeitado
```bash
# Puxe as alterações remotas primeiro
git pull origin app-treino-v2

# Resolva conflitos se necessário

# Tente o push novamente
git push origin app-treino-v2
```

### Conflitos de merge
Se você encontrar conflitos ao fazer merge:

1. Abra os arquivos com conflitos
2. Edite para resolver os conflitos (procure por marcações como `<<<<<<<`, `=======`, `>>>>>>>`)
3. Salve os arquivos
4. Adicione-os ao Git: `git add .`
5. Complete o merge: `git commit` 