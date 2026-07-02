# Click Laudos — Pesquisas CSAT/NPS

Aplicação Next.js (App Router) + Supabase para geração de links de pesquisa,
tela de avaliação do cliente e dashboard gerencial de CSAT/NPS.

## 1. Criar o banco no Supabase

1. Crie uma conta/projeto em [supabase.com](https://supabase.com).
2. No seu projeto, vá em **SQL Editor** → **New query**.
3. Cole todo o conteúdo do arquivo `sql/schema.sql` e clique em **Run**.
   - Isso cria as tabelas `atendentes`, `survey_links`, `survey_responses`,
     os triggers, as políticas de acesso e habilita o Realtime.
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Rodar localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local e cole a URL e a anon key do passo 1
npm run dev
```

Acesse `http://localhost:3000`.

## 3. Publicar no Vercel

### Opção A — pelo site da Vercel (mais simples)
1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. A Vercel detecta automaticamente que é Next.js — não precisa mudar nada no build.
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a anon key do seu projeto Supabase
5. Clique em **Deploy**. Em ~1 minuto o link estará no ar.

### Opção B — pela CLI da Vercel
```bash
npm install -g vercel
vercel login
vercel            # primeiro deploy (ambiente de preview)
vercel --prod     # deploy de produção
```
Quando perguntado, informe as mesmas variáveis de ambiente do passo anterior
(ou rode `vercel env add NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## 4. Importante — sobre segurança nesta versão

Esta versão ainda **não tem tela de login** para a equipe interna (Suporte/Dashboard).
Por simplicidade, o Supabase está configurado para aceitar leitura e escrita da
chave pública (`anon`) em todas as tabelas — ou seja, qualquer pessoa com o link
do site consegue, tecnicamente, ver o dashboard e gerar links.

Para um uso interno real, o próximo passo recomendado é:
- Ativar o **Supabase Auth** (login por e-mail/senha ou Google) para a equipe.
- Restringir as políticas de RLS de `atendentes`, `survey_links` e leitura de
  `survey_responses` para a role `authenticated`.
- Deixar público (`anon`) **somente** o insert em `survey_responses`, que é o
  que o cliente final precisa para enviar a avaliação pelo link.

Posso implementar essa camada de autenticação quando você quiser — é só pedir.

## 5. Estrutura do projeto

```
app/
  layout.js          → layout raiz + import do CSS global
  page.js             → renderiza o componente principal
  globals.css         → diretivas do Tailwind
components/
  ClickLaudosApp.jsx  → aplicação inteira (Suporte, Cliente, Dashboard)
lib/
  supabaseClient.js   → inicializa o cliente do Supabase
  db.js               → funções de leitura/escrita (CRUD) no banco
sql/
  schema.sql          → script de criação do banco de dados
```
