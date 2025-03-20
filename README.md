# TreinoPro

Um aplicativo completo para gerenciamento de treinos de academia, permitindo que usuários criem listas de exercícios personalizadas, acompanhem suas sessões de treino e visualizem estatísticas detalhadas de desempenho.

## Funcionalidades

- Autenticação de usuários (login com email/senha e redes sociais)
- Criação de listas de treinos personalizadas
- Modo de treino interativo
- Controle de séries, repetições, carga e tempo
- Histórico detalhado de treinos
- Relatórios de desempenho com estatísticas
- Integração com vídeos do YouTube para demonstração de exercícios
- Interface responsiva para dispositivos móveis e desktop

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Autenticação, Armazenamento)
- **Hospedagem**: Vercel

## Configuração do Projeto

### Pré-requisitos

- Node.js (v14 ou superior)
- npm ou yarn
- Conta no Supabase

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/treinopro.git
   cd treinopro
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn install
   ```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env.local` na raiz do projeto e adicione as seguintes variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_do_supabase
   API_SECRET_KEY=chave_secreta_para_api
   ```

4. Configure o banco de dados:
   Execute os scripts SQL disponíveis na pasta `sql/` no painel do SQL do Supabase.
   Consulte o arquivo `README-SQL-SETUP.md` para obter instruções detalhadas.

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

6. Acesse o aplicativo em `http://localhost:3000`

## Implantação

Este projeto está configurado para ser implantado na Vercel. Conecte seu repositório GitHub à Vercel para implantação automática.

### Variáveis de Ambiente na Vercel

Certifique-se de configurar as mesmas variáveis de ambiente listadas na seção de instalação nas configurações do projeto na Vercel.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests com melhorias ou correções.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes. 